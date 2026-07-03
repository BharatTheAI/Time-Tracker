import { useState } from "react";
import { todayIST } from "../lib/timezone";

export type RangePreset = "daily" | "weekly" | "monthly" | "custom";

interface DateRangeFilterProps {
  onChange: (range: { startDate: string; endDate: string }) => void;
}

function computeRange(preset: RangePreset, customStart?: string, customEnd?: string) {
  const today = new Date(todayIST());
  const end = todayIST();

  if (preset === "daily") return { startDate: end, endDate: end };

  if (preset === "weekly") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: start.toISOString().slice(0, 10), endDate: end };
  }

  if (preset === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: end };
  }

  return { startDate: customStart ?? end, endDate: customEnd ?? end };
}

export default function DateRangeFilter({ onChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<RangePreset>("monthly");
  const [customStart, setCustomStart] = useState(todayIST());
  const [customEnd, setCustomEnd] = useState(todayIST());

  function applyPreset(p: RangePreset) {
    setPreset(p);
    if (p !== "custom") {
      onChange(computeRange(p));
    } else {
      onChange(computeRange("custom", customStart, customEnd));
    }
  }

  function applyCustom(start: string, end: string) {
    setCustomStart(start);
    setCustomEnd(end);
    onChange(computeRange("custom", start, end));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["daily", "weekly", "monthly", "custom"] as RangePreset[]).map((p) => (
        <button
          key={p}
          onClick={() => applyPreset(p)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
            preset === p
              ? "bg-brand-600 text-white"
              : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {p}
        </button>
      ))}

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input-field"
            value={customStart}
            max={customEnd}
            onChange={(e) => applyCustom(e.target.value, customEnd)}
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            className="input-field"
            value={customEnd}
            min={customStart}
            max={todayIST()}
            onChange={(e) => applyCustom(customStart, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
