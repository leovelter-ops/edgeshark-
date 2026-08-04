"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, PictureInPicture2, Maximize2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getTheme, THEME_EVENT, Theme } from "@/lib/theme";

// Document Picture-in-Picture: a real always-on-top OS window (Chrome/Edge 116+)
// that floats over other apps (e.g. TradingView) — not confined to the browser.
type DocumentPiP = {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
};
function getDocPiP(): DocumentPiP | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { documentPictureInPicture?: DocumentPiP })
    .documentPictureInPicture ?? null;
}

// Clone the app's stylesheets into the PiP document so it renders styled.
function copyStyles(target: Window) {
  document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    const link = target.document.createElement("link");
    link.rel = "stylesheet";
    link.href = (l as HTMLLinkElement).href;
    target.document.head.appendChild(link);
  });
  document.querySelectorAll("style").forEach((s) => {
    target.document.head.appendChild(s.cloneNode(true));
  });
  try {
    target.document.adoptedStyleSheets = [...document.adoptedStyleSheets];
  } catch {
    /* constructed sheets aren't cross-document adoptable — the clones cover it */
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pip, setPip] = useState<Window | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Keep the floating window's dark-mode class in sync with the app.
  useEffect(() => {
    if (!pip) return;
    const apply = (t: Theme) =>
      pip.document.documentElement.classList.toggle("dark", t === "dark");
    apply(getTheme());
    const onTheme = (e: Event) => apply((e as CustomEvent<Theme>).detail);
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, [pip]);

  const openBubble = async () => {
    const dpip = getDocPiP();
    if (!dpip) {
      setUnsupported(true);
      return;
    }
    try {
      const w = await dpip.requestWindow({ width: 460, height: 760 });
      copyStyles(w);
      w.document.body.style.margin = "0";
      w.document.title = "VEX";
      w.addEventListener("pagehide", () => setPip(null), { once: true });
      setPip(w);
    } catch {
      setUnsupported(true);
    }
  };

  // The whole app. Rendered in place, or portaled into the floating window.
  const app = (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar onMinimize={openBubble} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar mobile onNavigate={() => setDrawerOpen(false)} />
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.jpg" alt="VEX" className="h-7 w-7 rounded-lg object-contain" />
          <span className="text-lg font-bold text-gray-900">VEX</span>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );

  // While popped out, render the app into the floating window and show a
  // restore panel in the main tab.
  if (pip) {
    return (
      <>
        {createPortal(app, pip.document.body)}
        <PoppedOutScreen onReopen={() => pip.close()} />
      </>
    );
  }

  return (
    <>
      {app}
      {unsupported && <UnsupportedDialog onClose={() => setUnsupported(false)} />}
    </>
  );
}

function PoppedOutScreen({ onReopen }: { onReopen: () => void }) {
  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center"
      style={{ background: "var(--background)" }}
    >
      <PictureInPicture2 size={40} className="text-brand" />
      <div>
        <p className="text-lg font-semibold text-gray-800">VEX is floating on top</p>
        <p className="mt-1 text-sm text-gray-400">
          Drag the floating window anywhere — it stays above TradingView while you trade.
        </p>
      </div>
      <button
        onClick={onReopen}
        className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105"
      >
        <Maximize2 size={16} /> Bring back to this tab
      </button>
    </div>
  );
}

function UnsupportedDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <PictureInPicture2 size={32} className="mx-auto text-gray-300" />
        <h3 className="mt-3 text-lg font-bold text-gray-900">Floating window unavailable</h3>
        <p className="mt-1 text-sm text-gray-500">
          The always-on-top floating window uses the Document Picture-in-Picture
          API, available in the latest desktop Chrome or Edge. Open VEX there to
          float it over TradingView.
        </p>
        <button
          onClick={onClose}
          className="mt-4 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:brightness-105"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
