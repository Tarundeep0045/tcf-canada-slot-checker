import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

const CONCORDIA_TCF_PAGE =
  "https://www.concordia.ca/cce/language-testing/tcf-test.html";

function extractTcfCanadaEventUrls(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/https:\/\/sites\.events\.concordia\.ca\/sites\/tcfq\/[^"'\s]+tcf-ca[^"'\s]*/gi)].map(
        (m) => m[0]
      )
    ),
  ];
}

function parseEventLabel(html: string, url: string): string {
  const title =
    html.match(/<title>([^<]+)/i)?.[1]?.replace(/Accueil \| /, "") ??
    url.split("/").pop() ??
    "Session";
  return title.replace(/&#39;/g, "'").trim();
}

function parseEventDate(text: string, url: string): Date | null {
  const slugDate = url.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{1,2})-tcf-ca/i
  );
  if (slugDate) {
    const slugMonths: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const m = slugMonths[slugDate[1].toLowerCase()];
    if (m) return new Date(`2026-${m}-${slugDate[2].padStart(2, "0")}`);
  }

  const debut = text.match(
    /D[eé]but:\s*(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre),?\s+(20\d{2})/i
  );
  if (debut) {
    const parsed = frenchDateParts(debut[1], debut[2], debut[3]);
    if (parsed) return parsed;
  }

  const fr = text.match(
    /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre),?\s+(20\d{2})/i
  );
  if (!fr) {
    const en = text.match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i
    );
    if (en) return new Date(`${en[1]} ${en[2]}, ${en[3]}`);
    return null;
  }

  return frenchDateParts(fr[1], fr[2], fr[3]);
}

function frenchDateParts(day: string, month: string, year: string): Date | null {
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
  const m = months[month.toLowerCase()];
  return m ? new Date(`${year}-${m}-${day.padStart(2, "0")}`) : null;
}

function inferEventStatus(text: string, eventDate: Date | null): SessionSlot["status"] {
  const lower = text.toLowerCase();
  if (
    /sold out|complet|plus de place|registration closed|inscriptions ferm[eé]es|event is full/i.test(
      lower
    )
  ) {
    return "sold_out";
  }
  if (eventDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) return "sold_out";
    return "available";
  }
  if (/accueil inscription|>inscription</i.test(lower)) {
    return "available";
  }
  return "unknown";
}

async function parseConcordiaEvent(url: string): Promise<SessionSlot | null> {
  try {
    const html = await fetchPage(url);
    const text = normalizeText(html);
    const label = parseEventLabel(html, url);
    const eventDate = parseEventDate(text, url);
    const status = inferEventStatus(text, eventDate);

    return {
      label,
      status,
      note: eventDate
        ? `Exam date: ${eventDate.toLocaleDateString("en-CA")}`
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function scrapeConcordia(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(CONCORDIA_TCF_PAGE);
  const urls = extractTcfCanadaEventUrls(html);

  const sessions = (
    await Promise.all(urls.map((url) => parseConcordiaEvent(url)))
  ).filter((s): s is SessionSlot => s !== null);

  const overallStatus = overallFromSessions(sessions);

  return {
    cityId: city.id,
    cityName: city.name,
    region: city.region,
    organization: city.organization,
    bookingUrl: CONCORDIA_TCF_PAGE,
    checkedAt: new Date().toISOString(),
    overallStatus,
    sessions: sessions.slice(0, 10),
    summary: buildSummary(
      sessions,
      `${urls.length} TCF Canada sessions listed on Concordia event portal — verify on registration page`
    ),
  };
}
