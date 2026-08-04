"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, PictureInPicture2, Maximize2, Minus } from "lucide-react";
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

const BUBBLE = { width: 132, height: 132 };
const WINDOW = { width: 480, height: 780 };

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
  const [mode, setMode] = useState<"bubble" | "app">("bubble");
  const [unsupported, setUnsupported] = useState(false);

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

  const resize = (w: number, h: number) => {
    try {
      pip?.resizeTo(w, h);
    } catch {
      /* some builds block programmatic resize — the user can drag-resize */
    }
  };

  const openBubble = async () => {
    const dpip = getDocPiP();
    if (!dpip) {
      setUnsupported(true);
      return;
    }
    try {
      const w = await dpip.requestWindow(BUBBLE);
      copyStyles(w);
      w.document.body.style.margin = "0";
      w.document.body.style.overflow = "hidden";
      w.document.title = "VEX";
      w.addEventListener("pagehide", () => setPip(null), { once: true });
      setMode("bubble");
      setPip(w);
    } catch {
      setUnsupported(true);
    }
  };

  const expand = () => {
    setMode("app");
    resize(WINDOW.width, WINDOW.height);
  };
  const collapse = () => {
    setMode("bubble");
    resize(BUBBLE.width, BUBBLE.height);
  };

  // The whole app. Rendered in place, or portaled into the floating window.
  const app = (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar onMinimize={openBubble} />
      </div>

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

  if (pip) {
    return (
      <>
        {createPortal(
          mode === "bubble" ? (
            <BubbleView onExpand={expand} />
          ) : (
            <div className="relative h-screen w-full">
              {app}
              <button
                onClick={collapse}
                title="Shrink to bubble"
                className="fixed right-3 top-3 z-[80] flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-lg hover:bg-black"
              >
                <Minus size={16} />
              </button>
            </div>
          ),
          pip.document.body,
        )}
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

// The small always-on-top bubble. Click to expand into the full window.
function BubbleView({ onExpand }: { onExpand: () => void }) {
  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{ background: "transparent" }}
    >
      <button
        onClick={onExpand}
        title="Click to open VEX · drag the window to move"
        className="flex h-24 w-24 items-center justify-center rounded-full bg-black shadow-2xl ring-2 ring-white/30 transition active:scale-95"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.jpg"
          alt="Open VEX"
          draggable={false}
          className="h-14 w-14 rounded-full object-contain"
        />
      </button>
    </div>
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
          Drag the bubble anywhere — it stays above TradingView. Click it to open the app.
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
          The always-on-top floating bubble uses the Document Picture-in-Picture
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
