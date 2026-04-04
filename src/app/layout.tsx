import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poddesk OS",
  description: "Deterministic execution engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
