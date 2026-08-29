"use client";

import { useState, type FormEvent } from "react";
import { ExpenseReviewCard } from "@/components/ExpenseReviewCard";
import { extractExpenseAction, saveExpenseAction } from "@/app/agregar/actions";
import type { ExpenseCandidate } from "@/lib/expenses";

type Status = "idle" | "extracting" | "review" | "saving" | "saved" | "error";

export function ExpenseCapture() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [candidate, setCandidate] = useState<ExpenseCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleExtract(event: FormEvent) {
    event.preventDefault();
    setStatus("extracting");
    setErrorMessage("");
    const referenceDateISO = new Date().toISOString();
    const result = await extractExpenseAction(input, referenceDateISO);
    if (result.ok) {
      setCandidate(result.candidate);
      setStatus("review");
    } else {
      setErrorMessage(result.error);
      setStatus("error");
    }
  }

  async function handleConfirm(edited: Omit<ExpenseCandidate, "uncertainFields">) {
    setStatus("saving");
    const result = await saveExpenseAction(edited);
    if (result.ok) {
      setStatus("saved");
      setInput("");
      setCandidate(null);
    } else {
      setErrorMessage(result.error);
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="capture-heading">
      <h1 id="capture-heading">Agregar gasto</h1>

      {status !== "review" && (
        <form onSubmit={handleExtract}>
          <label htmlFor="expense-input">Cuéntame en qué gastaste</label>
          <textarea
            id="expense-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej. Ayer gasté 180 pesos en Costco en el súper"
            required
            rows={3}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={status === "extracting" || input.trim() === ""}
          >
            {status === "extracting" ? "Entendiendo..." : "Continuar"}
          </button>
        </form>
      )}

      <div role="status" aria-live="polite">
        {status === "saving" && "Guardando..."}
        {status === "saved" && "Gasto guardado."}
        {status === "error" && errorMessage}
      </div>

      {status === "review" && candidate && (
        <ExpenseReviewCard
          candidate={candidate}
          submitLabel="Guardar"
          onConfirm={handleConfirm}
          onCancel={() => {
            setStatus("idle");
            setCandidate(null);
          }}
        />
      )}
    </section>
  );
}
