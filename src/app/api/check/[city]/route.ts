import { NextResponse } from "next/server";
import { checkCity } from "@/lib/scrapers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ city: string }> }
) {
  const { city } = await params;

  try {
    const result = await checkCity(city);
    return NextResponse.json({ result, refreshed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
