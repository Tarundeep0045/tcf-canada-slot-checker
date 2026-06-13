import fs from "fs";
import path from "path";
import { CITIES, getCityById } from "./cities";
import type { CityCheckResult } from "./types";

interface StoredCheck extends CityCheckResult {
  id: number;
}

/** Vercel/serverless only allows writes under /tmp. */
function getChecksFilePath(): string {
  const base =
    process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? path.join("/tmp", "tcf-canada-slot-checker")
      : path.join(process.cwd(), "data");
  return path.join(base, "checks.json");
}

let memoryChecks: StoredCheck[] = [];
let useMemoryOnly = false;
let nextId = 1;

function canUseFilesystem(): boolean {
  if (useMemoryOnly) return false;
  return true;
}

function ensureDataFile(filePath: string): boolean {
  if (useMemoryOnly) return false;

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
    }
    return true;
  } catch {
    useMemoryOnly = true;
    return false;
  }
}

function readChecks(): StoredCheck[] {
  if (useMemoryOnly) return memoryChecks;

  const filePath = getChecksFilePath();
  if (!ensureDataFile(filePath)) return memoryChecks;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const checks = Array.isArray(parsed) ? (parsed as StoredCheck[]) : [];
    nextId = checks.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    return checks;
  } catch {
    return memoryChecks;
  }
}

function writeChecks(checks: StoredCheck[]): void {
  memoryChecks = checks;

  if (!canUseFilesystem()) return;

  const filePath = getChecksFilePath();
  if (!ensureDataFile(filePath)) return;

  try {
    fs.writeFileSync(filePath, JSON.stringify(checks, null, 2), "utf8");
  } catch {
    useMemoryOnly = true;
  }
}

export function saveCheck(result: CityCheckResult): void {
  const checks = readChecks();
  checks.push({ ...result, id: nextId++ });
  writeChecks(checks);
}

function enrichCheck({ id: _id, ...result }: StoredCheck): CityCheckResult {
  const city = CITIES.find((c) => c.id === result.cityId);
  return {
    ...result,
    cityName: city?.name ?? result.cityName,
    region: city?.region ?? result.region,
    organization: city?.organization ?? result.organization,
    bookingUrl: city?.bookingUrl ?? result.bookingUrl,
  };
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
    .map(enrichCheck);
}

export function getHistory(cityId: string, limit = 20): CityCheckResult[] {
  const city = getCityById(cityId);

  return readChecks()
    .filter((c) => c.cityId === cityId)
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
    .slice(0, limit)
    .map((row) => {
      const enriched = enrichCheck(row);
      return {
        ...enriched,
        cityName: city?.name ?? enriched.cityName,
        region: city?.region ?? enriched.region,
        organization: city?.organization ?? enriched.organization,
        bookingUrl: city?.bookingUrl ?? enriched.bookingUrl,
      };
    });
}
