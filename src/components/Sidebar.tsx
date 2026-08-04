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
  PictureInPicture2,
} from "lucide-react";
import { applyTheme, getTheme, THEME_EVENT, Theme } from "@/lib/theme";

const EXPANDED_KEY = "edgeflo_sidebar_expanded";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href?: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: CandlestickChart, label: "Trading", href: "/trading" },
  { icon: ShieldCheck, label: "Edge", href: "/edge" },
  { icon: CalendarClock, label: "Journal", href: "/journal" },
  { icon: PencilLine, label: "Notebook", href: "/notebook" },
  { icon: Flower2, label: "Sanctuary", href: "/sanctuary" },
  { icon: GraduationCap, label: "Academy", href: "/academy" },
];

export default function Sidebar({
  mobile = false,
  onNavigate,
  onMinimize,
}: {
  /** Rendered inside the mobile drawer: always expanded, no collapse control. */
  mobile?: boolean;
  /** Called when a nav item is tapped (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Desktop-only: collapse the whole app into a floating bubble. */
  onMinimize?: () => void;
}) {
  const pathname = usePathname();
  const [rawExpanded, setRawExpanded] = useState(false);
  const [dark, setDark] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const logoRef = useRef<HTMLImageElement>(null);

  // In the mobile drawer the sidebar is always fully expanded.
  const expanded = mobile ? true : rawExpanded;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(getTheme() === "dark");
    try {
      setRawExpanded(localStorage.getItem(EXPANDED_KEY) === "1");
    } catch {
      /* ignore */
    }
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) setLogoOk(false);

    const onThemeChange = (e: Event) =>
      setDark((e as CustomEvent<Theme>).detail === "dark");
    window.addEventListener(THEME_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_EVENT, onThemeChange);
  }, []);

  const toggleExpanded = () => {
    setRawExpanded((v) => {
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
    applyTheme(next);
    setDark(next === "dark");
  };

  return (
    <aside
      style={{
        width: expanded ? "15rem" : "4rem",
        minWidth: expanded ? "15rem" : "4rem",
      }}
      className={`flex h-full shrink-0 flex-col border-r border-black/5 bg-white py-4 transition-[width] duration-200 ${
        expanded ? "px-3" : "items-center"
      }`}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`mb-4 flex items-center gap-2.5 ${expanded ? "px-1" : ""}`}
        title="VEX"
      >
        {logoOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={logoRef}
            src="/images/logo.jpg"
            alt="VEX"
            className="h-10 w-10 shrink-0 rounded-xl object-contain"
            onError={() => setLogoOk(false)}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#5b8bff] text-lg font-bold text-white shadow-sm">
            V
          </span>
        )}
        {expanded && <span className="text-lg font-bold text-gray-900">VEX</span>}
      </Link>

      {/* Nav */}
      <nav className={`flex flex-1 flex-col gap-1 ${expanded ? "" : "items-center gap-1.5"}`}>
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.label}
            item={item}
            active={item.href ? pathname.startsWith(item.href) : false}
            expanded={expanded}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className={`flex flex-col gap-1 ${expanded ? "" : "items-center gap-1.5"}`}>
        {!mobile && (
          <SidebarButton
            icon={expanded ? ChevronsLeft : ChevronsRight}
            label={expanded ? "Collapse" : "Expand"}
            expanded={expanded}
            onClick={toggleExpanded}
          />
        )}
        <SidebarButton
          icon={dark ? Moon : Sun}
          label={`Theme: ${dark ? "Dark" : "Light"}`}
          expanded={expanded}
          onClick={toggleTheme}
        />
        {!mobile && onMinimize && (
          <SidebarButton
            icon={PictureInPicture2}
            label="Float on top"
            expanded={expanded}
            onClick={onMinimize}
          />
        )}
        <SidebarItem
          item={{ icon: Settings, label: "Settings", href: "/settings" }}
          active={pathname.startsWith("/settings")}
          expanded={expanded}
          onNavigate={onNavigate}
        />

        {/* User */}
        <div className={`mt-1 flex items-center gap-2.5 ${expanded ? "px-1 py-1" : "justify-center"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-sm font-semibold text-white">
            L
          </div>
          {expanded && (
            <span className="truncate text-sm font-medium text-gray-700">Leonardo Velter</span>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const { icon: Icon, label, href, badge } = item;
  const base = `group relative flex items-center rounded-xl transition ${
    expanded ? "gap-3 px-3 py-2.5" : "h-10 w-10 justify-center"
  } ${
    active ? "bg-brand-soft text-brand" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
    <Link href={href} onClick={onNavigate} title={expanded ? undefined : label} className={base}>
      {inner}
    </Link>
  ) : (
    <button title={expanded ? undefined : label} className={base}>
      {inner}
    </button>
  );
}

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
      {expanded && <span className="text-sm font-medium text-gray-700">{label}</span>}
      {!expanded && <Tooltip label={label} />}
    </button>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-gray-700">
      {label}
    </span>
  );
}
