/**
 * Primitivas del design system: marca, botones, chips y avisos.
 * Todo el color sale de tokens; ningun hex crudo vive en un componente.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Chat, Plus } from "@phosphor-icons/react";
import markUrl from "../assets/mark.png";
import markWhiteUrl from "../assets/mark-white.png";
import wordmarkUrl from "../assets/wordmark.png";

/* ------------------------------------------------------------------ marca */

/** La marca ✚ en gradiente. Asset oficial, nunca redibujado. */
export function BrandMark({ size = 24, white = false }: { size?: number; white?: boolean }) {
  return (
    <img
      src={white ? markWhiteUrl : markUrl}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="brand-mark"
      style={{ width: size, height: size }}
    />
  );
}

/** Wordmark oficial. Lleva texto alternativo porque identifica el producto. */
export function Wordmark({ width = 56 }: { width?: number }) {
  return (
    <img
      src={wordmarkUrl}
      alt="Suma"
      width={width}
      height={Math.round((width * 383) / 1261)}
      className="wordmark"
      style={{ width }}
    />
  );
}

/* ---------------------------------------------------------------- botones */

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  children: ReactNode;
};

/** Area tactil 44×44 aunque el glifo mida 24. */
export function IconButton({ label, active = false, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn${active ? " is-active" : ""}`}
      aria-label={label}
      aria-pressed={rest.onClick && active !== undefined ? active : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Icono compuesto "nueva conversación": burbuja de Phosphor con un signo +. */
export function NewChatIcon({ size = 22 }: { size?: number }) {
  return (
    <span className="stacked-icon" style={{ width: size, height: size }}>
      <Chat size={size} weight="regular" />
      <Plus size={size * 0.42} weight="bold" className="stacked-icon__plus" />
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "pill";
  full?: boolean;
  children: ReactNode;
};

/** Una sola accion primaria visible por pantalla; el resto son ghost o pill. */
export function Button({ variant = "primary", full = false, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={`btn btn--${variant}${full ? " btn--full" : ""}`} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ chips */

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}

/** Etiqueta de seccion: 13/17, semibold, +2% tracking, mayusculas. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="section-label">{children}</h2>;
}

/* ------------------------------------------------------------------ avisos */

/**
 * Aviso de datos de demostracion. Existe para que nunca se confunda una
 * simulacion con informacion real de la persona.
 */
export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="demo-notice" role="note">
      <span className="demo-notice__dot" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Divider() {
  return <hr className="divider" />;
}
