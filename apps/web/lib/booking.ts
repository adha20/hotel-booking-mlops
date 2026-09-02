export type RoomPlan = {
  id: string;
  name: string;
  description: string;
  roomType: string;
  bed: string;
  capacity: number;
  price: number;
  perks: string[];
  cancellationPolicy: "free_cancel" | "pay_now" | "deposit";
};

export type Hotel = {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  roomType: string;
  marketSegment: string;
  distributionChannel: string;
  image: string;
  highlights: string[];
  facilities: string[];
  roomPlans: RoomPlan[];
};

export type VisitPurpose = "leisure" | "business" | "family" | "group";
export type PaymentChoice = "pay_at_property" | "pay_now" | "refundable_deposit";

export type TravelerProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  loyaltyTier: string;
  previousCancellations: number;
  previousBookingsNotCanceled: number;
  defaultPurpose: VisitPurpose;
};

export type BookingForm = {
  travelerProfileId: string;
  guestName: string;
  email: string;
  phone: string;
  arrivalDate: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  babies: number;
  roomPlanId: string;
  breakfastIncluded: boolean;
  airportPickup: boolean;
  needParking: boolean;
  accessibilityRequest: boolean;
  visitPurpose: VisitPurpose;
  paymentChoice: PaymentChoice;
  specialRequestNote: string;
  promoCode: string;
};

export type Prediction = {
  label: number;
  label_name: "canceled" | "not_canceled" | string;
  cancellation_probability: number;
  confidence: number;
  risk_level: "Low" | "Medium" | "High" | string;
  recommended_action: string;
  insights: string[];
};

export type PredictionResponse = {
  predictions: Prediction[];
  model_source: string;
  feature_count: number;
};

export type BookingRecord = {
  id: string;
  createdAt: string;
  hotel: Hotel;
  booking: BookingForm;
  prediction: Prediction;
  featureCount: number;
  modelSource: string;
  addOns?: BookingAddOn[];
  totalPrice?: number;
};

export type HealthResponse = {
  status: string;
  model_loaded: boolean;
  feature_count: number;
  model_source: string;
  system_metrics_available: boolean;
};

export type BookingAddOn = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export const travelerProfiles: TravelerProfile[] = [
  {
    id: "andi",
    fullName: "Andi Pratama",
    email: "andi.pratama@email.com",
    phone: "0812-3456-7890",
    country: "PRT",
    loyaltyTier: "Gold member",
    previousCancellations: 0,
    previousBookingsNotCanceled: 5,
    defaultPurpose: "leisure",
  },
  {
    id: "sinta",
    fullName: "Sinta Dewi",
    email: "sinta.dewi@email.com",
    phone: "0813-7788-9012",
    country: "PRT",
    loyaltyTier: "New traveler",
    previousCancellations: 1,
    previousBookingsNotCanceled: 0,
    defaultPurpose: "family",
  },
  {
    id: "maya",
    fullName: "Maya Wicaksono",
    email: "maya.wicaksono@email.com",
    phone: "0811-9087-2211",
    country: "GBR",
    loyaltyTier: "Corporate account",
    previousCancellations: 0,
    previousBookingsNotCanceled: 12,
    defaultPurpose: "business",
  },
];

export const hotels: Hotel[] = [
  {
    id: "deluxe-room",
    name: "Grand Sumatera City View",
    type: "City Hotel",
    location: "Medan City Center",
    rating: 4.8,
    reviews: 1248,
    price: 85,
    roomType: "A",
    marketSegment: "Online TA",
    distributionChannel: "TA/TO",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80",
    highlights: ["City view", "King bed", "Breakfast"],
    facilities: ["Free Wi-Fi", "Pool access", "Breakfast", "City view"],
    roomPlans: [
      {
        id: "deluxe-breakfast",
        name: "Deluxe Room",
        description: "Comfortable room with city view, breakfast option, and modern amenities.",
        roomType: "A",
        bed: "1 king bed",
        capacity: 2,
        price: 85,
        perks: ["2 Guests", "1 Bed", "Breakfast"],
        cancellationPolicy: "free_cancel",
      },
      {
        id: "deluxe-flex",
        name: "Premium Deluxe Room",
        description: "Higher floor room with flexible changes and late checkout.",
        roomType: "B",
        bed: "1 king bed",
        capacity: 2,
        price: 110,
        perks: ["Late checkout", "City view", "Breakfast"],
        cancellationPolicy: "free_cancel",
      },
      {
        id: "city-view-suite",
        name: "City View Suite",
        description: "Suite-style stay with extra lounge space, city view, and premium amenities.",
        roomType: "C",
        bed: "1 king bed",
        capacity: 2,
        price: 145,
        perks: ["42 sqm", "City view", "Breakfast"],
        cancellationPolicy: "deposit",
      },
    ],
  },
  {
    id: "executive-room",
    name: "Grand Sumatera Executive",
    type: "City Hotel",
    location: "Business District",
    rating: 4.9,
    reviews: 984,
    price: 125,
    roomType: "D",
    marketSegment: "Direct",
    distributionChannel: "Direct",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Executive lounge", "City skyline", "Premium bedding"],
    facilities: ["Free Wi-Fi", "Pool access", "Executive lounge", "Workspace"],
    roomPlans: [
      {
        id: "executive-breakfast",
        name: "Executive Room",
        description: "Spacious executive room with a desk, premium bedding, and breakfast.",
        roomType: "D",
        bed: "1 king bed",
        capacity: 2,
        price: 125,
        perks: ["2 Guests", "1 Bed", "Breakfast"],
        cancellationPolicy: "free_cancel",
      },
      {
        id: "executive-corner",
        name: "Executive Corner Room",
        description: "Corner room with skyline view and executive lounge access.",
        roomType: "E",
        bed: "1 king bed",
        capacity: 2,
        price: 155,
        perks: ["Lounge", "Skyline view", "Breakfast"],
        cancellationPolicy: "deposit",
      },
      {
        id: "executive-suite",
        name: "Executive Suite",
        description: "Spacious suite with meeting nook, lounge access, and skyline view.",
        roomType: "F",
        bed: "1 king bed",
        capacity: 2,
        price: 185,
        perks: ["45 sqm", "Workspace", "Lounge"],
        cancellationPolicy: "deposit",
      },
    ],
  },
  {
    id: "suite-room",
    name: "Sagara Resort & Spa",
    type: "Resort Hotel",
    location: "Lake Toba View",
    rating: 4.9,
    reviews: 721,
    price: 220,
    roomType: "E",
    marketSegment: "Direct",
    distributionChannel: "Direct",
    image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80",
    highlights: ["Suite living area", "Panoramic view", "Personalized service"],
    facilities: ["Free Wi-Fi", "Infinity pool", "Private lounge", "Breakfast"],
    roomPlans: [
      {
        id: "suite-breakfast",
        name: "Suite Room",
        description: "Large suite with living area, premium amenities, and city panorama.",
        roomType: "E",
        bed: "1 king bed",
        capacity: 2,
        price: 220,
        perks: ["2 Guests", "1 Bed", "Breakfast"],
        cancellationPolicy: "deposit",
      },
      {
        id: "presidential-suite",
        name: "Presidential Suite",
        description: "Flagship suite with lounge access and private arrival handling.",
        roomType: "F",
        bed: "1 king bed",
        capacity: 2,
        price: 285,
        perks: ["Private service", "Lounge", "Breakfast"],
        cancellationPolicy: "pay_now",
      },
      {
        id: "lake-spa-villa",
        name: "Lake Spa Villa",
        description: "Private villa-style stay with spa access, lounge area, and lake panorama.",
        roomType: "G",
        bed: "1 king bed",
        capacity: 2,
        price: 340,
        perks: ["60 sqm", "Spa access", "Lake view"],
        cancellationPolicy: "pay_now",
      },
    ],
  },
];

export const initialBookingForm: BookingForm = {
  travelerProfileId: "andi",
  guestName: "Andi Pratama",
  email: "andi.pratama@email.com",
  phone: "0812-3456-7890",
  arrivalDate: "2026-09-20",
  nights: 3,
  rooms: 1,
  adults: 2,
  children: 0,
  babies: 0,
  roomPlanId: "executive-breakfast",
  breakfastIncluded: true,
  airportPickup: false,
  needParking: false,
  accessibilityRequest: false,
  visitPurpose: "leisure",
  paymentChoice: "pay_at_property",
  specialRequestNote: "Late check-in around 10 PM.",
  promoCode: "",
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getTravelerProfile(id: string) {
  return travelerProfiles.find((profile) => profile.id === id) ?? travelerProfiles[0];
}

export function getRoomPlan(hotel: Hotel, roomPlanId: string) {
  const fallbackRooms = hotels.find((item) => item.id === hotel.id)?.roomPlans ?? hotels[0].roomPlans;
  const roomPlans = hotel.roomPlans?.length ? hotel.roomPlans : fallbackRooms;

  return roomPlans.find((plan) => plan.id === roomPlanId) ?? roomPlans[0];
}

export function toApiBooking(form: BookingForm, hotel: Hotel) {
  const arrival = new Date(`${form.arrivalDate}T12:00:00`);
  const hasValidArrival = !Number.isNaN(arrival.getTime());
  const profile = getTravelerProfile(form.travelerProfileId);
  const roomPlan = getRoomPlan(hotel, form.roomPlanId);
  const nights = Math.max(Number(form.nights) || 1, 1);
  const rooms = Math.max(Number(form.rooms) || 1, 1);
  const adults = Math.max(Number(form.adults) || 1, 1);
  const children = Math.max(Number(form.children) || 0, 0);
  const babies = Math.max(Number(form.babies) || 0, 0);
  const weekendNights = countWeekendNights(form.arrivalDate, nights);
  const marketSegment = deriveMarketSegment(form, hotel);

  return {
    hotel: hotel.type,
    lead_time: deriveLeadTime(form.arrivalDate),
    arrival_date_year: hasValidArrival ? arrival.getFullYear() : 2026,
    arrival_date_month: hasValidArrival ? monthNames[arrival.getMonth()] : "September",
    arrival_date_week_number: weekNumber(arrival),
    arrival_date_day_of_month: hasValidArrival ? arrival.getDate() : 20,
    stays_in_weekend_nights: weekendNights,
    stays_in_week_nights: Math.max(nights - weekendNights, 0),
    adults,
    children,
    babies,
    meal: form.breakfastIncluded ? "BB" : "SC",
    country: profile.country,
    market_segment: marketSegment,
    distribution_channel: marketSegment === "Direct" ? "Direct" : "TA/TO",
    is_repeated_guest: profile.previousBookingsNotCanceled > 0 ? 1 : 0,
    previous_cancellations: profile.previousCancellations,
    previous_bookings_not_canceled: profile.previousBookingsNotCanceled,
    reserved_room_type: roomPlan.roomType,
    booking_changes: form.accessibilityRequest || form.specialRequestNote.trim() ? 1 : 0,
    deposit_type: paymentToDeposit(form.paymentChoice),
    agent: marketSegment === "Direct" ? 0 : 9,
    company: marketSegment === "Corporate" ? 40 : 0,
    days_in_waiting_list: form.paymentChoice === "refundable_deposit" ? 1 : 0,
    customer_type: deriveCustomerType(form),
    adr: roomPlan.price * rooms,
    required_car_parking_spaces: form.needParking ? rooms : 0,
    total_of_special_requests: countSpecialRequests(form),
  };
}

export function bookingTotal(form: BookingForm, hotel: Hotel) {
  const roomPlan = getRoomPlan(hotel, form.roomPlanId);
  const nights = Math.max(Number(form.nights) || 1, 1);
  const rooms = Math.max(Number(form.rooms) || 1, 1);

  return roomPlan.price * nights * rooms;
}

export function probabilityPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

export function money(value: number) {
  return `IDR ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value * 10000)}`;
}

export function riskTone(level: string) {
  const normalized = level.toLowerCase();
  if (normalized === "high") return "riskHigh";
  if (normalized === "medium") return "riskMedium";
  return "riskLow";
}

export function labelText(labelName: string) {
  return labelName === "canceled" ? "Likely to cancel" : "Likely to stay";
}

export function purposeLabel(purpose: VisitPurpose) {
  const labels: Record<VisitPurpose, string> = {
    leisure: "Vacation",
    business: "Business trip",
    family: "Family trip",
    group: "Group trip",
  };

  return labels[purpose];
}

export function paymentLabel(choice: PaymentChoice) {
  const labels: Record<PaymentChoice, string> = {
    pay_at_property: "No Deposit",
    pay_now: "Pay Now",
    refundable_deposit: "Refundable Deposit",
  };

  return labels[choice];
}

export function formatStayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${shortMonths[date.getMonth()]} ${date.getFullYear()}`;
}

function deriveLeadTime(dateString: string) {
  const arrival = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(arrival.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(Math.ceil((arrival.getTime() - today.getTime()) / 86400000), 0);
}

function deriveMarketSegment(form: BookingForm, hotel: Hotel) {
  const guestCount = form.adults + form.children + form.babies;

  if (form.visitPurpose === "business") return "Corporate";
  if (form.visitPurpose === "group" || form.rooms >= 3 || guestCount >= 6) return "Groups";
  return hotel.marketSegment;
}

function deriveCustomerType(form: BookingForm) {
  const guestCount = form.adults + form.children + form.babies;

  if (form.visitPurpose === "group" || form.rooms >= 3 || guestCount >= 6) return "Group";
  if (form.visitPurpose === "business") return "Contract";
  if (form.children > 0 || form.babies > 0) return "Transient-Party";
  return "Transient";
}

function paymentToDeposit(choice: PaymentChoice) {
  if (choice === "pay_now") return "Non Refund";
  if (choice === "refundable_deposit") return "Refundable";
  return "No Deposit";
}

function countSpecialRequests(form: BookingForm) {
  const requestCount = [
    form.breakfastIncluded,
    form.airportPickup,
    form.needParking,
    form.accessibilityRequest,
    Boolean(form.specialRequestNote.trim()),
  ].filter(Boolean).length;

  return Math.min(requestCount, 5);
}

function countWeekendNights(dateString: string, nights: number) {
  const startDate = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(startDate.getTime())) return Math.min(nights, 1);

  let weekendNights = 0;
  for (let index = 0; index < nights; index += 1) {
    const stayDate = new Date(startDate);
    stayDate.setDate(startDate.getDate() + index);
    const day = stayDate.getDay();
    if (day === 0 || day === 6) weekendNights += 1;
  }

  return weekendNights;
}

function weekNumber(date: Date) {
  if (Number.isNaN(date.getTime())) return 38;
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  return Math.ceil((dayOffset + firstDay.getDay() + 1) / 7);
}
