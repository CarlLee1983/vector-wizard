import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agile Roadmap Wizard",
  description: "Convert agile roadmap decisions into agent-ready YAML specs."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
