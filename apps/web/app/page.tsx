"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { BedDouble, Building2, CalendarDays, Coffee, MapPin, Star, Users, Waves, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { BookingForm, formatStayDate, getRoomPlan, hotels, initialBookingForm, money } from "@/lib/booking";
import { addDaysISO, differenceInDays, getCheckoutISO } from "@/lib/demo-store";

const heroImage = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1800&q=85";

type AppliedSearchFilters = {
  hotelId: string;
  adults: number;
  children: number;
  rooms: number;
};

export default function Home() {
  const router = useRouter();
  const roomsSectionRef = useRef<HTMLElement>(null);
  const [selectedHotelId, setSelectedHotelId] = useState(hotels[0].id);
  const [appliedFilters, setAppliedFilters] = useState<AppliedSearchFilters | null>(null);
  const [form, setForm] = useState<BookingForm>({
    ...initialBookingForm,
    roomPlanId: hotels[0].roomPlans[0].id,
  });

  const selectedHotel = useMemo(
    () => hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0],
    [selectedHotelId],
  );
  const checkoutDate = useMemo(() => getCheckoutISO(form.arrivalDate, form.nights), [form.arrivalDate, form.nights]);
  const visibleHotels = useMemo(() => {
    if (!appliedFilters) return hotels;

    return hotels.filter((hotel) => {
      const room = getRoomPlan(hotel, hotel.roomPlans[0].id);
      const adultCapacity = room.capacity * appliedFilters.rooms;
      const childCapacity = appliedFilters.rooms * 2;
      return hotel.id === appliedFilters.hotelId && adultCapacity >= appliedFilters.adults && childCapacity >= appliedFilters.children;
    });
  }, [appliedFilters]);

  function selectHotel(id: string) {
    const hotel = hotels.find((item) => item.id === id) ?? hotels[0];
    setSelectedHotelId(hotel.id);
    setForm((current) => ({ ...current, roomPlanId: hotel.roomPlans[0].id }));
  }

  function setCheckoutDate(value: string) {
    const nights = differenceInDays(form.arrivalDate, value);
    setForm((current) => ({ ...current, nights: Math.max(nights, 1) }));
  }

  function openBooking(roomId = selectedHotel.id) {
    const params = new URLSearchParams({
      room: roomId,
      checkIn: form.arrivalDate,
      checkOut: checkoutDate,
      adults: String(form.adults),
      children: String(form.children),
      rooms: String(form.rooms),
    });

    router.push(`/booking?${params.toString()}`);
  }

  function applySearchFilters() {
    setAppliedFilters({
      hotelId: selectedHotel.id,
      adults: form.adults,
      children: form.children,
      rooms: form.rooms,
    });

    window.requestAnimationFrame(() => {
      roomsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className="hotelShowcase">
      <section className="publicBookingPage" aria-label="Public booking website">
        <div className="publicContent">
          <section className="publicBookingCard">
            <header className="mainNav">
              <a className="brand" href="#home" aria-label="Grand Sumatera Hotel">
                <Building2 size={38} strokeWidth={1.8} />
                <span>Grand Sumatera Hotel</span>
              </a>

              <nav aria-label="Public navigation">
                <a href="#home">Home</a>
                <a href="#rooms">Rooms</a>
                <a href="#facilities">Facilities</a>
                <a href="#about">About Us</a>
              </nav>

              <div className="navActions">
                <Link className="staffAccessButton" href="/staff">
                  Staff Dashboard
                </Link>
                <button className="bookNowButton" type="button" onClick={() => openBooking()}>
                  Book Now
                </button>
              </div>
            </header>

            <section className="heroSection" id="home" style={{ backgroundImage: `url(${heroImage})` }}>
              <div className="heroOverlay" />
              <div className="heroCopy">
                <h1>
                  Experience Comfort
                  <span>Like Never Before</span>
                </h1>
                <p>Book your stay with us and enjoy luxury, comfort, and the best service.</p>
                <button className="heroButton" type="button" onClick={() => openBooking()}>
                  Book Your Stay
                </button>
              </div>
            </section>

            <section className="searchCard" aria-label="Search booking availability">
              <SearchDateField
                label="Check-in"
                value={form.arrivalDate}
                onChange={(value) => setForm((current) => ({ ...current, arrivalDate: value }))}
              />
              <SearchDateField
                label="Check-out"
                min={addDaysISO(form.arrivalDate, 1)}
                value={checkoutDate}
                onChange={setCheckoutDate}
              />

              <label className="bookingSelect">
                <span>Guests & Rooms</span>
                <select
                  value={`${form.adults}-${form.children}-${form.rooms}`}
                  onChange={(event) => {
                    const [adults, children, rooms] = event.target.value.split("-").map(Number);
                    setForm((current) => ({ ...current, adults, children, rooms }));
                  }}
                >
                  <option value="2-0-1">2 Adults, 0 Children, 1 Room</option>
                  <option value="2-1-1">2 Adults, 1 Child, 1 Room</option>
                  <option value="1-0-1">1 Adult, 0 Children, 1 Room</option>
                  <option value="4-2-2">4 Adults, 2 Children, 2 Rooms</option>
                </select>
              </label>

              <label className="bookingSelect">
                <span>Hotel</span>
                <select value={selectedHotelId} onChange={(event) => selectHotel(event.target.value)}>
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </label>

              <button className="searchButton" type="button" onClick={applySearchFilters}>
                Search
              </button>
            </section>

            <section className="roomsSection" id="rooms" ref={roomsSectionRef}>
              <div className="roomsIntro">
                <h2>Our Hotels</h2>
                <p>Choose the perfect hotel for your stay</p>
              </div>

              <div className="roomGrid">
                {visibleHotels.map((hotel) => {
                  const room = getRoomPlan(hotel, hotel.roomPlans[0].id);
                  return (
                    <article
                      className="roomCard"
                      key={hotel.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openBooking(hotel.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openBooking(hotel.id);
                        }
                      }}
                    >
                      <button
                        className="roomImageButton"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openBooking(hotel.id);
                        }}
                        aria-label={`Book ${hotel.name}`}
                      >
                        <img src={hotel.image} alt={hotel.name} />
                      </button>
                      <div className="roomInfo">
                        <div className="roomTitleRow">
                          <div className="roomTitleText">
                            <h3>{hotel.name}</h3>
                            <p>
                              <MapPin size={14} />
                              {hotel.location}
                            </p>
                            <span>{room.name}</span>
                          </div>
                          <strong>
                            {money(room.price)}
                            <span>/night</span>
                          </strong>
                        </div>
                        <div className="hotelSpecs">
                          <span>
                            <Star size={14} />
                            {hotel.rating} rating
                          </span>
                          <span>
                            <Users size={16} />
                            {room.capacity} Guests
                          </span>
                          <span>
                            <BedDouble size={16} />
                            {room.bed}
                          </span>
                          {hotel.facilities.map((facility) => (
                            <span key={facility}>
                              <FacilityIcon name={facility} />
                              {facility}
                            </span>
                          ))}
                        </div>
                        <button
                          className="detailsButton"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openBooking(hotel.id);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!visibleHotels.length ? (
                <div className="noHotelResults">
                  <strong>No matching hotel found</strong>
                  <p>Try fewer adults per room or choose another hotel.</p>
                </div>
              ) : null}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}

function FacilityIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase();
  if (normalized.includes("wi-fi")) return <Wifi size={14} />;
  if (normalized.includes("pool")) return <Waves size={14} />;
  if (normalized.includes("breakfast") || normalized.includes("lounge")) return <Coffee size={14} />;
  return <Building2 size={14} />;
}

function SearchDateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
      return;
    }

    inputRef.current?.focus();
  }

  return (
    <label className="searchBox searchDateBox">
      <span>{label}</span>
      <strong className="datePickerShell" onClick={openPicker}>
        <button
          className="datePickerButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
        >
          {formatStayDate(value)}
        </button>
        <input ref={inputRef} aria-label={label} min={min} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
        <CalendarDays size={18} />
      </strong>
    </label>
  );
}
