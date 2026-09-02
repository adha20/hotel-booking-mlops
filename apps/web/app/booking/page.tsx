import BookingPageClient from "./BookingPageClient";

type BookingSearchParams = {
  room?: string | string[];
  checkIn?: string | string[];
  checkOut?: string | string[];
  adults?: string | string[];
  children?: string | string[];
  rooms?: string | string[];
};

export default async function BookingPage({ searchParams }: { searchParams: Promise<BookingSearchParams> }) {
  const params = await searchParams;

  return (
    <BookingPageClient
      initialAdults={firstParam(params.adults)}
      initialCheckIn={firstParam(params.checkIn)}
      initialCheckOut={firstParam(params.checkOut)}
      initialChildren={firstParam(params.children)}
      initialRoom={firstParam(params.room)}
      initialRooms={firstParam(params.rooms)}
    />
  );
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}
