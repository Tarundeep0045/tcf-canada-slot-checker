import type { SessionSlot, SlotStatus } from "../types";

const MONTH_PATTERN =
  /(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\.?\s*20\d{2}/gi;

export async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "TCF-Canada-Slot-Checker/1.0 (educational; contact: local)",
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  return response.text();
}

export function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferStatus(text: string): SlotStatus {
  const lower = text.toLowerCase();

  if (
    /sold\s*out|complet|full|no\s+available\s+dates|aucune\s+date|épuisé|epuise/.test(
      lower
    )
  ) {
    return "sold_out";
  }

  if (
    /registration\s+(?:start|open|opens)|inscription|register\s+now|book\s+now|available\s+dates|places?\s+disponibles|inscri/.test(
      lower
    ) &&
    !/sold\s*out|no\s+available/.test(lower)
  ) {
    return "available";
  }

  if (
    /registration\s+start|opens?\s+(?:mid|first|on)|opening\s+soon|bientôt|mid-\w+|first\s+week\s+of/.test(
      lower
    )
  ) {
    return "opening_soon";
  }

  return "unknown";
}

export function extractSessionsFromBlocks(
  text: string,
  blockPattern: RegExp
): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const blocks = text.match(blockPattern) ?? [];

  for (const block of blocks) {
    const monthMatch = block.match(MONTH_PATTERN);
    const label = monthMatch?.[0] ?? block.slice(0, 60).trim();
    const status = inferStatus(block);
    const noteMatch = block.match(
      /registration\s+starts?\s*:?\s*[^|]+|registrations?\s+start[^|]+/i
    );

    sessions.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      status,
      note: noteMatch?.[0]?.trim(),
    });
  }

  return sessions;
}

export function findMonthSessions(text: string): SessionSlot[] {
  const sessions: SessionSlot[] = [];
  const seen = new Set<string>();

  const patterns = [
    /((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2})\s+sessions?/gi,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2})\s+sessions?/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = (match[1] ?? match[0]).trim();
      const key = raw.toLowerCase();
      if (seen.has(key) || raw.length < 4) continue;
      seen.add(key);

      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + raw.length + 120);
      const context = text.slice(start, end);

      sessions.push({
        label: raw.replace(/^session\s*:?\s*/i, "").trim(),
        status: inferStatus(context),
        note: extractNote(context),
      });
    }
  }

  return sessions.slice(0, 8);
}

function extractNote(context: string): string | undefined {
  const note =
    context.match(/registration\s+starts?\s*:?\s*[^.]{5,80}/i)?.[0] ??
    context.match(/registrations?\s+start[^.]{5,80}/i)?.[0] ??
    context.match(/SOLD\s*OUT/i)?.[0];

  return note?.trim();
}

export function overallFromSessions(sessions: SessionSlot[]): SlotStatus {
  if (sessions.length === 0) return "unknown";
  if (sessions.some((s) => s.status === "available")) return "available";
  if (sessions.every((s) => s.status === "sold_out")) return "sold_out";
  if (sessions.some((s) => s.status === "opening_soon")) return "opening_soon";
  if (sessions.some((s) => s.status === "sold_out")) return "sold_out";
  return "unknown";
}

export function buildSummary(
  sessions: SessionSlot[],
  fallback: string
): string {
  if (sessions.length === 0) return fallback;

  const available = sessions.filter((s) => s.status === "available");
  if (available.length > 0) {
    return `${available.length} session(s) may have spots — verify on booking page`;
  }

  const opening = sessions.filter((s) => s.status === "opening_soon");
  if (opening.length > 0) {
    return `Registration opening soon for ${opening.map((s) => s.label).join(", ")}`;
  }

  const soldOut = sessions.filter((s) => s.status === "sold_out");
  if (soldOut.length === sessions.length) {
    return `All listed sessions sold out (${sessions.map((s) => s.label).join(", ")})`;
  }

  return fallback;
}
