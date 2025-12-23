
import { AppProvider } from "@/components/Providers";
import LayoutWrapper from "@/components/LayoutWrapper";
// Fix: Added React import to satisfy TypeScript namespace requirements for React.ReactNode
import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dinner? | Inteligência Culinária",
  description: "Seu Chef Executivo e Auditor de Segurança Alimentar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AppProvider>
      </body>
    </html>
  );
}
