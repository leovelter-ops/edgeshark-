"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const BUBBLE_POS_KEY = "edgeflo_bubble_pos";
const BUBBLE_SIZE = 64;

// App chrome: static sidebar on desktop, an off-canvas drawer + top bar on
// mobile, and a desktop-only "minimize into a floating bubble" mode.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <>
      {/* App — kept mounted (just hidden) while minimized so state persists. */}
      <div className={minimized ? "hidden" : "flex h-screen w-full overflow-hidden"}>
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar onMinimize={() => setMinimized(true)} />
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
          {/* Mobile top bar */}
          <header className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3 md:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            >
              <Menu size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.jpg"
              alt="VEX"
              className="h-7 w-7 rounded-lg object-contain"
            />
            <span className="text-lg font-bold text-gray-900">VEX</span>
          </header>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>

      {minimized && <BubbleScreen onRestore={() => setMinimized(false)} />}
    </>
  );
}

// Full-screen backdrop with a single draggable bubble. Click (no drag) restores.
function BubbleScreen({ onRestore }: { onRestore: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0 });

  // Initial position: saved, else bottom-right.
  useEffect(() => {
    let init = {
      x: window.innerWidth - BUBBLE_SIZE - 28,
      y: window.innerHeight - BUBBLE_SIZE - 28,
    };
    try {
      const raw = localStorage.getItem(BUBBLE_POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.x === "number" && typeof p.y === "number") init = p;
      }
    } catch {
      /* ignore */
    }
    // Clamp into view.
    init.x = Math.max(8, Math.min(init.x, window.innerWidth - BUBBLE_SIZE - 8));
    init.y = Math.max(8, Math.min(init.y, window.innerHeight - BUBBLE_SIZE - 8));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos(init);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - start.current.px;
      const dy = e.clientY - start.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
      const x = Math.max(8, Math.min(start.current.x + dx, window.innerWidth - BUBBLE_SIZE - 8));
      const y = Math.max(8, Math.min(start.current.y + dy, window.innerHeight - BUBBLE_SIZE - 8));
      setPos({ x, y });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(BUBBLE_POS_KEY, JSON.stringify(p));
          } catch {
            /* ignore */
          }
        }
        return p;
      });
      if (!moved.current) onRestore();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onRestore]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    start.current = { px: e.clientX, py: e.clientY, x: pos?.x ?? 0, y: pos?.y ?? 0 };
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <p className="pointer-events-none select-none text-sm text-gray-400">
        VEX is minimized — click the bubble to reopen.
      </p>

      {pos && (
        <button
          onPointerDown={onPointerDown}
          title="Drag to move · click to reopen"
          style={{
            left: pos.x,
            top: pos.y,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            touchAction: "none",
          }}
          className="fixed z-[61] flex items-center justify-center rounded-full bg-black shadow-2xl ring-1 ring-white/20 transition active:scale-95"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt="Reopen VEX"
            draggable={false}
            className="h-9 w-9 rounded-full object-contain"
          />
        </button>
      )}
    </div>
  );
}
