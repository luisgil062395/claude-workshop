/**
 * Composer del hilo: pastilla con el boton de marca, el campo de texto y el
 * microfono. Es el unico control junto al orbe de voz donde aparece el
 * gradiente de marca.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Microphone } from "@phosphor-icons/react";
import { BrandMark } from "./primitives";
import { useStore } from "../state/store";

export function Composer() {
  const { sendText, openVoice, startListening, busy } = useStore();
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    void sendText(value);
  }

  return (
    <div className="composer-bar">
      <form className="composer" onSubmit={submit}>
        <button
          type="button"
          className="composer__brand"
          aria-label="Abrir captura por voz o foto"
          onClick={openVoice}
        >
          <BrandMark size={20} white />
        </button>

        <label className="sr-only" htmlFor="composer-input">
          Escribe o dicta un gasto
        </label>
        <input
          id="composer-input"
          className="composer__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe o dicta un gasto..."
          autoComplete="off"
          enterKeyHint="send"
          disabled={busy}
        />

        {text.trim() ? (
          <button type="submit" className="composer__send" disabled={busy}>Enviar</button>
        ) : (
          <button
            type="button"
            className="composer__mic"
            aria-label="Dictar un gasto"
            onClick={() => { openVoice(); startListening(); }}
          >
            <Microphone size={20} weight="regular" />
          </button>
        )}
      </form>
    </div>
  );
}
