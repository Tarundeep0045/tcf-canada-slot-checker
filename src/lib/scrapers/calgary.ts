import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

function parseCalgarySessions(text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const months =
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\s+sessions?/gi;

  let match: RegExpExecArray | null;
  while ((match = months.exec(text)) !== null) {
    const label = match[0].replace(/\s+sessions?$/i, "").trim();
    const context = text.slice(match.index, match.index + 120);
    let status: SessionSlot["status"] = "unknown";
    if (/sold\s*out/i.test(context)) status = "sold_out";
    else if (/register|book|available/i.test(context)) status = "available";

    sessions.push({ label, status });
  }

  return sessions;
}

export async function scrapeCalgary(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);
  const sessions = parseCalgarySessions(text);

  const overallStatus =
    sessions.length > 0
      ? overallFromSessions(sessions)
      : /additional\s+sessions|published\s+on\s+this\s+page/i.test(text)
        ? "opening_soon"
        : "unknown";

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
      "Additional 2026 dates being coordinated with FEI. Check page regularly."
    ),
  };
}
