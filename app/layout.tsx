import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SUMA",
  description:
    "Lleva el control de tus gastos hablando, escribiendo o con una foto.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <Nav />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
