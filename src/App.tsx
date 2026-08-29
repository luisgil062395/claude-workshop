/**
 * Shell de la aplicacion.
 *
 * Navegacion de dos niveles como maximo y sin tab bar: la conversacion es la
 * app, insights vive detras del header y la captura por voz es una superficie
 * que se abre encima. Volver siempre devuelve al hilo.
 */

import { AppHeader } from "./components/AppHeader";
import { ReviewSheet } from "./components/ReviewSheet";
import { Toast } from "./components/Toast";
import { Onboarding } from "./views/Onboarding";
import { Thread } from "./views/Thread";
import { Insights } from "./views/Insights";
import { VoiceCapture } from "./views/VoiceCapture";
import { Settings } from "./views/Settings";
import { StoreProvider, useStore } from "./state/store";
import "./styles/app.css";

function Shell() {
  const { screen, voiceOpen } = useStore();

  if (screen === "onboarding") {
    return (
      <main className="app app--plain">
        <Onboarding />
      </main>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <div className="app">
        <AppHeader />
        <main id="main" className="app__main">
          {screen === "insights" ? <Insights /> : <Thread />}
        </main>
        {voiceOpen && <VoiceCapture />}
      </div>
      <ReviewSheet />
      <Settings />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
