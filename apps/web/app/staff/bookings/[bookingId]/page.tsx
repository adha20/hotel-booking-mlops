"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  BookingRecord,
  bookingTotal,
  formatStayDate,
  getRoomPlan,
  getTravelerProfile,
  money,
  paymentLabel,
  purposeLabel,
} from "@/lib/booking";
import { getCheckoutDate, getRecordRiskFactors, getRiskLevel, readStoredBookings, seedBookingRecords } from "@/lib/demo-store";

export default function StaffBookingDetailPage() {
  const params = useParams();
  const bookingIdParam = params.bookingId;
  const bookingId = Array.isArray(bookingIdParam) ? bookingIdParam[0] : bookingIdParam ?? "";
  const [records, setRecords] = useState<BookingRecord[]>(seedBookingRecords);

  useEffect(() => {
    setRecords(readStoredBookings());
  }, []);

  const record = useMemo(() => records.find((item) => item.id === bookingId) ?? null, [bookingId, records]);

  return (
    <main className="staffWorkspace">
      <section className="staffDashboardShell staffDetailShell" aria-label="Booking detail staff view">
        <StaffSidebar />
        <div className="staffDetailMain">
          {!record ? <BookingNotFound bookingId={bookingId} /> : <BookingDetail record={record} />}
        </div>
      </section>
    </main>
  );
}

function BookingNotFound({ bookingId }: { bookingId: string }) {
  return (
    <article className="staffNotFoundCard">
      <Link className="staffBackLink" href="/staff">
        <ArrowLeft size={17} />
        Back to Staff Dashboard
      </Link>
      <h1>Booking not found</h1>
      <p>Booking {bookingId || "selected"} is not available in the current demo data.</p>
    </article>
  );
}

function BookingDetail({ record }: { record: BookingRecord }) {
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  const room = getRoomPlan(record.hotel, record.booking.roomPlanId);
  const profile = getTravelerProfile(record.booking.travelerProfileId);
  const risk = getRiskLevel(record);
  const probability = record.prediction.cancellation_probability;
  const roomSubtotal = bookingTotal(record.booking, record.hotel);
  const addOnsSubtotal = record.addOns?.reduce((total, addOn) => total + addOn.price, 0) ?? 0;
  const taxAndService = record.totalPrice ? Math.max(record.totalPrice - roomSubtotal - addOnsSubtotal, 0) : 0;
  const totalPrice = record.totalPrice ?? roomSubtotal + addOnsSubtotal + taxAndService;
  const checkoutDate = getCheckoutDate(record.booking.arrivalDate, record.booking.nights);
  const actionItems = [
    ["Send confirmation reminder email", "Send Email"],
    ["Offer special promotion", "Create Offer"],
    ["Add to priority follow-up list", "Add to List"],
  ] as const;

  function completeAction(action: string) {
    setCompletedActions((current) => ({ ...current, [action]: true }));
  }

  return (
    <>
      <header className="staffDetailPageHeader">
        <Link className="staffBackLink" href="/staff">
          <ArrowLeft size={17} />
          Back to Bookings
        </Link>
        <strong>Booking ID: {record.id}</strong>
      </header>

      <section className="staffDetailHero">
        <div>
          <span>Booking Detail (Staff View)</span>
          <h1>{record.booking.guestName}</h1>
          <p>
            {record.hotel.name} · {formatStayDate(record.booking.arrivalDate)} - {checkoutDate}
          </p>
        </div>
        <div className={`staffRiskBadge ${risk.toLowerCase()}`}>
          <b>{risk} Risk</b>
          <strong>{Math.round(probability * 100)}%</strong>
        </div>
      </section>

      <div className="staffDetailFullGrid">
        <DetailPanel
          icon={<UserRound size={18} />}
          title="Guest Information"
          rows={[
            ["Name", record.booking.guestName],
            ["Email", record.booking.email],
            ["Phone", record.booking.phone],
            ["Profile", profile.loyaltyTier],
          ]}
        />

        <DetailPanel
          icon={<CalendarDays size={18} />}
          title="Stay Information"
          rows={[
            ["Check-in", formatStayDate(record.booking.arrivalDate)],
            ["Check-out", checkoutDate],
            ["Nights", String(record.booking.nights)],
            ["Guests", `${record.booking.adults} Adults, ${record.booking.children} Children`],
          ]}
        />

        <DetailPanel
          icon={<FileText size={18} />}
          title="Booking Information"
          rows={[
            ["Hotel", record.hotel.name],
            ["Room Type", room.name],
            ["Meal Plan", record.booking.breakfastIncluded ? "Breakfast" : "Room only"],
            ["Deposit Type", paymentLabel(record.booking.paymentChoice)],
            ["Purpose", purposeLabel(record.booking.visitPurpose)],
            ["Booking Date", formatStayDate(record.createdAt.slice(0, 10))],
          ]}
        />

        <section className={`detailPanel cancellationPanel fullRiskPanel ${risk.toLowerCase()}`}>
          <h2>Cancellation Risk</h2>
          <strong>
            {probability.toFixed(2)} <span>({Math.round(probability * 100)}%)</span>
          </strong>
          <b>{risk} Risk</b>
          <p>{record.prediction.recommended_action}</p>
          <div className="detailRiskFactors">
            <h3>Top Risk Factors</h3>
            <ul>
              {getRecordRiskFactors(record).map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="detailPanel staffDetailRoomCard spanTwo">
          <img alt={room.name} src={record.hotel.image} />
          <div>
            <h2>Room Summary</h2>
            <strong>{room.name}</strong>
            <p>{room.description}</p>
            <div className="staffDetailPerks">
              <span>
                <BedDouble size={15} />
                {room.bed}
              </span>
              <span>
                <Users size={15} />
                {room.capacity} guests
              </span>
              <span>
                <ShieldCheck size={15} />
                {record.hotel.facilities[0]}
              </span>
            </div>
          </div>
        </section>

        <section className="detailPanel staffDetailPricePanel spanTwo">
          <h2>Price Summary</h2>
          <PriceRow label={`${room.name} (${record.booking.nights} nights)`} value={money(roomSubtotal)} />
          <PriceRow label="Add-ons & Extras" value={money(addOnsSubtotal)} />
          {taxAndService > 0 ? <PriceRow label="Tax & Service" value={money(taxAndService)} /> : null}
          <PriceRow label="Total Price" value={money(totalPrice)} strong />
        </section>

        <section className="actionPanel staffActionFull spanFull">
          <h2>Action Recommendations</h2>
          {actionItems.map(([text, action]) => (
            <ActionRow
              action={action}
              done={Boolean(completedActions[action])}
              key={action}
              text={text}
              onClick={() => completeAction(action)}
            />
          ))}
        </section>
      </div>
    </>
  );
}

function DetailPanel({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: Array<[string, string]>;
  icon: React.ReactNode;
}) {
  return (
    <section className="detailPanel">
      <h2>
        {icon}
        {title}
      </h2>
      <div className="detailRows">
        {rows.map(([label, value]) => (
          <div className="detailRow" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`priceSummaryRow ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ActionRow({
  text,
  action,
  done,
  onClick,
}: {
  text: string;
  action: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <div className="actionRow">
      <span>{text}</span>
      <button className={done ? "done" : ""} type="button" onClick={onClick}>
        {done ? <Check size={14} /> : action === "Send Email" ? <Mail size={14} /> : <ClipboardCheck size={14} />}
        {done ? "Done" : action}
      </button>
    </div>
  );
}

function StaffSidebar() {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/staff", active: false },
    {
      label: "Grafana",
      icon: Gauge,
      href: process.env.NEXT_PUBLIC_GRAFANA_DASHBOARD_URL?.trim() || "/staff",
      external: Boolean(process.env.NEXT_PUBLIC_GRAFANA_DASHBOARD_URL?.trim()),
      disabled: !process.env.NEXT_PUBLIC_GRAFANA_DASHBOARD_URL?.trim(),
    },
    { label: "Bookings", icon: CalendarDays, href: "/staff", active: true },
    { label: "Risk Monitoring", icon: Gauge, href: "/staff", active: false },
    { label: "Customers", icon: Users, href: "/staff", active: false },
    { label: "Reports", icon: FileText, href: "/staff", active: false },
    { label: "Settings", icon: Settings, href: "/staff", active: false },
  ];

  return (
    <aside className="staffSidebar" aria-label="Staff sidebar">
      <div className="sidebarLogo">
        <Building2 size={48} strokeWidth={1.5} />
        <strong>Grand Sumatera Hotel</strong>
      </div>

      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          const className = `${item.active ? "active" : ""} ${item.disabled ? "disabled" : ""}`;

          if (item.external) {
            return (
              <a className={className} href={item.href} key={item.label} rel="noreferrer" target="_blank">
                <Icon size={24} />
                <span>{item.label}</span>
                <ExternalLink className="navExternalIcon" size={15} />
              </a>
            );
          }

          return (
            <Link
              aria-disabled={item.disabled || undefined}
              className={className}
              href={item.href}
              key={item.label}
              title={item.disabled ? "Set NEXT_PUBLIC_GRAFANA_DASHBOARD_URL" : undefined}
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link className="logoutLink" href="/">
        <LogOut size={24} />
        Back to Website
      </Link>
    </aside>
  );
}
