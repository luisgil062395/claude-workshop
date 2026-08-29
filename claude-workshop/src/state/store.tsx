/**
 * Estado de la aplicacion.
 *
 * Una sola fuente de verdad para los gastos, las conversaciones y el perfil.
 * El pipeline es siempre el mismo, entre por donde entre la informacion:
 *
 *   entrada → extraccion → validacion → revision → guardado → insight
 *
 * Nada se persiste sin pasar por `validate`/`toExpense`, y la revision nunca
 * se salta: la persona ve lo que Suma entendio antes de que exista el registro.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { ReactNode } from "react";
import type {
  AppData, ChatMessage, Conversation, ExpenseDraft, VoiceState,
} from "../lib/types";
import { aiProvider, isSimulated, toExpense } from "../services/ai";
import type { AiContext } from "../services/ai";
import * as storage from "../lib/storage";
import { id } from "../lib/id";
import { categoryInsight } from "../lib/insights";
import type { Period } from "../lib/metrics";
import { listen, speechSupported } from "../services/speech";
import type { SpeechSession } from "../services/speech";

export type Screen = "onboarding" | "thread" | "insights";

export type Toast = { id: string; text: string; actionLabel?: string; action?: () => void };

export type ReviewState = {
  draft: ExpenseDraft;
  edited: boolean;
  /** Aviso del proveedor: p. ej. que la lectura del recibo es de demostracion. */
  notice?: string;
};

type Ctx = {
  data: AppData;
  screen: Screen;
  period: Period;
  conversation: Conversation;
  busy: boolean;
  simulated: boolean;

  voiceOpen: boolean;
  voiceState: VoiceState;
  transcript: string;
  voiceSimulated: boolean;

  review: ReviewState | null;
  toast: Toast | null;
  settingsOpen: boolean;

  go: (s: Screen) => void;
  setPeriod: (p: Period) => void;

  sendText: (text: string) => Promise<void>;
  openVoice: () => void;
  closeVoice: () => void;
  startListening: () => void;
  stopListening: () => void;
  receipt: (file: File) => Promise<void>;

  updateDraft: (patch: Partial<ExpenseDraft>) => void;
  saveDraft: () => void;
  cancelDraft: () => void;

  deleteExpense: (id: string) => void;
  newConversation: () => void;
  finishOnboarding: () => void;
  setSettingsOpen: (open: boolean) => void;
  resetData: (mode: "demo" | "empty") => void;
  dismissToast: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

function newConversationObject(now: Date): Conversation {
  return {
    id: id("conv"),
    title: "Nueva conversación",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    messages: [],
  };
}

function msg(role: ChatMessage["role"], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id: id("msg"), role, text, createdAt: new Date().toISOString(), ...extra };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => storage.load());
  const [screen, setScreen] = useState<Screen>(() =>
    storage.load().onboardingComplete ? "thread" : "onboarding");
  const [period, setPeriod] = useState<Period>("year");
  const [conversation, setConversation] = useState<Conversation>(() => newConversationObject(new Date()));
  const [busy, setBusy] = useState(false);

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceSimulated, setVoiceSimulated] = useState(!speechSupported());

  const [review, setReview] = useState<ReviewState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const session = useRef<SpeechSession | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => { storage.save(data); }, [data]);

  useEffect(() => () => {
    session.current?.cancel();
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const ctx = useCallback((): AiContext => ({
    expenses: data.expenses,
    profile: data.profile,
    goals: data.goals,
    now: new Date(),
  }), [data]);

  const showToast = useCallback((t: Omit<Toast, "id">) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const next = { ...t, id: id("toast") };
    setToast(next);
    // 5 s, como manda el design system, y sin bloquear la escritura.
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const pushMessages = useCallback((...items: ChatMessage[]) => {
    setConversation((c) => ({
      ...c,
      title: c.messages.length === 0 && items[0] ? items[0].text.slice(0, 48) : c.title,
      updatedAt: new Date().toISOString(),
      messages: [...c.messages, ...items],
    }));
  }, []);

  /* ----------------------------------------------------- entrada de texto */

  const sendText = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const ai = aiProvider();
    pushMessages(msg("user", clean));
    setBusy(true);
    try {
      if (ai.classify(clean) === "expense") {
        const draft = await ai.extract({ method: "text", text: clean }, ctx());
        setReview({ draft, edited: false, notice: draft.question });
      } else {
        const answer = await ai.answer(clean, ctx());
        pushMessages(msg("suma", answer.text, {
          attachments: answer.attachments,
          computed: answer.computed,
        }));
      }
    } catch {
      pushMessages(msg("suma", "No pude procesar eso.", {
        attachments: [{ kind: "error", message: "Algo falló al interpretar tu mensaje.", retryLabel: "Reintentar" }],
      }));
    } finally {
      setBusy(false);
    }
  }, [busy, ctx, pushMessages]);

  /* -------------------------------------------------------------- recibo */

  const receipt = useCallback(async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(file);
      });
      const draft = await aiProvider().extract(
        { method: "receipt", fileName: file.name, dataUrl }, ctx(),
      );
      setVoiceOpen(false);
      setReview({ draft, edited: false, notice: draft.question });
    } catch {
      showToast({ text: "No pude abrir esa imagen. Intenta con otra." });
    } finally {
      setBusy(false);
    }
  }, [ctx, showToast]);

  /* ----------------------------------------------------------------- voz */

  const interpret = useCallback(async (text: string) => {
    setVoiceState("interpreting");
    try {
      const draft = await aiProvider().extract({ method: "voice", transcript: text }, ctx());
      setVoiceOpen(false);
      setVoiceState("idle");
      setTranscript("");
      pushMessages(msg("user", text));
      setReview({ draft, edited: false, notice: draft.question });
    } catch {
      setVoiceState("error");
    }
  }, [ctx, pushMessages]);

  const startListening = useCallback(() => {
    if (voiceState === "listening" || voiceState === "recording") return;
    setTranscript("");
    setVoiceState("listening");
    session.current = listen({
      onPartial: (t) => { setVoiceState("transcribing"); setTranscript(t); },
      onFinal: (t) => { session.current = null; void interpret(t); },
      onError: (reason) => {
        session.current = null;
        setVoiceState(reason === "aborted" ? "cancelled" : "error");
        if (reason === "aborted") setTimeout(() => setVoiceState("idle"), 200);
      },
    });
    setVoiceSimulated(session.current.simulated);
  }, [interpret, voiceState]);

  const stopListening = useCallback(() => {
    session.current?.stop();
    session.current = null;
  }, []);

  const openVoice = useCallback(() => {
    setVoiceState("idle");
    setTranscript("");
    setVoiceOpen(true);
  }, []);

  const closeVoice = useCallback(() => {
    session.current?.cancel();
    session.current = null;
    setVoiceOpen(false);
    setVoiceState("idle");
    setTranscript("");
  }, []);

  /* ------------------------------------------------------ revisar y guardar */

  const updateDraft = useCallback((patch: Partial<ExpenseDraft>) => {
    setReview((r) => {
      if (!r) return r;
      const draft = { ...r.draft, ...patch };
      // Corregir un campo lo saca de la lista de inciertos.
      const touched = Object.keys(patch);
      draft.uncertainFields = r.draft.uncertainFields.filter((f) => !touched.includes(f));
      return { ...r, draft, edited: true };
    });
  }, []);

  const cancelDraft = useCallback(() => setReview(null), []);

  const saveDraft = useCallback(() => {
    if (!review) return;
    const result = toExpense(review.draft, { editedByUser: review.edited });
    if (!result.ok) return;                    // la UI ya bloquea el boton
    const expense = result.expense;

    setData((d) => {
      const next = { ...d, expenses: [...d.expenses, expense] };
      const insight = categoryInsight(next.expenses, expense);
      const label = expense.category === "income" ? "Registré tu ingreso." : "Listo, lo registré.";
      queueMicrotask(() => {
        pushMessages(msg("suma", insight ? `${label} ${insight}` : label, {
          attachments: [{ kind: "expense", expenseId: expense.id }],
          computed: true,
        }));
      });
      return next;
    });

    setReview(null);
    showToast({
      text: "Guardado",
      actionLabel: "Deshacer",
      action: () => {
        setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== expense.id) }));
        setConversation((c) => ({
          ...c,
          messages: c.messages.filter(
            (m) => !m.attachments?.some((a) => a.kind === "expense" && a.expenseId === expense.id),
          ),
        }));
        setToast(null);
      },
    });
  }, [review, pushMessages, showToast]);

  /* --------------------------------------------------------------- varios */

  const deleteExpense = useCallback((expenseId: string) => {
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== expenseId) }));
    showToast({ text: "Gasto eliminado" });
  }, [showToast]);

  const newConversation = useCallback(() => {
    setConversation((c) => {
      if (c.messages.length === 0) return c;
      setData((d) => ({ ...d, conversations: [c, ...d.conversations].slice(0, 20) }));
      return newConversationObject(new Date());
    });
    setScreen("thread");
  }, []);

  const finishOnboarding = useCallback(() => {
    setData((d) => ({ ...d, onboardingComplete: true }));
    setScreen("thread");
  }, []);

  const resetData = useCallback((mode: "demo" | "empty") => {
    const next = storage.reset(mode);
    setData(next);
    setConversation(newConversationObject(new Date()));
    setSettingsOpen(false);
    showToast({ text: mode === "demo" ? "Datos de demostración restaurados" : "Datos borrados" });
  }, [showToast]);

  const value = useMemo<Ctx>(() => ({
    data, screen, period, conversation, busy, simulated: isSimulated(),
    voiceOpen, voiceState, transcript, voiceSimulated,
    review, toast, settingsOpen,
    go: setScreen,
    setPeriod,
    sendText, openVoice, closeVoice, startListening, stopListening, receipt,
    updateDraft, saveDraft, cancelDraft,
    deleteExpense, newConversation, finishOnboarding, setSettingsOpen, resetData,
    dismissToast: () => setToast(null),
  }), [
    data, screen, period, conversation, busy, voiceOpen, voiceState, transcript,
    voiceSimulated, review, toast, settingsOpen, sendText, openVoice, closeVoice,
    startListening, stopListening, receipt, updateDraft, saveDraft, cancelDraft,
    deleteExpense, newConversation, finishOnboarding, resetData,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return v;
}

