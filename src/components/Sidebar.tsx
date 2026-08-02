"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  CalendarClock,
  PencilLine,
  Globe,
  HandHeart,
  GraduationCap,
  Sparkles,
  LineChart,
  ChevronsRight,
  Sun,
  Video,
  Settings,
} from "lucide-react";

// NOTE: the 2nd icon from the original EdgeFlo sidebar (the rising-arrow /
// candlestick one, directly below the dashboard icon) is intentionally removed
// per product decision.
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: undefined },
  { icon: ShieldCheck, label: "Edge", href: "/edge" },
  { icon: CalendarClock, label: "Calendar", href: undefined },
  { icon: PencilLine, label: "Notebook", href: "/notebook" },
  { icon: Globe, label: "Explore", href: undefined },
  { icon: HandHeart, label: "Community", href: undefined },
  { icon: GraduationCap, label: "Learn", href: undefined },
  { icon: Sparkles, label: "AI", href: undefined },
  { icon: LineChart, label: "Analytics", href: undefined },
];

const BOTTOM_ITEMS = [
  { icon: ChevronsRight, label: "Expand" },
  { icon: Sun, label: "Theme" },
  { icon: Video, label: "Tutorials" },
  { icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center border-r border-black/5 bg-white py-4">
      {/* Logo */}
      <Link
        href="/edge"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6d5ef5] to-[#8b7cff] text-lg font-bold text-white shadow-sm"
      >
        E
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = href ? pathname.startsWith(href) : false;
          const cls = `flex h-10 w-10 items-center justify-center rounded-xl transition ${
            active
              ? "bg-brand-soft text-brand"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`;
          const inner = <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />;
          return href ? (
            <Link key={label} href={href} title={label} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={label} title={label} className={cls}>
              {inner}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1.5">
        {BOTTOM_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <Icon size={20} strokeWidth={1.8} />
          </button>
        ))}
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-sm font-semibold text-white">
          L
        </div>
      </div>
    </aside>
  );
}
