"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityCheckResult, SlotStatus } from "@/lib/types";
import { CITIES } from "@/lib/cities";
import { CityCard } from "./CityCard";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

const FILTER_OPTIONS: Array<{ value: SlotStatus | "all"; label: string }> = [
  { value: "all", label: "All cities" },
  { value: "available", label: "May have spots" },
  { value: "opening_soon", label: "Opening soon" },
  { value: "sold_out", label: "Sold out" },
  { value: "unknown", label: "Verify manually" },
];

export function Dashboard() {
  const [results, setResults] = useState<CityCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingCity, setRefreshingCity] = useState<string | null>(null);
  const [filter, setFilter] = useState<SlotStatus | "all">("all");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setError(null);
    if (refresh) setRefreshingAll(true);
    else setLoading(true);

    try {
      const res = await fetch(
        `/api/check${refresh ? "?refresh=true" : ""}`,
        refresh ? { method: "POST" } : undefined
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setResults(data.results ?? []);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshingAll(false);
    }
  }, []);

  const refreshCity = useCallback(async (cityId: string) => {
    setRefreshingCity(cityId);
    setError(null);
    try {
      const res = await fetch(`/api/check/${cityId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setResults((prev) =>
        prev.map((r) => (r.cityId === cityId ? data.result : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshingCity(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((r) => r.overallStatus === filter);
  }, [results, filter]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.overallStatus] = (counts[r.overallStatus] ?? 0) + 1;
    }
    return counts;
  }, [results]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-blue-700">
              TCF Canada
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Exam slot checker
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Monitor {CITIES.length} accredited TCF Canada centres across
              Canada. Always confirm availability on the official site before
              registering.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshingAll || loading}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
          >
            {refreshingAll ? "Checking all cities…" : "Check all cities"}
          </button>
        </div>

        {lastRefresh && (
          <p className="mt-3 text-xs text-slate-500">
            Last updated {new Date(lastRefresh).toLocaleString("en-CA")} ·
            Auto-refresh every 5 minutes
          </p>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === opt.value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {opt.label}
            {opt.value !== "all" && stats[opt.value] != null && (
              <span className="ml-1 opacity-70">({stats[opt.value]})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: CITIES.length }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((result) => (
            <CityCard
              key={result.cityId}
              result={result}
              onRefresh={refreshCity}
              refreshing={refreshingCity === result.cityId}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="rounded-xl bg-slate-50 py-12 text-center text-slate-500">
          No cities match this filter.
        </p>
      )}

      <footer className="mt-12 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-semibold">Disclaimer</p>
        <p className="mt-1 leading-relaxed">
          This tool scrapes public Alliance Française pages and may lag behind
          live booking systems. Registration is first-come, first-served. Use
          the official booking links to register — this app is not affiliated
          with Alliance Française or IRCC.
        </p>
      </footer>
    </div>
  );
}
