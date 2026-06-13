import type { CityCheckResult } from "../types";
import type { CityConfig } from "../types";
import {
  buildSummary,
  fetchPage,
  findMonthSessions,
  inferStatus,
  normalizeText,
  overallFromSessions,
} from "./utils";

export async function scrapeGeneric(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);

  let sessions = findMonthSessions(text);

  if (sessions.length === 0) {
    const tcfSection = text.match(/TCF\s*Canada[\s\S]{0,2500}/i)?.[0] ?? text;
    const pageStatus = inferStatus(tcfSection);

    if (/no\s+available\s+dates/i.test(tcfSection)) {
      sessions = [
        {
          label: "Upcoming sessions",
          status: "sold_out",
          note: "No dates listed — check booking page regularly",
        },
      ];
    } else {
      sessions = [
        {
          label: "TCF Canada",
          status: pageStatus,
          note: "Visit booking page to see live calendar",
        },
      ];
    }
  }

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
      "No structured session list found. Open booking page for current availability."
    ),
  };
}
