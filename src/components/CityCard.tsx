"use client";

import type { CityCheckResult } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface CityCardProps {
  result: CityCheckResult;
  onRefresh: (cityId: string) => void;
  refreshing: boolean;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function CityCard({ result, onRefresh, refreshing }: CityCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {result.cityName}
          </h2>
          <p className="text-sm text-slate-500">
            {result.organization ?? result.region}
            {result.organization && (
              <span className="text-slate-400"> · {result.region}</span>
            )}
          </p>
        </div>
        <StatusBadge status={result.overallStatus} />
      </div>

      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        {result.summary}
      </p>

      {result.sessions.length > 0 && (
        <ul className="mb-4 space-y-2">
          {result.sessions.map((session) => (
            <li
              key={session.label}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-slate-800">
                  {session.label}
                </span>
                {session.note && (
                  <p className="truncate text-xs text-slate-500">
                    {session.note}
                  </p>
                )}
              </div>
              <StatusBadge status={session.status} />
            </li>
          ))}
        </ul>
      )}

      {result.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {result.error}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <a
          href={result.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Book on AF site
        </a>
        <button
          type="button"
          onClick={() => onRefresh(result.cityId)}
          disabled={refreshing}
          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? "Checking…" : "Refresh"}
        </button>
        <span className="ml-auto text-xs text-slate-400">
          {formatTime(result.checkedAt)}
        </span>
      </div>
    </article>
  );
}
