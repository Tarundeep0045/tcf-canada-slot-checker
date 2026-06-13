import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

export function parseNextSessionTable(text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const seen = new Set<string>();

  const pattern =
    /Next [Ss]ession:\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|Octobre\s+\d{4}|(?:May|July)\s*&\s*(?:June|August)\s+\d{4})\s*(SOLD OUT|REGISTRATIONS START[^N]*|Registration starts[^N]*)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[1].trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const statusText = match[2];
    let status: SessionSlot["status"] = "unknown";
    if (/sold\s*out/i.test(statusText)) status = "sold_out";
    else if (/registration\s+start|registrations\s+start/i.test(statusText))
      status = "opening_soon";

    sessions.push({
      label,
      status,
      note: statusText.trim().slice(0, 80),
    });
  }

  // Victoria uses "Next session:" with table rows like "Registration starts: SOLD OUT"
  if (sessions.length === 0) {
    const rowPattern =
      /Next session:\s*([^|]+?)\s*\|\s*Registration starts:\s*([^|]+)/gi;
    while ((match = rowPattern.exec(text)) !== null) {
      const label = match[1].trim();
      const statusText = match[2].trim();
      let status: SessionSlot["status"] = "unknown";
      if (/sold\s*out/i.test(statusText)) status = "sold_out";
      else if (/registration/i.test(statusText)) status = "opening_soon";

      sessions.push({ label, status, note: statusText });
    }
  }

  return sessions;
}

export async function scrapeSessionTablePage(
  city: CityConfig,
  fallbackSummary: string
): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);
  const sessions = parseNextSessionTable(text);
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
    summary: buildSummary(sessions, fallbackSummary),
  };
}
