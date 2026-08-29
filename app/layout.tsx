import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "SUMA",
  description:
    "Lleva el control de tus gastos hablando, escribiendo o con una foto.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
