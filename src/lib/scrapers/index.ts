import type { CityCheckResult } from "../types";
import { CITIES, getCityById } from "../cities";
import { scrapeVancouver } from "./vancouver";
import { scrapeVictoria } from "./victoria";
import { scrapeCalgary } from "./calgary";
import { scrapeToronto } from "./toronto";
import { scrapeKuper } from "./kuper";
import { scrapeEdmonton } from "./edmonton";
import { scrapeWinnipeg } from "./winnipeg";
import { scrapeConcordia } from "./concordia";
import { scrapeMontrealStanislas, scrapeQuebecStanislas } from "./stanislas";
import {
  scrapeOttawa,
  scrapeHalifax,
  scrapeMoncton,
  scrapeMontrealAf,
} from "./aec-widget";
import { scrapeGeneric } from "./generic";
import { saveCheck } from "../db";

type ScraperFn = (
  city: (typeof CITIES)[number]
) => Promise<CityCheckResult>;

const SCRAPERS: Record<string, ScraperFn> = {
  vancouver: scrapeVancouver,
  victoria: scrapeVictoria,
  calgary: scrapeCalgary,
  toronto: scrapeToronto,
  kirkland: scrapeKuper,
  edmonton: scrapeEdmonton,
  winnipeg: scrapeWinnipeg,
  ottawa: scrapeOttawa,
  halifax: scrapeHalifax,
  moncton: scrapeMoncton,
  montreal: scrapeMontrealAf,
  "montreal-concordia": scrapeConcordia,
  "montreal-stanislas": scrapeMontrealStanislas,
  "quebec-city": scrapeQuebecStanislas,
};

async function runScraper(cityId: string): Promise<CityCheckResult> {
  const city = getCityById(cityId);
  if (!city) {
    throw new Error(`Unknown city: ${cityId}`);
  }

  const scraper = SCRAPERS[cityId] ?? scrapeGeneric;

  try {
    const result = await scraper(city);
    saveCheck(result);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Check failed";
    const result: CityCheckResult = {
      cityId: city.id,
      cityName: city.name,
      region: city.region,
      organization: city.organization,
      bookingUrl: city.bookingUrl,
      checkedAt: new Date().toISOString(),
      overallStatus: "error",
      sessions: [],
      summary: "Could not reach booking page",
      error,
    };
    saveCheck(result);
    return result;
  }
}

export async function checkAllCities(): Promise<CityCheckResult[]> {
  const results = await Promise.all(CITIES.map((c) => runScraper(c.id)));
  return results;
}

export async function checkCity(cityId: string): Promise<CityCheckResult> {
  return runScraper(cityId);
}
