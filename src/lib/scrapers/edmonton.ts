import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

function parseEdmontonSessions(text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const seen = new Set<string>();

  const inlineRows =
    text.match(
      /TCF Canada - (July \d+[^$]{0,20})\s+[^$]{0,200}?SOLD OUT!/gi
    ) ?? [];
  for (const row of inlineRows) {
    const labelMatch = row.match(/TCF Canada - (July \d+)/i);
    const label = labelMatch?.[1] ?? "July session";
    if (!seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      sessions.push({ label, status: "sold_out" });
    }
  }

  const tableRows =
    text.match(/TCF Canada - [^|]+?\|[^|]*\|[^|]*\|[^|]*\| (SOLD OUT!|Closed|\d+)[^|]*\|/gi) ??
    [];

  for (const row of tableRows) {
    const labelMatch = row.match(/TCF Canada - ([^|*]+)/i);
    const label = labelMatch?.[1]?.trim() ?? "Session";
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let status: SessionSlot["status"] = "unknown";
    if (/SOLD OUT|Closed/i.test(row)) status = "sold_out";
    else if (/\d+/.test(row.split("|").pop() ?? "")) status = "available";

    sessions.push({ label, status });
  }

  const juneDates =
    text.match(
      /June \d{1,2}, 2026\s*\(sold out\)/gi
    ) ?? [];
  if (juneDates.length > 0 && sessions.length === 0) {
    for (const d of juneDates) {
      sessions.push({
        label: d.replace(/\s*\(sold out\)/i, "").trim(),
        status: "sold_out",
      });
    }
  }

  return sessions.slice(0, 12);
}

export async function scrapeEdmonton(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);
  const sessions = parseEdmontonSessions(text);
  const overallStatus = overallFromSessions(sessions);

  return {
    cityId: city.id,
    cityName: city.name,
    region: city.region,
    organization: city.organization,
    bookingUrl: city.bookingUrl,
    checkedAt: new Date().toISOString(),
    overallStatus,
    sessions,
    summary: buildSummary(
      sessions,
      "New dates posted on AF Edmonton page when registration opens"
    ),
  };
}
