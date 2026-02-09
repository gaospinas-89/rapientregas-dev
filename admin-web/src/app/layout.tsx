import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rapi Entregas Admin",
  description: "Panel administrativo de Rapi Entregas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
