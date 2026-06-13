import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

function parseWinnipegSessions(text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const pattern =
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2})\s*\(Sold out\)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    sessions.push({
      label: match[1].trim(),
      status: "sold_out",
    });
  }

  if (/new dates will be published/i.test(text) && sessions.length > 0) {
    sessions.push({
      label: "Upcoming dates",
      status: "opening_soon",
      note: "AF Manitoba will publish new sessions on the TCF page",
    });
  }

  return sessions;
}

export async function scrapeWinnipeg(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);
  const sessions = parseWinnipegSessions(text);

  const overallStatus =
    sessions.some((s) => s.status === "opening_soon")
      ? "opening_soon"
      : sessions.length > 0
        ? overallFromSessions(sessions)
        : /contact us|info@afmanitoba/i.test(text)
          ? "unknown"
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
      "Contact AF Manitoba at info@afmanitoba.ca or check page for new session dates"
    ),
  };
}
