import { NextResponse } from "next/server";

import { getHotelApiBaseUrl } from "@/lib/server-env";

export async function POST(request: Request) {
  try {
    const apiBaseUrl = getHotelApiBaseUrl();
    const body = await request.json();
    const response = await fetch(`${apiBaseUrl}/predict-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Prediction service is unavailable.",
      },
      { status: 500 },
    );
  }
}
