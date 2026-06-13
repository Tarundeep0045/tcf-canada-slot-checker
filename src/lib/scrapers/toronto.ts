import type { CityCheckResult, CityConfig, SlotStatus } from "../types";
import { fetchPage, normalizeText } from "./utils";

const REGISTRATION_WINDOWS: Array<{
  quarter: string;
  opens: string;
  status: SlotStatus;
}> = [
  { quarter: "Q1 (Jan–Mar)", opens: "Dec 2, 2025", status: "sold_out" },
  { quarter: "Q2 (Apr–Jun)", opens: "Mar 2, 2026", status: "sold_out" },
  { quarter: "Q3 (Jul–Sep)", opens: "May 20, 2026", status: "opening_soon" },
  { quarter: "Q4 (Oct–Dec)", opens: "Aug 15, 2026", status: "opening_soon" },
];

export async function scrapeToronto(city: CityConfig): Promise<CityCheckResult> {
  const html = await fetchPage(city.bookingUrl);
  const text = normalizeText(html);

  const now = new Date();
  const sessions = REGISTRATION_WINDOWS.map((w) => {
    const openDate = new Date(w.opens);
    let status = w.status;

    if (now >= openDate && w.quarter.startsWith("Q3")) {
      status = /full|sold|not listed/i.test(text) ? "sold_out" : "available";
    }

    return {
      label: w.quarter,
      status,
      note: `Registration opens ${w.opens}`,
    };
  });

  const hasAvailable = sessions.some((s) => s.status === "available");
  const allSoldOut = sessions.every(
    (s) => s.status === "sold_out" || s.status === "opening_soon"
  );

  return {
    cityId: city.id,
    cityName: city.name,
    region: city.region,
    organization: city.organization,
    bookingUrl: city.bookingUrl,
    checkedAt: new Date().toISOString(),
    overallStatus: hasAvailable
      ? "available"
      : allSoldOut
        ? "sold_out"
        : "opening_soon",
    sessions,
    summary: city.locations
      ? `Quarterly sessions across ${city.locations.join(", ")}. Q3 opens May 20, 2026.`
      : "Quarterly sessions. Q3 registration opens May 20, 2026.",
  };
}
