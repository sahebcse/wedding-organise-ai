import "./globals.css";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";
import AuthButtons from "@/components/AuthButtons";

export const metadata = {
  title: { default: "Wedding Organize AI 🪔", template: "%s • Wedding Organize AI" },
  description: "One OS for Indian weddings — RSVP, pickups, gifts, Kanban, photos",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="mandala-bg min-h-screen">
        <Providers>
        <header className="sticky top-0 z-40 border-b border-gold/30 bg-ivory/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="font-display text-xl font-bold text-maroon">🪔 Wedding Organize AI</a>
            <nav className="flex items-center gap-1">
              <AuthButtons />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">{children}</main>
        <footer className="border-t border-gold/30 py-6 text-center text-xs text-stone-500">Made for Indian weddings • Sarvam • Flagsmith • NudgeBee • runs offline</footer>
        </Providers>
      </body>
    </html>
  );
}
