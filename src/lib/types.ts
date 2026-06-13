export type SlotStatus =
  | "available"
  | "sold_out"
  | "opening_soon"
  | "not_listed"
  | "unknown"
  | "error";

export interface SessionSlot {
  label: string;
  status: SlotStatus;
  note?: string;
}

export interface CityConfig {
  id: string;
  name: string;
  region: string;
  organization?: string;
  bookingUrl: string;
  locations?: string[];
}

export interface CityCheckResult {
  cityId: string;
  cityName: string;
  region: string;
  organization?: string;
  bookingUrl: string;
  checkedAt: string;
  overallStatus: SlotStatus;
  sessions: SessionSlot[];
  summary: string;
  error?: string;
}
