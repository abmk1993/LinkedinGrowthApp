import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Agent — Turn your professional knowledge into visibility",
  description:
    "Review your LinkedIn profile, then keep it growing with research-backed posts written in your own voice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink-900 font-body antialiased">{children}</body>
    </html>
  );
}
