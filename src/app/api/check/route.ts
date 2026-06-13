import { NextResponse } from "next/server";
import { checkAllCities } from "@/lib/scrapers";
import { getLatestChecks } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "true";

  try {
    const results = refresh ? await checkAllCities() : getLatestChecks();

    if (!refresh && results.length === 0) {
      const fresh = await checkAllCities();
      return NextResponse.json({ results: fresh, refreshed: true });
    }

    return NextResponse.json({ results, refreshed: refresh });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const results = await checkAllCities();
    return NextResponse.json({ results, refreshed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
