/**
 * Onboarding: tres pantallas, breve y omitible (CLAUDE.md §19).
 * Los permisos NO se piden aqui — se piden en el momento en que se usan.
 */

import { useState } from "react";
import { BrandMark, Button } from "../components/primitives";
import { useStore } from "../state/store";

const SLIDES = [
  {
    title: "Como hablar con alguien que entiende tus finanzas.",
    body: "Dime un gasto en voz alta y yo me encargo del resto. Sin formularios, sin categorías manuales.",
  },
  {
    title: "Solo dile a Suma en qué gastaste.",
    body: "«Ayer gasté 250 pesos en Soriana en el súper.» Suma entiende el monto, el lugar, la categoría y la fecha.",
  },
  {
    title: "Ve el panorama completo.",
    body: "Tus registros se convierten en métricas, tendencias e insights que puedes preguntar en cualquier momento.",
  },
];

export function Onboarding() {
  const { finishOnboarding } = useStore();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  return (
    <div className="onboarding">
      <div className="onboarding__top">
        <button type="button" className="onboarding__skip" onClick={finishOnboarding}>
          Omitir
        </button>
      </div>

      <div className="onboarding__body">
        <BrandMark size={104} />
        <h1 className="onboarding__title">{SLIDES[i].title}</h1>
        <p className="onboarding__text">{SLIDES[i].body}</p>
      </div>

      <div className="onboarding__foot">
        <Button variant="primary" full onClick={() => (last ? finishOnboarding() : setI(i + 1))}>
          {last ? "Empezar" : "Continuar"}
        </Button>
        <ol className="dots" aria-label={`Paso ${i + 1} de ${SLIDES.length}`}>
          {SLIDES.map((s, n) => (
            <li key={s.title} className={n === i ? "is-active" : undefined}>
              <span className="sr-only">{`Paso ${n + 1}`}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
