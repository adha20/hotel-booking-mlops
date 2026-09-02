import { NextResponse } from "next/server";

import { getHotelApiBaseUrl } from "@/lib/server-env";

export async function GET() {
  try {
    const apiBaseUrl = getHotelApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        detail: error instanceof Error ? error.message : "Health service is unavailable.",
      },
      { status: 500 },
    );
  }
}
