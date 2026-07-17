import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "De Olho nas Obras — Observatório Cidadão de Blumenau", template: "%s | De Olho nas Obras" },
  description: "Mapa e painel cidadão para acompanhar obras públicas de Blumenau por prazo, custo, execução, bairro e ciclos de quatro anos.",
  openGraph: {
    title: "De Olho nas Obras — Blumenau",
    description: "Mapa, contratos, custos, prazos e ciclos de quatro anos para fiscalização cidadã.",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og.png", width: 1728, height: 912, alt: "De Olho nas Obras — Blumenau sob fiscalização cidadã" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "De Olho nas Obras — Blumenau",
    description: "Observatório cidadão das obras públicas de Blumenau.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQ3ynHTa6lyTAIEdAipJX11jSOqBOw=" crossOrigin="" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossOrigin="" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
