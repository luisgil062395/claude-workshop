/**
 * Header de 56px. Izquierda historial/insights, centro contexto, derecha nueva
 * conversacion — tal como define el design system (§16). No hay tab bar.
 */

import { ChartLine } from "@phosphor-icons/react";
import { IconButton, NewChatIcon, Wordmark } from "./primitives";
import { useStore } from "../state/store";

export function AppHeader() {
  const { screen, go, newConversation } = useStore();
  const onInsights = screen === "insights";

  return (
    <header className="app-header">
      <IconButton
        label={onInsights ? "Volver a la conversación" : "Ver insights"}
        active={onInsights}
        aria-pressed={onInsights}
        onClick={() => go(onInsights ? "thread" : "insights")}
      >
        <ChartLine size={22} weight="regular" />
      </IconButton>

      <span className="app-header__title">
        <Wordmark width={56} />
      </span>

      <IconButton label="Nueva conversación" onClick={newConversation}>
        <NewChatIcon size={22} />
      </IconButton>
    </header>
  );
}
