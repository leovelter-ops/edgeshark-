"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  CandlestickChart,
  ShieldCheck,
  CalendarClock,
  PencilLine,
  GraduationCap,
  Flower2,
  ChevronsRight,
  ChevronsLeft,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { applyTheme, getTheme, THEME_EVENT, Theme } from "@/lib/theme";

const EXPANDED_KEY = "edgeflo_sidebar_expanded";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href?: string;
  badge?: string;
}

// NOTE: the 2nd icon from the original EdgeFlo sidebar (the rising-arrow /
// candlestick one, directly below the dashboard icon) is intentionally removed
// per product decision.
const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: CandlestickChart, label: "Trading", href: "/trading" },
  { icon: ShieldCheck, label: "Edge", href: "/edge" },
  { icon: CalendarClock, label: "Journal", href: "/journal" },
  { icon: PencilLine, label: "Notebook", href: "/notebook" },
  { icon: Flower2, label: "Sanctuary", href: "/sanctuary" },
  { icon: GraduationCap, label: "Academy", href: "/academy" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [dark, setDark] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const logoRef = useRef<HTMLImageElement>(null);

  // Sync UI state from storage / the DOM after mount (avoids a hydration gap).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(getTheme() === "dark");
    try {
      setExpanded(localStorage.getItem(EXPANDED_KEY) === "1");
    } catch {
      /* ignore */
    }
    // If the logo 404'd before hydration, onError never fires — check directly.
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) setLogoOk(false);

    // Stay in sync when the theme is changed elsewhere (e.g. Settings).
    const onThemeChange = (e: Event) =>
      setDark((e as CustomEvent<Theme>).detail === "dark");
    window.addEventListener(THEME_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_EVENT, onThemeChange);
  }, []);

  const toggleExpanded = () => {
    setExpanded((v) => {
      const next = !v;
      try {
        localStorage.setItem(EXPANDED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleTheme = () => {
    const next: Theme = dark ? "light" : "dark";
    applyTheme(next); // updates <html>, storage, and fires THEME_EVENT
    setDark(next === "dark");
  };

  return (
    <aside
      style={{
        width: expanded ? "15rem" : "4rem",
        minWidth: expanded ? "15rem" : "4rem",
      }}
      className={`flex shrink-0 flex-col border-r border-black/5 bg-white py-4 transition-[width] duration-200 ${
        expanded ? "px-3" : "items-center"
      }`}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className={`mb-4 flex items-center gap-2.5 ${expanded ? "px-1" : ""}`}
        title="EdgeFlo"
      >
        {logoOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={logoRef}
            src="/images/logo.jpg"
            alt="EdgeFlo"
            className="h-10 w-10 shrink-0 rounded-xl object-contain"
            onError={() => setLogoOk(false)}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#5b8bff] text-lg font-bold text-white shadow-sm">
            E
          </span>
        )}
        {expanded && (
          <span className="text-lg font-bold text-gray-900">EdgeFlo</span>
        )}
      </Link>

      {/* Nav */}
      <nav className={`flex flex-1 flex-col gap-1 ${expanded ? "" : "items-center gap-1.5"}`}>
        {NAV_ITEMS.map((item) => {
          const active = item.href ? pathname.startsWith(item.href) : false;
          return (
            <SidebarItem
              key={item.label}
              item={item}
              active={active}
              expanded={expanded}
            />
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`flex flex-col gap-1 ${expanded ? "" : "items-center gap-1.5"}`}>
        <SidebarButton
          icon={expanded ? ChevronsLeft : ChevronsRight}
          label={expanded ? "Collapse" : "Expand"}
          expanded={expanded}
          onClick={toggleExpanded}
        />
        <SidebarButton
          icon={dark ? Moon : Sun}
          label={`Theme: ${dark ? "Dark" : "Light"}`}
          expanded={expanded}
          onClick={toggleTheme}
        />
        <SidebarItem
          item={{ icon: Settings, label: "Settings", href: "/settings" }}
          active={pathname.startsWith("/settings")}
          expanded={expanded}
        />

        {/* User */}
        <div
          className={`mt-1 flex items-center gap-2.5 ${expanded ? "px-1 py-1" : "justify-center"}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-sm font-semibold text-white">
            L
          </div>
          {expanded && (
            <span className="truncate text-sm font-medium text-gray-700">
              Leonardo Velter
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// A nav row that is either a link (has href) or a plain button placeholder.
// ---------------------------------------------------------------------------

function SidebarItem({
  item,
  active,
  expanded,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
}) {
  const { icon: Icon, label, href, badge } = item;
  const base = `group relative flex items-center rounded-xl transition ${
    expanded ? "gap-3 px-3 py-2.5" : "h-10 w-10 justify-center"
  } ${
    active
      ? "bg-brand-soft text-brand"
      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
  }`;

  const inner = (
    <>
      <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
      {expanded && (
        <span className={`flex-1 text-sm font-medium ${active ? "" : "text-gray-700"}`}>
          {label}
        </span>
      )}
      {expanded && badge && (
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-400">
          {badge}
        </span>
      )}
      {!expanded && <Tooltip label={label} />}
    </>
  );

  return href ? (
    <Link href={href} title={expanded ? undefined : label} className={base}>
      {inner}
    </Link>
  ) : (
    <button title={expanded ? undefined : label} className={base}>
      {inner}
    </button>
  );
}

// A bottom-row action button (expand/collapse, theme, tutorial).
function SidebarButton({
  icon: Icon,
  label,
  expanded,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  expanded: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={expanded ? undefined : label}
      className={`group relative flex items-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 ${
        expanded ? "gap-3 px-3 py-2.5" : "h-10 w-10 justify-center"
      }`}
    >
      <Icon size={20} strokeWidth={1.8} className="shrink-0" />
      {expanded && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
      {!expanded && <Tooltip label={label} />}
    </button>
  );
}

// Hover preview shown for collapsed items.
function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-gray-700">
      {label}
    </span>
  );
}
