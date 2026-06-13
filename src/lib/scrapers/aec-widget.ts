import type { CityCheckResult, CityConfig, SessionSlot } from "../types";
import {
  buildSummary,
  fetchPage,
  normalizeText,
  overallFromSessions,
} from "./utils";

export interface AecWidgetConfig {
  /** Page with embedded ATL/AEC exam widget or registration info */
  pageUrl: string;
  /** Optional direct extranet login for booking */
  extranetUrl?: string;
  /** Calendar published N days ahead — used in summary */
  calendarNote?: string;
}

function parseAecWidgetSessions(html: string, text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];

  if (/no available dates|pas de date disponible/i.test(text)) {
    sessions.push({
      label: "Published calendar",
      status: "sold_out",
      note: "No dates currently listed on the booking portal",
    });
  }

  const closure = text.match(
    /no TCF sessions[^.]{0,120}between ([^.]{5,40}) and ([^.]{5,40})/i
  );
  if (closure) {
    sessions.push({
      label: "FEI summer closure",
      status: "not_listed",
      note: `No sessions ${closure[1].trim()} – ${closure[2].trim()}`,
    });
  }

  const resume = text.match(/sessions will resume on\s+([^.]+)/i);
  if (resume) {
    sessions.push({
      label: "Sessions resume",
      status: "opening_soon",
      note: resume[1].trim(),
    });
  }

  const widget = html.match(/wp-block-atl-exams data='([^']+)'/);
  if (widget) {
    try {
      const config = JSON.parse(widget[1].replace(/&quot;/g, '"'));
      if (config.examinationTypes) {
        sessions.push({
          label: "Live booking widget",
          status: "unknown",
          note: `Exam types ${config.examinationTypes} — open portal to see dates`,
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  if (/kiosque-aec|data-module='examination'/i.test(html)) {
    sessions.push({
      label: "Online registration portal",
      status: "unknown",
      note: "Dates load in the AEC booking widget — refresh on official site",
    });
  }

  return sessions;
}

export async function scrapeAecWidget(
  city: CityConfig,
  config: AecWidgetConfig
): Promise<CityCheckResult> {
  const html = await fetchPage(config.pageUrl);
  const text = normalizeText(html);
  const sessions = parseAecWidgetSessions(html, text);

  let overallStatus = overallFromSessions(sessions);
  if (/no available dates|pas de date disponible/i.test(text)) {
    overallStatus = "sold_out";
  } else if (sessions.some((s) => s.status === "opening_soon")) {
    overallStatus = "opening_soon";
  } else if (sessions.length > 0) {
    overallStatus = "unknown";
  }

  const bookingUrl = config.extranetUrl ?? city.bookingUrl;

  return {
    cityId: city.id,
    cityName: city.name,
    region: city.region,
    organization: city.organization,
    bookingUrl,
    checkedAt: new Date().toISOString(),
    overallStatus,
    sessions,
    summary: buildSummary(
      sessions,
      config.calendarNote ??
        "Open the Alliance Française booking portal — dates are not in static HTML"
    ),
  };
}

export async function scrapeOttawa(city: CityConfig): Promise<CityCheckResult> {
  return scrapeAecWidget(city, {
    pageUrl: city.bookingUrl,
    extranetUrl: "https://afottawa.extranet-aec.com/students/login",
    calendarNote:
      "Ottawa uses a live booking portal. FEI closure Aug 3–16, 2026 — no sessions that period",
  });
}

export async function scrapeHalifax(city: CityConfig): Promise<CityCheckResult> {
  return scrapeAecWidget(city, {
    pageUrl:
      "https://afhalifax.ca/test-your-french/tcf/tcf-canada-registration/",
    extranetUrl: "https://afhalifax.extranet-aec.com/students/login",
    calendarNote:
      "Halifax updates the calendar 30–45 days ahead. If empty, slots are full or not yet published",
  });
}

export async function scrapeMoncton(city: CityConfig): Promise<CityCheckResult> {
  return scrapeAecWidget(city, {
    pageUrl: city.bookingUrl,
    extranetUrl: "https://afmoncton.extranet-aec.com/students/login",
    calendarNote:
      "Moncton TCF Canada dates appear in the online registration widget",
  });
}

export async function scrapeMontrealAf(city: CityConfig): Promise<CityCheckResult> {
  const result = await scrapeAecWidget(city, {
    pageUrl: city.bookingUrl,
    extranetUrl: "https://afmontreal.extranet-aec.com/students/login",
    calendarNote:
      "AF Montréal posts sessions in the online shop — also check complx.ca for TCF Canada",
  });

  try {
    const storeRes = await fetch(
      "https://complx.ca/wp-json/wc/store/v1/products/71683",
      { headers: { "User-Agent": "TCF-Checker/1.0" } }
    );
    if (storeRes.ok) {
      const product = (await storeRes.json()) as {
        is_in_stock?: boolean;
        name?: string;
      };
      if (product.is_in_stock) {
        result.sessions.unshift({
          label: "Complx.ca shop (AF Montréal)",
          status: "available",
          note: "TCF Canada product in stock — select date at checkout",
        });
        result.overallStatus = "available";
        result.summary =
          "Complx shop shows TCF Canada in stock — pick a date during checkout";
      }
    }
  } catch {
    // complx check is best-effort
  }

  return result;
}
