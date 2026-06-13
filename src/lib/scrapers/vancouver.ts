import type { CityCheckResult } from "../types";
import type { CityConfig } from "../types";
import { scrapeSessionTablePage } from "./session-table";

export async function scrapeVancouver(city: CityConfig): Promise<CityCheckResult> {
  return scrapeSessionTablePage(
    city,
    "Check Alliance Française Vancouver for upcoming 2026 sessions"
  );
}
