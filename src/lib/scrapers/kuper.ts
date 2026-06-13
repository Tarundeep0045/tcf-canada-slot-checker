import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  inferStatus,
  normalizeText,
  overallFromSessions,
} from "./utils";

function parseKuperSessions(text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const pattern =
    /TCF Canada\s+(\d{1,2}\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})[^:]*Date limite pour inscription:\s*([^T]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[1].trim();
    const deadline = match[2].trim();
    const context = match[0];
    const deadlineDate = new Date(deadline);
    const now = new Date();
    let status: SessionSlot["status"] = inferStatus(context);

    if (!Number.isNaN(deadlineDate.getTime()) && now > deadlineDate) {
      status = "sold_out";
    } else if (status === "unknown") {
      status = "available";
    }

    sessions.push({
      label,
      status,
      note: `Registration deadline: ${deadline}`,
    });
  }

  return sessions;
}

export async function scrapeKuper(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);
  const sessions = parseKuperSessions(text);
  const overallStatus = overallFromSessions(sessions);

  return {
    cityId: city.id,
    cityName: city.name,
    region: city.region,
    organization: city.organization,
    bookingUrl: city.bookingUrl,
    checkedAt: new Date().toISOString(),
    overallStatus: sessions.length > 0 ? overallStatus : "unknown",
    sessions,
    summary: buildSummary(
      sessions,
      "Check Kuper Academy page for upcoming Kirkland session dates"
    ),
  };
}
