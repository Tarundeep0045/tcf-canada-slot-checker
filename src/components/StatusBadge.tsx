import type { SlotStatus } from "@/lib/types";

const STYLES: Record<SlotStatus, { label: string; className: string }> = {
  available: {
    label: "Spots may be open",
    className: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30",
  },
  sold_out: {
    label: "Sold out",
    className: "bg-rose-500/15 text-rose-700 ring-rose-500/30",
  },
  opening_soon: {
    label: "Opening soon",
    className: "bg-amber-500/15 text-amber-800 ring-amber-500/30",
  },
  not_listed: {
    label: "Not listed",
    className: "bg-slate-500/15 text-slate-600 ring-slate-500/30",
  },
  unknown: {
    label: "Check booking page",
    className: "bg-sky-500/15 text-sky-800 ring-sky-500/30",
  },
  error: {
    label: "Check failed",
    className: "bg-red-500/15 text-red-700 ring-red-500/30",
  },
};

export function StatusBadge({ status }: { status: SlotStatus }) {
  const style = STYLES[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.className}`}
    >
      {style.label}
    </span>
  );
}
