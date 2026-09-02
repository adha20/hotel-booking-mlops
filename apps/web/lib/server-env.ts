export function getHotelApiBaseUrl() {
  const apiBaseUrl = process.env.HOTEL_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new Error(
      "HOTEL_API_BASE_URL is not configured. Set it in apps/web/.env.local or Vercel Environment Variables.",
    );
  }

  try {
    const parsedUrl = new URL(apiBaseUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("HOTEL_API_BASE_URL must use http or https.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "HOTEL_API_BASE_URL must use http or https.") {
      throw error;
    }

    throw new Error("HOTEL_API_BASE_URL must be a valid absolute URL.");
  }

  return apiBaseUrl.replace(/\/+$/, "");
}
