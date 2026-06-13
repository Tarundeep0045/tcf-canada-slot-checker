import fs from "fs";
import path from "path";
import { CITIES, getCityById } from "./cities";
import type { CityCheckResult } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CHECKS_FILE = path.join(DATA_DIR, "checks.json");

interface StoredCheck extends CityCheckResult {
  id: number;
}

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHECKS_FILE)) {
    fs.writeFileSync(CHECKS_FILE, "[]", "utf8");
  }
}

function readChecks(): StoredCheck[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(CHECKS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeChecks(checks: StoredCheck[]): void {
  ensureDataFile();
  fs.writeFileSync(CHECKS_FILE, JSON.stringify(checks, null, 2), "utf8");
}

export function saveCheck(result: CityCheckResult): void {
  const checks = readChecks();
  const nextId = checks.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  checks.push({ ...result, id: nextId });
  writeChecks(checks);
}

export function getLatestChecks(): CityCheckResult[] {
  const checks = readChecks();
  const latestByCity = new Map<string, StoredCheck>();

  for (const check of checks) {
    const existing = latestByCity.get(check.cityId);
    if (!existing || check.checkedAt > existing.checkedAt) {
      latestByCity.set(check.cityId, check);
    }
  }

  return [...latestByCity.values()]
    .sort((a, b) => a.cityId.localeCompare(b.cityId))
    .map(({ id: _id, ...result }) => {
      const city = CITIES.find((c) => c.id === result.cityId);
      return {
        ...result,
        cityName: city?.name ?? result.cityName,
        region: city?.region ?? result.region,
        organization: city?.organization ?? result.organization,
        bookingUrl: city?.bookingUrl ?? result.bookingUrl,
      };
    });
}

export function getHistory(cityId: string, limit = 20): CityCheckResult[] {
  const city = getCityById(cityId);

  return readChecks()
    .filter((c) => c.cityId === cityId)
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
    .slice(0, limit)
    .map(({ id: _id, ...result }) => ({
      ...result,
      cityName: city?.name ?? result.cityName,
      region: city?.region ?? result.region,
      organization: city?.organization ?? result.organization,
      bookingUrl: city?.bookingUrl ?? result.bookingUrl,
    }));
}
