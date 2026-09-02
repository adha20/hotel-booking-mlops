import {
  BookingRecord,
  Prediction,
  formatStayDate,
  getTravelerProfile,
  hotels,
  initialBookingForm,
  toApiBooking,
} from "@/lib/booking";

export const storageKey = "grand-sumatera-hotel-bookings-v1";
export const defaultDashboardRange = { start: "2026-09-20", end: "2026-09-26" };

export type RiskLevel = "High" | "Medium" | "Low";
export type RiskFilter = "all" | RiskLevel;
export type DashboardRange = typeof defaultDashboardRange;

export const seedBookingRecords = createSeedBookingRecords();

export function readStoredBookings() {
  if (typeof window === "undefined") return seedBookingRecords;

  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) return seedBookingRecords;

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return seedBookingRecords;

    const records = parsed.filter(isBookingRecord) as BookingRecord[];
    return records.length ? records : seedBookingRecords;
  } catch {
    return seedBookingRecords;
  }
}

export function saveBookingRecords(records: BookingRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

export function createNextBookingId(records: BookingRecord[]) {
  const highest = records.reduce((max, record) => {
    const number = Number(record.id.replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 10292);

  return `BK-${highest + 1}`;
}

export function getRiskLevel(record: BookingRecord): RiskLevel {
  const normalized = record.prediction.risk_level.toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";

  if (record.prediction.cancellation_probability >= 0.7) return "High";
  if (record.prediction.cancellation_probability >= 0.4) return "Medium";
  return "Low";
}

export function countRiskLevels(records: BookingRecord[]): Record<RiskLevel, number> {
  return records.reduce<Record<RiskLevel, number>>(
    (counts, record) => {
      counts[getRiskLevel(record)] += 1;
      return counts;
    },
    { High: 0, Medium: 0, Low: 0 },
  );
}

export function computeRiskFactors(records: BookingRecord[]) {
  const denominator = Math.max(records.length, 1);
  const apiBookings = records.map((record) => toApiBooking(record.booking, record.hotel));
  const factors = [
    {
      label: "Lead Time (14+ days)",
      count: apiBookings.filter((booking) => Number(booking.lead_time) >= 14).length,
    },
    {
      label: "Previous Cancellations",
      count: records.filter((record) => getTravelerProfile(record.booking.travelerProfileId).previousCancellations > 0)
        .length,
    },
    {
      label: "Deposit Type (No Deposit)",
      count: apiBookings.filter((booking) => booking.deposit_type === "No Deposit").length,
    },
    {
      label: "Market Segment (OTA)",
      count: apiBookings.filter((booking) => booking.market_segment === "Online TA").length,
    },
    {
      label: "Changes in Booking",
      count: apiBookings.filter((booking) => Number(booking.booking_changes) > 0).length,
    },
  ];

  return factors.map((factor) => ({ ...factor, percent: Math.round((factor.count / denominator) * 1000) / 10 }));
}

export function getRecordRiskFactors(record: BookingRecord) {
  const apiBooking = toApiBooking(record.booking, record.hotel);
  const factors = [
    Number(apiBooking.lead_time) >= 14 ? `Lead time is ${apiBooking.lead_time} days` : "",
    apiBooking.deposit_type === "No Deposit" ? "No deposit payment" : "",
    getTravelerProfile(record.booking.travelerProfileId).previousCancellations > 0
      ? "Customer has previous cancellations"
      : "",
    apiBooking.market_segment === "Online TA" ? "Booked through Online Travel Agent" : "",
    apiBooking.market_segment === "Groups" ? "Group reservation" : "",
    Number(apiBooking.booking_changes) > 0 ? "Guest submitted a special request or change" : "",
  ].filter(Boolean);

  return factors.length ? factors : record.prediction.insights.slice(0, 5);
}

export function buildTrendSeries(range: DashboardRange, records: BookingRecord[]) {
  return enumerateDays(range.start, range.end).map((date) => {
    const dayRecords = records.filter((record) => record.booking.arrivalDate === date);
    const counts = countRiskLevels(dayRecords);

    return {
      label: compactDayLabel(date),
      ...counts,
    };
  });
}

export function trendPoints(values: number[], maxValue: number) {
  return values.map((value, index) => `${trendX(index, values.length)},${trendY(value, maxValue)}`).join(" ");
}

export function trendX(index: number, total: number) {
  if (total <= 1) return 310;
  return 10 + index * (600 / (total - 1));
}

export function trendY(value: number, maxValue: number) {
  return 190 - (value / Math.max(maxValue, 1)) * 162;
}

export function donutBackground(counts: Record<RiskLevel, number>, total: number) {
  if (!total) return "#e5e7eb";

  const low = (counts.Low / total) * 100;
  const medium = (counts.Medium / total) * 100;
  return `conic-gradient(#1ea83b 0 ${low}%, #f5a000 ${low}% ${low + medium}%, #f01822 ${low + medium}% 100%)`;
}

export function isWithinRange(date: string, range: DashboardRange) {
  return date >= range.start && date <= range.end;
}

export function getPreviousRange(range: DashboardRange) {
  const totalDays = Math.max(differenceInDays(range.start, addDaysISO(range.end, 1)), 1);
  const previousEnd = addDaysISO(range.start, -1);
  const previousStart = addDaysISO(previousEnd, -(totalDays - 1));

  return { start: previousStart, end: previousEnd };
}

export function enumerateDays(start: string, end: string) {
  const days: string[] = [];
  const current = parseLocalDate(start);
  const last = parseLocalDate(end);

  while (current.getTime() <= last.getTime()) {
    days.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }

  return days.length ? days : [start];
}

export function addDaysISO(dateString: string, days: number) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function differenceInDays(start: string, end: string) {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

export function getCheckoutDate(dateString: string, nights: number) {
  return formatStayDate(getCheckoutISO(dateString, nights));
}

export function getCheckoutISO(dateString: string, nights: number) {
  return addDaysISO(dateString, Math.max(nights, 1));
}

export function compactDayLabel(dateString: string) {
  return formatStayDate(dateString).replace(" 2026", "");
}

export function formatDateRange(range: DashboardRange) {
  return `${formatStayDate(range.start)} - ${formatStayDate(range.end)}`;
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatShare(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 1000) / 10}%`;
}

export function formatDelta(current: number, previous: number) {
  if (!previous) return current ? "100%" : "0%";
  return `${Math.abs(Math.round(((current - previous) / previous) * 1000) / 10)}%`;
}

export function parseLocalDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isNaN(date.getTime())) return date;
  return new Date("2026-09-20T12:00:00");
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createSeedBookingRecords(): BookingRecord[] {
  const seedData = [
    ["BK-10292", "Sinta Dewi", "sinta", "deluxe-room", "2026-09-21", 5, 2, 1, "pay_at_property", "family", 0.87],
    ["BK-10291", "Rudi Hartono", "rudi", "suite-room", "2026-09-22", 6, 6, 0, "pay_at_property", "group", 0.83],
    ["BK-10290", "Nadia Larasati", "nadia", "suite-room", "2026-09-24", 3, 2, 0, "refundable_deposit", "leisure", 0.57],
    ["BK-10289", "Maya Wicaksono", "maya", "executive-room", "2026-09-25", 2, 1, 0, "refundable_deposit", "business", 0.28],
    ["BK-10288", "Andi Pratama", "andi", "deluxe-room", "2026-09-26", 2, 2, 0, "refundable_deposit", "leisure", 0.24],
    ["BK-10287", "Rudi Hartono", "rudi", "suite-room", "2026-09-20", 6, 6, 0, "pay_at_property", "group", 0.81],
    ["BK-10286", "Sinta Dewi", "sinta", "deluxe-room", "2026-09-23", 5, 2, 1, "pay_at_property", "family", 0.76],
    ["BK-10285", "Nadia Larasati", "nadia", "suite-room", "2026-09-20", 3, 2, 0, "refundable_deposit", "leisure", 0.49],
    ["BK-10284", "Maya Wicaksono", "maya", "executive-room", "2026-09-23", 2, 1, 0, "refundable_deposit", "business", 0.22],
    ["BK-10283", "Andi Pratama", "andi", "deluxe-room", "2026-09-24", 2, 2, 0, "refundable_deposit", "leisure", 0.18],
    ["BK-10282", "Sinta Dewi", "sinta", "deluxe-room", "2026-09-18", 5, 2, 1, "pay_at_property", "family", 0.73],
    ["BK-10281", "Nadia Larasati", "nadia", "suite-room", "2026-09-17", 3, 2, 0, "refundable_deposit", "leisure", 0.45],
  ] as const;

  return seedData.map(
    ([id, guestName, travelerProfileId, hotelId, arrivalDate, nights, adults, children, paymentChoice, visitPurpose, probability], index) => {
      const hotel = hotels.find((item) => item.id === hotelId) ?? hotels[0];
      const profile = getTravelerProfile(travelerProfileId);

      return {
        id,
        createdAt: `2026-08-${String(20 + index).padStart(2, "0")}T09:30:00.000Z`,
        hotel,
        booking: {
          ...initialBookingForm,
          travelerProfileId,
          guestName,
          email: profile.email,
          phone: profile.phone,
          arrivalDate,
          nights,
          rooms: profile.defaultRooms,
          adults,
          children,
          babies: profile.defaultBabies,
          roomPlanId: profile.defaultHotelId === hotel.id ? profile.defaultRoomPlanId : hotel.roomPlans[0].id,
          breakfastIncluded: profile.defaultBreakfastIncluded,
          airportPickup: profile.defaultAirportPickup,
          needParking: profile.defaultNeedParking,
          accessibilityRequest: profile.defaultAccessibilityRequest,
          paymentChoice,
          visitPurpose,
          specialRequestNote: profile.defaultSpecialRequestNote,
        },
        prediction: createPrediction(probability),
        featureCount: 77,
        modelSource: "demo-seed",
      };
    },
  );
}

function createPrediction(probability: number): Prediction {
  const riskLevel = probability >= 0.7 ? "High" : probability >= 0.4 ? "Medium" : "Low";

  return {
    label: probability >= 0.5 ? 1 : 0,
    label_name: probability >= 0.5 ? "canceled" : "not_canceled",
    cancellation_probability: probability,
    confidence: Math.max(probability, 1 - probability),
    risk_level: riskLevel,
    recommended_action:
      riskLevel === "High"
        ? "This booking needs staff follow-up before arrival."
        : riskLevel === "Medium"
          ? "Monitor this booking and send a reminder if needed."
          : "This booking is currently stable.",
    insights:
      riskLevel === "High"
        ? ["Long lead time", "No deposit payment", "Previous cancellation signal"]
        : riskLevel === "Medium"
          ? ["Flexible payment", "Booking change request"]
          : ["Paid booking", "Returning guest profile"],
  };
}

function isBookingRecord(value: unknown): value is BookingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as BookingRecord;
  return Boolean(record.id && record.booking?.guestName && record.hotel?.id && record.prediction);
}
