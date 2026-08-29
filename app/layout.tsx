import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "SUMA",
  description:
    "Lleva el control de tus gastos hablando, escribiendo o con una foto.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Nav />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
