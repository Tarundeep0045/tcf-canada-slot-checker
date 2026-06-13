import type { CityCheckResult, CityConfig } from "../types";
import { scrapeSessionTablePage } from "./session-table";

export async function scrapeVictoria(city: CityConfig): Promise<CityCheckResult> {
  return scrapeSessionTablePage(
    city,
    "Check Alliance Française Victoria for upcoming sessions at 1218 Langley St"
  );
}
