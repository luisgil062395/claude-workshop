/**
 * Dictado por voz.
 *
 * Usa la Web Speech API del navegador cuando existe — es una API de plataforma,
 * no un servicio externo. Donde no existe (Firefox, algunos WebView) se degrada
 * a una transcripcion de DEMOSTRACION y la UI lo declara en pantalla, para que
 * nadie confunda una simulacion con lo que dijo.
 */

type Listener = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (reason: "no-speech" | "denied" | "unsupported" | "aborted") => void;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function ctor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && ctor() !== null;
}

/** Frases de demostracion cuando el navegador no dicta. Rotan de forma estable. */
const DEMO_PHRASES = [
  "Café en Starbucks, 85 pesos",
  "Ayer gasté 250 pesos en Soriana en el súper",
  "Pagué 180 pesos de Uber esta mañana",
  "Comí en Contramar, 640 pesos",
];
let demoIndex = 0;

export function demoPhrase(): string {
  return DEMO_PHRASES[demoIndex % DEMO_PHRASES.length];
}

export type SpeechSession = { stop: () => void; cancel: () => void; simulated: boolean };

export function listen(l: Listener): SpeechSession {
  const Ctor = ctor();

  if (!Ctor) {
    // Simulacion: se "escribe" la frase para que la espera se sienta productiva.
    const phrase = DEMO_PHRASES[demoIndex++ % DEMO_PHRASES.length];
    let i = 0;
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      i += 2;
      if (i >= phrase.length) {
        clearInterval(timer);
        l.onPartial(phrase);
        setTimeout(() => { if (!cancelled) l.onFinal(phrase); }, 260);
      } else {
        l.onPartial(phrase.slice(0, i));
      }
    }, 45);
    return {
      simulated: true,
      stop: () => { clearInterval(timer); if (!cancelled) l.onFinal(phrase); },
      cancel: () => { cancelled = true; clearInterval(timer); l.onError("aborted"); },
    };
  }

  const rec = new Ctor();
  rec.lang = "es-MX";
  rec.continuous = false;
  rec.interimResults = true;
  let final = "";
  let done = false;

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alt = e.results[i][0];
      if (e.results[i].isFinal) final += alt.transcript;
      else interim += alt.transcript;
    }
    l.onPartial((final + interim).trim());
  };
  rec.onerror = (e) => {
    done = true;
    l.onError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied"
      : e.error === "aborted" ? "aborted" : "no-speech");
  };
  rec.onend = () => {
    if (done) return;
    done = true;
    const text = final.trim();
    if (text) l.onFinal(text); else l.onError("no-speech");
  };

  try { rec.start(); } catch { l.onError("unsupported"); }

  return {
    simulated: false,
    stop: () => { try { rec.stop(); } catch { /* ya detenido */ } },
    cancel: () => { done = true; try { rec.abort(); } catch { /* ya detenido */ } l.onError("aborted"); },
  };
}
