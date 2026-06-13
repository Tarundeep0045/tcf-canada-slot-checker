import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

type Campus = "montreal" | "quebec";

function parseStanislasSessions(text: string, campus: Campus): SessionSlot[] {
  let canadaBlock = "";

  if (campus === "montreal") {
    const start = text.search(/Centre de Montr[eé]al/i);
    const end = text.search(/Centre de Qu[eé]bec/i);
    const section =
      start >= 0
        ? text.slice(start, end >= 0 ? end : start + 4000)
        : text;
    canadaBlock =
      section.match(/TCF CANADA \(TCF CA\)([\s\S]{0,1200})/i)?.[1] ?? "";
  } else {
    const start = text.search(/Centre de Qu[eé]bec/i);
    const section = start >= 0 ? text.slice(start, start + 5000) : text;
    canadaBlock =
      section.match(/TCF Canada([\s\S]{0,3500})/i)?.[1] ?? "";
  }

  if (!canadaBlock) return [];

  const sessions: SessionSlot[] = [];
  const seen = new Set<string>();
  const pattern =
    /SESSION(?:\s+DU)?\s*((?:du\s+)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d{1,2}\s+[a-zéèêàâûôî]+(?:\s+\d{4})?|\d{1,2}\s+[A-ZÉÈÊÀÂÛÔÎa-zéèêàâûôî]+\s+\d{4})/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(canadaBlock)) !== null) {
    const label = match[1].trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const eventDate = parseFrenchDateLabel(label);
    let status: SessionSlot["status"] = "unknown";
    if (eventDate && eventDate < new Date()) status = "sold_out";
    else if (eventDate && eventDate >= new Date()) status = "available";

    sessions.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      status,
      note: "Contact centre to confirm registration",
    });
  }

  return sessions.slice(0, 12);
}

function parseFrenchDateLabel(label: string): Date | null {
  const months: Record<string, string> = {
    janvier: "01",
    février: "02",
    fevrier: "02",
    mars: "03",
    avril: "04",
    mai: "05",
    juin: "06",
    juillet: "07",
    août: "08",
    aout: "08",
    septembre: "09",
    octobre: "10",
    novembre: "11",
    décembre: "12",
    decembre: "12",
  };

  const simple = label.match(/(\d{1,2})\s+([a-zéèêàâûôî]+)\s+(\d{4})/i);
  if (simple) {
    const m = months[simple[2].toLowerCase()];
    return m ? new Date(`${simple[3]}-${m}-${simple[1].padStart(2, "0")}`) : null;
  }

  const weekday = label.match(
    /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zéèêàâûôî]+)(?:\s+(\d{4}))?/i
  );
  if (weekday) {
    const year = weekday[3] ?? String(new Date().getFullYear());
    const m = months[weekday[2].toLowerCase()];
    return m ? new Date(`${year}-${m}-${weekday[1].padStart(2, "0")}`) : null;
  }

  return null;
}

async function scrapeStanislas(
  city: CityConfig,
  campus: Campus
): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);
  const sessions = parseStanislasSessions(text, campus);
  const overallStatus =
    sessions.length > 0 ? overallFromSessions(sessions) : "unknown";

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
      `Contact ${campus === "montreal" ? "tcf@stanislas.qc.ca (Montréal)" : "tcfquebec@stanislas.qc.ca"} for registration`
    ),
  };
}

export async function scrapeMontrealStanislas(
  city: CityConfig
): Promise<CityCheckResult> {
  return scrapeStanislas(city, "montreal");
}

export async function scrapeQuebecStanislas(
  city: CityConfig
): Promise<CityCheckResult> {
  return scrapeStanislas(city, "quebec");
}
