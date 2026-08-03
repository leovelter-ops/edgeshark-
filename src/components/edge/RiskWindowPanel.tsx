"use client";

import { useEffect, useState } from "react";
import { Info, Clock, Lock } from "lucide-react";
import {
  TRADING_KEY,
  DEFAULT_TRADING,
  TradingPrefs,
  loadSetting,
} from "@/lib/settings";

// ---------------------------------------------------------------------------
// Read-only Risk Controls + Trading Window shown on the Edge page. These are
// NOT editable here — they mirror Settings › Trading Preferences (the single
// source of truth), so every plan follows the same guardrails.
// ---------------------------------------------------------------------------

/** Human-readable news-block rule derived from the trading preferences. */
export function blockNewsNote(p: TradingPrefs): string | null {
  if (!p.newsWhen || p.newsWhen === "Off") return null;
  const when = p.newsWhen.toLowerCase(); // "before" | "after" | "before and after"
  return `Trading blocked ${p.newsMins} min ${when} High Impact events`;
}

export default function RiskWindowPanel() {
  // Read after mount so it always reflects the latest saved preferences.
  const [prefs, setPrefs] = useState<TradingPrefs>(DEFAULT_TRADING);
  useEffect(() => {
    setPrefs(loadSetting(TRADING_KEY, DEFAULT_TRADING));
  }, []);

  const note = blockNewsNote(prefs);

  return (
    <div className="space-y-5">
      {/* Risk Controls */}
      <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Risk Controls
            <Info size={13} className="text-gray-400" />
          </div>
          <span
            className="flex items-center gap-1 text-[11px] font-medium text-gray-400"
            title="Set in Settings › Trading Preferences"
          >
            <Lock size={11} /> From Settings
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6">
          <Metric value={fmt(prefs.maxTradesPerDay)} label="Max trades per day" />
          <Metric value={fmt(prefs.maxDailyLoss, 2)} label="Max daily loss" />
          <Metric value={fmt(prefs.maxDailyProfit, 2)} label="Max daily profit" />
          <Metric value={`${prefs.fixedRisk.toFixed(2)}%`} label="Risk per trade" />
        </div>
      </div>

      {/* Trading Window */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Clock size={13} className="text-gray-400" />
            Trading Window
          </div>
          <span
            className="flex items-center gap-1 text-[11px] font-medium text-gray-400"
            title="Set in Settings › Trading Preferences"
          >
            <Lock size={11} /> From Settings
          </span>
        </div>
        <div className="text-xl font-bold text-gray-900">
          {prefs.windowStart} - {prefs.windowEnd}
        </div>
        {note && (
          <>
            <div className="mt-3 text-sm text-gray-500">Block News</div>
            <p className="mt-1 text-sm text-gray-700">{note}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
