"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  Check,
  Clock,
  Coffee,
  Heart,
  Info,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  SquarePen,
  User,
  Users,
  Wifi,
} from "lucide-react";
import {
  BookingAddOn,
  BookingForm,
  BookingRecord,
  Hotel,
  PredictionResponse,
  RoomPlan,
  bookingTotal,
  formatStayDate,
  getRoomPlan,
  hotels,
  initialBookingForm,
  money,
  toApiBooking,
} from "@/lib/booking";
import {
  addDaysISO,
  createNextBookingId,
  differenceInDays,
  getCheckoutDate,
  getCheckoutISO,
  readStoredBookings,
  saveBookingRecords,
} from "@/lib/demo-store";

type BookingPageClientProps = {
  initialRoom?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: string;
  initialChildren?: string;
  initialRooms?: string;
};

type WizardStep = 1 | 2 | 3;

const roomImages = [
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=82",
];

const roomSizes = ["28 sqm", "32 sqm", "45 sqm"];

const bookingAddOns: BookingAddOn[] = [
  { id: "airport-pickup", name: "Airport Pickup", description: "One-way airport transfer", price: 15 },
  { id: "extra-bed", name: "Extra Bed", description: "Additional bed for your room", price: 20 },
  { id: "romantic-package", name: "Romantic Package", description: "Flower decoration and cake", price: 30 },
  { id: "late-checkout", name: "Late Check-out", description: "Stay until 2:00 PM", price: 10 },
  { id: "spa-package", name: "Spa Package", description: "Relaxing spa for 2 persons", price: 45 },
  { id: "breakfast-for-two", name: "Breakfast for 2", description: "Daily breakfast for 2 persons", price: 12 },
];

export default function BookingPageClient({
  initialRoom,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
  initialRooms,
}: BookingPageClientProps) {
  const initialHotel = getInitialHotel(initialRoom);
  const checkIn = isISODate(initialCheckIn) ? initialCheckIn : initialBookingForm.arrivalDate;
  const nights = initialCheckOut && isISODate(initialCheckOut) ? Math.max(differenceInDays(checkIn, initialCheckOut), 1) : 3;
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedHotelId, setSelectedHotelId] = useState(initialHotel.id);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>(["airport-pickup"]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [form, setForm] = useState<BookingForm>({
    ...initialBookingForm,
    airportPickup: true,
    arrivalDate: checkIn,
    nights,
    rooms: clampNumber(initialRooms, 1, 4, initialBookingForm.rooms),
    adults: clampNumber(initialAdults, 1, 4, initialBookingForm.adults),
    children: clampNumber(initialChildren, 0, 3, initialBookingForm.children),
    roomPlanId: initialHotel.roomPlans[0].id,
  });
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("");

  const selectedHotel = useMemo(
    () => hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0],
    [selectedHotelId],
  );
  const selectedRoom = useMemo(() => getRoomPlan(selectedHotel, form.roomPlanId), [form.roomPlanId, selectedHotel]);
  const checkoutDate = useMemo(() => getCheckoutISO(form.arrivalDate, form.nights), [form.arrivalDate, form.nights]);
  const selectedAddOns = useMemo(
    () => bookingAddOns.filter((addOn) => selectedAddOnIds.includes(addOn.id)),
    [selectedAddOnIds],
  );
  const roomSubtotal = bookingTotal(form, selectedHotel);
  const addOnsSubtotal = selectedAddOns.reduce((total, addOn) => total + addOn.price, 0);
  const taxAndService = Math.round((roomSubtotal + addOnsSubtotal) * 0.1);
  const grandTotal = roomSubtotal + addOnsSubtotal + taxAndService;

  function selectRoom(roomPlanId: string) {
    setForm((current) => ({ ...current, roomPlanId }));
  }

  function setCheckoutDate(value: string) {
    const nextNights = differenceInDays(form.arrivalDate, value);
    setForm((current) => ({ ...current, nights: Math.max(nextNights, 1) }));
  }

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      setForm((booking) => ({
        ...booking,
        airportPickup: next.includes("airport-pickup"),
        breakfastIncluded: next.includes("breakfast-for-two") || booking.breakfastIncluded,
      }));
      return next;
    });
  }

  function continueToRoomSelection() {
    if (!form.guestName.trim() || !form.email.trim() || !form.phone.trim()) {
      setStatusText("Please complete your guest information first.");
      return;
    }

    if (!acceptedTerms) {
      setStatusText("Please agree to the terms and conditions before continuing.");
      return;
    }

    setStatusText("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueToConfirmation() {
    setStatusText("");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitBooking() {
    if (!acceptedTerms) {
      setStatusText("Please agree to the terms and conditions before confirming.");
      return;
    }

    setIsSubmitting(true);
    setStatusText("");

    const bookingForRecord: BookingForm = {
      ...form,
      airportPickup: selectedAddOnIds.includes("airport-pickup"),
      breakfastIncluded: selectedAddOnIds.includes("breakfast-for-two") || form.breakfastIncluded,
    };

    try {
      const response = await fetch("/api/predict-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: toApiBooking(bookingForRecord, selectedHotel) }),
      });
      const payload = (await response.json()) as PredictionResponse | { detail?: string };

      if (!response.ok || !("predictions" in payload)) {
        throw new Error("detail" in payload ? payload.detail : "Prediction request failed.");
      }

      const prediction = payload.predictions[0];
      if (!prediction) throw new Error("Prediction response is empty.");

      const existingRecords = readStoredBookings();
      const record: BookingRecord = {
        id: createNextBookingId(existingRecords),
        createdAt: new Date().toISOString(),
        hotel: selectedHotel,
        booking: bookingForRecord,
        prediction,
        featureCount: payload.feature_count,
        modelSource: payload.model_source,
        addOns: selectedAddOns,
        totalPrice: grandTotal,
      };

      saveBookingRecords([record, ...existingRecords]);
      setConfirmedBooking(record);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Prediction service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmedBooking) {
    return <CustomerConfirmation record={confirmedBooking} />;
  }

  return (
    <main className="bookingWizardPage">
      <header className="bookingTopNav">
        <Link className="brand darkBrand" href="/" aria-label="Grand Sumatera Hotel">
          <Building2 size={34} strokeWidth={1.8} />
          <span>Grand Sumatera Hotel</span>
        </Link>
        <Link className="staffLinkButton" href="/">
          Back to Hotels
        </Link>
      </header>

      <BookingStepper step={step} />

      {step === 1 ? (
        <StepGuestStay
          acceptedTerms={acceptedTerms}
          checkoutDate={checkoutDate}
          form={form}
          grandTotal={grandTotal}
          onAcceptTerms={setAcceptedTerms}
          onContinue={continueToRoomSelection}
          onSetCheckoutDate={setCheckoutDate}
          onSetForm={setForm}
          room={selectedRoom}
          selectedHotel={selectedHotel}
          statusText={statusText}
        />
      ) : null}

      {step === 2 ? (
        <StepRoomAddOns
          addOns={bookingAddOns}
          onBack={() => setStep(1)}
          onContinue={continueToConfirmation}
          onSelectRoom={selectRoom}
          onToggleAddOn={toggleAddOn}
          room={selectedRoom}
          selectedAddOnIds={selectedAddOnIds}
          selectedHotel={selectedHotel}
        />
      ) : null}

      {step === 3 ? (
        <StepConfirm
          acceptedTerms={acceptedTerms}
          addOnsSubtotal={addOnsSubtotal}
          form={form}
          grandTotal={grandTotal}
          isSubmitting={isSubmitting}
          onAcceptTerms={setAcceptedTerms}
          onBack={() => setStep(2)}
          onSubmit={submitBooking}
          room={selectedRoom}
          roomSubtotal={roomSubtotal}
          selectedAddOns={selectedAddOns}
          selectedHotel={selectedHotel}
          statusText={statusText}
          taxAndService={taxAndService}
        />
      ) : null}
    </main>
  );
}

function BookingStepper({ step }: { step: WizardStep }) {
  const steps = [
    { number: 1, label: "Guest & Stay Info" },
    { number: 2, label: "Room & Add-ons" },
    { number: 3, label: "Confirmation" },
  ] as const;

  return (
    <ol className="bookingStepper" aria-label="Booking progress">
      {steps.map((item) => (
        <li className={step >= item.number ? "active" : ""} key={item.number}>
          <span>{item.number}</span>
          <b>{item.label}</b>
        </li>
      ))}
    </ol>
  );
}

function StepGuestStay({
  acceptedTerms,
  checkoutDate,
  form,
  grandTotal,
  onAcceptTerms,
  onContinue,
  onSetCheckoutDate,
  onSetForm,
  room,
  selectedHotel,
  statusText,
}: {
  acceptedTerms: boolean;
  checkoutDate: string;
  form: BookingForm;
  grandTotal: number;
  onAcceptTerms: (value: boolean) => void;
  onContinue: () => void;
  onSetCheckoutDate: (value: string) => void;
  onSetForm: React.Dispatch<React.SetStateAction<BookingForm>>;
  room: RoomPlan;
  selectedHotel: Hotel;
  statusText: string;
}) {
  return (
    <section className="wizardTwoColumn">
      <article className="wizardPanel guestStayPanel">
        <h2>Guest Information</h2>
        <div className="wizardFormGrid twoColumns">
          <WizardTextField
            label="Full Name"
            onChange={(value) => onSetForm((current) => ({ ...current, guestName: value }))}
            value={form.guestName}
          />
          <WizardTextField
            label="Email"
            onChange={(value) => onSetForm((current) => ({ ...current, email: value }))}
            type="email"
            value={form.email}
          />
          <WizardTextField
            label="Phone Number"
            onChange={(value) => onSetForm((current) => ({ ...current, phone: value }))}
            value={form.phone}
          />
        </div>

        <div className="wizardDivider" />

        <h2>Stay Information</h2>
        <div className="wizardFormGrid stayColumns">
          <BookingDateField
            label="Check-in Date"
            value={form.arrivalDate}
            onChange={(value) => onSetForm((current) => ({ ...current, arrivalDate: value }))}
          />
          <BookingDateField label="Check-out Date" min={addDaysISO(form.arrivalDate, 1)} value={checkoutDate} onChange={onSetCheckoutDate} />
          <WizardSelectField
            label="Adults"
            onChange={(value) => onSetForm((current) => ({ ...current, adults: Number(value) }))}
            options={["1", "2", "3", "4"]}
            value={String(form.adults)}
          />
          <WizardSelectField
            label="Children"
            onChange={(value) => onSetForm((current) => ({ ...current, children: Number(value) }))}
            options={["0", "1", "2", "3"]}
            value={String(form.children)}
          />
        </div>

        <label className="wizardField">
          <span>Special Request (Optional)</span>
          <textarea
            placeholder="e.g. Late check-in, extra bed, etc."
            value={form.specialRequestNote}
            onChange={(event) => onSetForm((current) => ({ ...current, specialRequestNote: event.target.value }))}
          />
        </label>

        <label className="wizardCheckRow">
          <input checked={acceptedTerms} onChange={(event) => onAcceptTerms(event.target.checked)} type="checkbox" />
          <span>I agree to the terms and conditions</span>
        </label>

        <button className="wizardPrimaryButton" type="button" onClick={onContinue}>
          Continue to Room Selection
        </button>
        {statusText ? <p className="wizardStatus">{statusText}</p> : null}
      </article>

      <BookingSummaryCard form={form} grandTotal={grandTotal} room={room} selectedHotel={selectedHotel} />
    </section>
  );
}

function StepRoomAddOns({
  addOns,
  onBack,
  onContinue,
  onSelectRoom,
  onToggleAddOn,
  room,
  selectedAddOnIds,
  selectedHotel,
}: {
  addOns: BookingAddOn[];
  onBack: () => void;
  onContinue: () => void;
  onSelectRoom: (roomPlanId: string) => void;
  onToggleAddOn: (id: string) => void;
  room: RoomPlan;
  selectedAddOnIds: string[];
  selectedHotel: Hotel;
}) {
  return (
    <section className="wizardPanel stepTwoPanel">
      <div className="wizardSectionTitle">
        <h2>Select Room</h2>
        <p>Choose the perfect room for your stay</p>
      </div>

      <div className="roomChoiceGrid">
        {selectedHotel.roomPlans.map((plan, index) => (
          <button className={plan.id === room.id ? "roomChoiceCard selected" : "roomChoiceCard"} key={plan.id} type="button" onClick={() => onSelectRoom(plan.id)}>
            <span className="roomRadio" />
            <img src={roomImages[index % roomImages.length]} alt={plan.name} />
            <strong>{plan.name}</strong>
            <b>
              {money(plan.price)}
              <span>/ night</span>
            </b>
            <RoomSpec icon={<SquarePen size={15} />} text={roomSizes[index % roomSizes.length]} />
            <RoomSpec icon={<Users size={15} />} text={`${plan.capacity} Guests`} />
            <RoomSpec icon={<BedDouble size={15} />} text={plan.bed} />
            <RoomSpec icon={<Coffee size={15} />} text="Breakfast Included" />
            <RoomSpec icon={<Wifi size={15} />} text="Free Wi-Fi" />
            <em>View Details</em>
          </button>
        ))}
      </div>

      <div className="wizardSectionTitle addOnsTitle">
        <h2>Add-ons & Extras</h2>
        <p>Enhance your stay with our additional services</p>
      </div>

      <div className="addOnGrid">
        {addOns.map((addOn) => (
          <button className={selectedAddOnIds.includes(addOn.id) ? "addOnCard selected" : "addOnCard"} key={addOn.id} type="button" onClick={() => onToggleAddOn(addOn.id)}>
            <span className="addOnCheck">{selectedAddOnIds.includes(addOn.id) ? <Check size={14} /> : null}</span>
            <AddOnIcon id={addOn.id} />
            <span>
              <strong>{addOn.name}</strong>
              <small>{addOn.description}</small>
            </span>
            <b>{money(addOn.price)}</b>
          </button>
        ))}
      </div>

      <div className="wizardActionRow">
        <button className="wizardSecondaryButton" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to Previous
        </button>
        <button className="wizardPrimaryButton compact" type="button" onClick={onContinue}>
          Continue to Confirmation
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

function StepConfirm({
  acceptedTerms,
  addOnsSubtotal,
  form,
  grandTotal,
  isSubmitting,
  onAcceptTerms,
  onBack,
  onSubmit,
  room,
  roomSubtotal,
  selectedAddOns,
  selectedHotel,
  statusText,
  taxAndService,
}: {
  acceptedTerms: boolean;
  addOnsSubtotal: number;
  form: BookingForm;
  grandTotal: number;
  isSubmitting: boolean;
  onAcceptTerms: (value: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  room: RoomPlan;
  roomSubtotal: number;
  selectedAddOns: BookingAddOn[];
  selectedHotel: Hotel;
  statusText: string;
  taxAndService: number;
}) {
  return (
    <section className="confirmWizardGrid">
      <div className="confirmMainColumn">
        <div className="wizardSectionTitle">
          <h2>Confirm Your Booking</h2>
          <p>Please review your booking details before confirming</p>
        </div>

        <article className="wizardPanel confirmDetailPanel">
          <h3>Booking Details</h3>
          <IconDetailRow icon={<ShieldCheck size={18} />} label="Booking ID" value="BK-10293" />
          <IconDetailRow icon={<User size={18} />} label="Guest Name" value={form.guestName} />
          <IconDetailRow icon={<Mail size={18} />} label="Email" value={form.email} />
          <IconDetailRow icon={<Phone size={18} />} label="Phone Number" value={form.phone} />
          <IconDetailRow icon={<CalendarDays size={18} />} label="Check-in" value={formatStayDate(form.arrivalDate)} />
          <IconDetailRow icon={<CalendarDays size={18} />} label="Check-out" value={getCheckoutDate(form.arrivalDate, form.nights)} />
          <IconDetailRow icon={<Clock size={18} />} label="Nights" value={String(form.nights)} />
          <IconDetailRow icon={<Users size={18} />} label="Guests" value={`${form.adults} Adults, ${form.children} Children`} />
        </article>

        <article className="wizardPanel pricePanel">
          <h3>Price Summary</h3>
          <PriceRow label={`${room.name} (${form.nights} nights)`} value={money(roomSubtotal)} />
          <PriceRow label="Add-ons & Extras" value={money(addOnsSubtotal)} />
          <PriceRow label="Subtotal" value={money(roomSubtotal + addOnsSubtotal)} border />
          <PriceRow label="Tax & Service (10%)" value={money(taxAndService)} />
          <PriceRow label="Total Price" value={money(grandTotal)} total />
        </article>

        <article className="secureBookingNotice">
          <ShieldCheck size={24} />
          <span>
            <strong>Secure Booking</strong>
            Your payment information is encrypted and secure.
          </span>
        </article>
      </div>

      <aside className="confirmSideColumn">
        <article className="wizardPanel roomMiniSummary">
          <h3>Room Summary</h3>
          <img src={selectedHotel.image} alt={room.name} />
          <h4>{room.name}</h4>
          <strong>
            {money(room.price)}
            <span>/ night</span>
          </strong>
          <SummaryRow label="Check-in" value={formatStayDate(form.arrivalDate)} />
          <SummaryRow label="Check-out" value={getCheckoutDate(form.arrivalDate, form.nights)} />
          <SummaryRow label="Nights" value={String(form.nights)} />
          <SummaryRow label="Guests" value={`${form.adults} Adults, ${form.children} Children`} />
          <SummaryRow label="Hotel" value={selectedHotel.name} />
        </article>

        <article className="wizardPanel addOnMiniSummary">
          <h3>Add-ons & Extras</h3>
          {selectedAddOns.length ? (
            selectedAddOns.map((addOn) => (
              <div className="miniAddOnRow" key={addOn.id}>
                <AddOnIcon id={addOn.id} />
                <span>{addOn.name}</span>
                <b>{money(addOn.price)}</b>
              </div>
            ))
          ) : (
            <p>No add-ons selected</p>
          )}
        </article>

        <article className="riskInfoBox">
          <Info size={24} />
          <p>After you confirm your booking, our system will analyze the cancellation risk automatically.</p>
        </article>

        <label className="wizardCheckRow termsPanel">
          <input checked={acceptedTerms} onChange={(event) => onAcceptTerms(event.target.checked)} type="checkbox" />
          <span>
            I agree to the <a href="#">terms and conditions</a>
          </span>
        </label>

        <button className="confirmBookingButton" type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="spin" size={20} /> : null}
          Confirm Booking
          <LockKeyhole size={18} />
        </button>
        {statusText ? <p className="wizardStatus">{statusText}</p> : null}

        <button className="wizardSecondaryButton fullWidth" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to Previous
        </button>
      </aside>
    </section>
  );
}

function BookingSummaryCard({ form, grandTotal, room, selectedHotel }: { form: BookingForm; grandTotal: number; room: RoomPlan; selectedHotel: Hotel }) {
  return (
    <aside className="wizardPanel bookingSummaryPanel">
      <h2>Your Booking Summary</h2>
      <div className="summaryRoomHero">
        <img src={selectedHotel.image} alt={room.name} />
        <div>
          <h3>{room.name}</h3>
          <strong>
            {money(room.price)}
            <span>/ night</span>
          </strong>
          <p>{selectedHotel.name}</p>
        </div>
      </div>

      <div className="summaryRows">
        <SummaryRow label="Check-in" value={formatStayDate(form.arrivalDate)} />
        <SummaryRow label="Check-out" value={getCheckoutDate(form.arrivalDate, form.nights)} />
        <SummaryRow label="Nights" value={String(form.nights)} />
        <SummaryRow label="Guests" value={`${form.adults} Adults, ${form.children} Children`} />
        <SummaryRow label="Rooms" value={String(form.rooms)} />
        <SummaryRow label="Room Type" value={room.name} />
        <SummaryRow label="Total Price" value={money(grandTotal)} strong />
      </div>

      <article className="riskInfoBox">
        <Info size={26} />
        <p>After you confirm your booking, our system will analyze the cancellation risk automatically.</p>
      </article>
    </aside>
  );
}

function CustomerConfirmation({ record }: { record: BookingRecord }) {
  const room = getRoomPlan(record.hotel, record.booking.roomPlanId);
  const totalPrice = record.totalPrice ?? bookingTotal(record.booking, record.hotel);

  return (
    <main className="bookingWizardPage">
      <header className="bookingTopNav">
        <Link className="brand darkBrand" href="/" aria-label="Grand Sumatera Hotel">
          <Building2 size={34} strokeWidth={1.8} />
          <span>Grand Sumatera Hotel</span>
        </Link>
        <Link className="staffLinkButton" href="/">
          Back to Hotels
        </Link>
      </header>

      <section className="customerConfirmationSection" id="booking-confirmation" aria-label="Booking confirmation customer view">
        <article className="customerConfirmationCard">
          <div className="confirmationCheck" aria-hidden="true">
            <Check size={92} strokeWidth={3.2} />
          </div>

          <div className="confirmationCopy">
            <h2>Booking Confirmed!</h2>
            <p>Thank you, {record.booking.guestName}. Your booking has been confirmed.</p>
          </div>

          <div className="confirmationPanel">
            <span>Booking ID</span>
            <strong>{record.id}</strong>
            <div className="confirmationRows">
              <ConfirmationRow label="Check-in Date" value={formatStayDate(record.booking.arrivalDate)} />
              <ConfirmationRow label="Check-out Date" value={getCheckoutDate(record.booking.arrivalDate, record.booking.nights)} />
              <ConfirmationRow label="Hotel" value={record.hotel.name} />
              <ConfirmationRow label="Room Type" value={room.name} />
              <ConfirmationRow label="Guests" value={`${record.booking.adults} Adults, ${record.booking.children} Children`} />
              <ConfirmationRow label="Total Price" value={money(totalPrice)} strong />
            </div>
          </div>

          <p className="emailNotice">
            A confirmation email has been sent to <strong>{record.booking.email}</strong>
          </p>

          <div className="confirmationActions">
            <Link className="homeButton" href="/">
              Go to Home
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

function WizardTextField({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="wizardField">
      <span>{label}</span>
      <input required type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function WizardSelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="wizardField wizardSelectField">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function BookingDateField({ label, min, onChange, value }: { label: string; min?: string; onChange: (value: string) => void; value: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
      return;
    }

    inputRef.current?.focus();
  }

  return (
    <label className="wizardField wizardDateField">
      <span>{label}</span>
      <button className="wizardDateButton" type="button" onClick={openPicker}>
        {formatStayDate(value)}
        <CalendarDays size={18} />
      </button>
      <input ref={inputRef} aria-label={label} className="wizardNativeDate" min={min} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "summaryRow strong" : "summaryRow"}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function PriceRow({ border = false, label, total = false, value }: { border?: boolean; label: string; total?: boolean; value: string }) {
  return (
    <div className={["priceRow", border ? "bordered" : "", total ? "total" : ""].filter(Boolean).join(" ")}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function IconDetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="iconDetailRow">
      {icon}
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function RoomSpec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="roomSpec">
      {icon}
      {text}
    </span>
  );
}

function AddOnIcon({ id }: { id: string }) {
  if (id === "airport-pickup") return <Car size={34} />;
  if (id === "extra-bed") return <BedDouble size={34} />;
  if (id === "romantic-package") return <Heart size={34} />;
  if (id === "late-checkout") return <Clock size={34} />;
  if (id === "spa-package") return <Sparkles size={34} />;
  return <Coffee size={34} />;
}

function ConfirmationRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="confirmationRow">
      <span>{label}</span>
      {strong ? <strong>{value}</strong> : <b>{value}</b>}
    </div>
  );
}

function getInitialHotel(roomId?: string) {
  return hotels.find((hotel) => hotel.id === roomId) ?? hotels[0];
}

function isISODate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function clampNumber(value: string | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
