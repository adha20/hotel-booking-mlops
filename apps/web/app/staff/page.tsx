"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarDays,
  ChevronDown,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { BookingRecord, formatStayDate } from "@/lib/booking";
import {
  DashboardRange,
  RiskFilter,
  RiskLevel,
  buildTrendSeries,
  computeRiskFactors,
  countRiskLevels,
  defaultDashboardRange,
  formatDateRange,
  formatDelta,
  formatInteger,
  formatShare,
  getPreviousRange,
  getRecordRiskFactors,
  getRiskLevel,
  isWithinRange,
  readStoredBookings,
  saveBookingRecords,
  seedBookingRecords,
  trendPoints,
  trendX,
  trendY,
} from "@/lib/demo-store";

const riskLevels: RiskLevel[] = ["High", "Medium", "Low"];
const riskMeta: Record<
  RiskLevel,
  {
    label: string;
    tone: "red" | "orange" | "green";
    dotClass: "dotHigh" | "dotMedium" | "dotLow";
    lineClass: "lineHigh" | "lineMedium" | "lineLow";
    insight: string;
  }
> = {
  High: {
    label: "High Risk",
    tone: "red",
    dotClass: "dotHigh",
    lineClass: "lineHigh",
    insight: "Needs priority follow-up before arrival.",
  },
  Medium: {
    label: "Medium Risk",
    tone: "orange",
    dotClass: "dotMedium",
    lineClass: "lineMedium",
    insight: "Worth monitoring with a reminder or small incentive.",
  },
  Low: {
    label: "Low Risk",
    tone: "green",
    dotClass: "dotLow",
    lineClass: "lineLow",
    insight: "Looks stable for normal confirmation flow.",
  },
};

export default function StaffPage() {
  const [bookingRecords, setBookingRecords] = useState<BookingRecord[]>(seedBookingRecords);
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>(defaultDashboardRange);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  useEffect(() => {
    const records = readStoredBookings();
    setBookingRecords(records);
  }, []);

  function resetDemoData() {
    saveBookingRecords(seedBookingRecords);
    setBookingRecords(seedBookingRecords);
    setRiskFilter("all");
  }

  return (
    <main className="staffWorkspace">
      <StaffDashboard
        dateRange={dashboardRange}
        records={bookingRecords}
        riskFilter={riskFilter}
        onDateRangeChange={setDashboardRange}
        onResetDemoData={resetDemoData}
        onRiskFilterChange={setRiskFilter}
      />
    </main>
  );
}

function StaffDashboard({
  dateRange,
  records,
  riskFilter,
  onDateRangeChange,
  onResetDemoData,
  onRiskFilterChange,
}: {
  dateRange: DashboardRange;
  records: BookingRecord[];
  riskFilter: RiskFilter;
  onDateRangeChange: (range: DashboardRange) => void;
  onResetDemoData: () => void;
  onRiskFilterChange: (filter: RiskFilter) => void;
}) {
  const rangeRecords = useMemo(
    () => records.filter((record) => isWithinRange(record.booking.arrivalDate, dateRange)),
    [records, dateRange],
  );
  const previousRange = useMemo(() => getPreviousRange(dateRange), [dateRange]);
  const previousRecords = useMemo(
    () => records.filter((record) => isWithinRange(record.booking.arrivalDate, previousRange)),
    [records, previousRange],
  );
  const counts = useMemo(() => countRiskLevels(rangeRecords), [rangeRecords]);
  const previousCounts = useMemo(() => countRiskLevels(previousRecords), [previousRecords]);
  const visibleRecords = useMemo(
    () =>
      rangeRecords
        .filter((record) => riskFilter === "all" || getRiskLevel(record) === riskFilter)
        .sort((left, right) => right.prediction.cancellation_probability - left.prediction.cancellation_probability),
    [rangeRecords, riskFilter],
  );
  const trendSeries = useMemo(() => buildTrendSeries(dateRange, rangeRecords), [dateRange, rangeRecords]);
  const factorStats = useMemo(() => computeRiskFactors(rangeRecords), [rangeRecords]);

  return (
    <section className="staffDashboardShell" id="staff-dashboard" aria-label="Staff dashboard overview">
      <StaffSidebar />

      <div className="staffDashboardMain">
        <header className="staffHeader">
          <div>
            <h1>Dashboard Overview</h1>
            <p>Real-time overview of bookings and cancellation risk</p>
          </div>
          <div className="staffDateControls" aria-label="Dashboard date range">
            <CalendarDays size={20} />
            <input
              aria-label="Start date"
              type="date"
              value={dateRange.start}
              onChange={(event) => onDateRangeChange({ ...dateRange, start: event.target.value })}
            />
            <span>-</span>
            <input
              aria-label="End date"
              min={dateRange.start}
              type="date"
              value={dateRange.end}
              onChange={(event) => onDateRangeChange({ ...dateRange, end: event.target.value })}
            />
            <ChevronDown size={18} />
          </div>
        </header>

        <div className="staffMetricGrid">
          <MetricCard
            title="Total Bookings"
            value={formatInteger(rangeRecords.length)}
            delta={formatDelta(rangeRecords.length, previousRecords.length)}
            tone="green"
            direction={rangeRecords.length >= previousRecords.length ? "up" : "down"}
          />
          <MetricCard
            title="High Risk Bookings"
            value={formatInteger(counts.High)}
            delta={formatDelta(counts.High, previousCounts.High)}
            tone="red"
            direction={counts.High >= previousCounts.High ? "up" : "down"}
          />
          <MetricCard
            title="Medium Risk"
            value={formatInteger(counts.Medium)}
            delta={formatDelta(counts.Medium, previousCounts.Medium)}
            tone="orange"
            direction={counts.Medium >= previousCounts.Medium ? "up" : "down"}
          />
          <MetricCard
            title="Low Risk Bookings"
            value={formatInteger(counts.Low)}
            delta={formatDelta(counts.Low, previousCounts.Low)}
            tone="green"
            direction={counts.Low >= previousCounts.Low ? "up" : "down"}
          />
        </div>

        <div className="riskFilterBar" aria-label="Risk filter">
          <button className={riskFilter === "all" ? "active" : ""} type="button" onClick={() => onRiskFilterChange("all")}>
            All ({rangeRecords.length})
          </button>
          <button className={riskFilter === "High" ? "active redFilter" : ""} type="button" onClick={() => onRiskFilterChange("High")}>
            High ({counts.High})
          </button>
          <button
            className={riskFilter === "Medium" ? "active orangeFilter" : ""}
            type="button"
            onClick={() => onRiskFilterChange("Medium")}
          >
            Medium ({counts.Medium})
          </button>
          <button className={riskFilter === "Low" ? "active greenFilter" : ""} type="button" onClick={() => onRiskFilterChange("Low")}>
            Low ({counts.Low})
          </button>
          <button className="resetDataButton" type="button" onClick={onResetDemoData}>
            <RefreshCw size={16} />
            Reset Data
          </button>
        </div>

        <div className="staffDashboardGrid">
          <section className="staffPanel riskDistributionPanel">
            <h2>Risk Distribution</h2>
            <RiskDistributionChart counts={counts} total={rangeRecords.length} />
          </section>

          <section className="staffPanel trendPanel">
            <div className="panelTitleRow">
              <h2>Cancellation Risk Trend</h2>
              <div className="chartLegend">
                <span className="legendRed">High Risk</span>
                <span className="legendOrange">Medium Risk</span>
                <span className="legendGreen">Low Risk</span>
              </div>
            </div>
            <TrendChart series={trendSeries} />
          </section>

          <section className="staffPanel recentBookingsPanel">
            <div className="panelTitleRow">
              <h2>Bookings</h2>
              <span className="dateRangeSummary">{formatDateRange(dateRange)}</span>
            </div>
            <div className="staffTableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Guest Name</th>
                    <th>Check-in</th>
                    <th>Probability</th>
                    <th>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => {
                    const risk = getRiskLevel(record);
                    return (
                      <tr key={record.id}>
                        <td>
                          <Link className="bookingLinkButton" href={`/staff/bookings/${record.id}`}>
                            {record.id}
                          </Link>
                        </td>
                        <td>{record.booking.guestName}</td>
                        <td>{formatStayDate(record.booking.arrivalDate)}</td>
                        <td>{record.prediction.cancellation_probability.toFixed(2)}</td>
                        <td>
                          <span className={`riskText ${risk.toLowerCase()}`}>{risk}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!visibleRecords.length ? <p className="emptyTableState">No bookings in this range.</p> : null}
            </div>
          </section>

          <section className="staffPanel factorsPanel">
            <h2>Top Risk Factors (This Range)</h2>
            <div className="factorList">
              {factorStats.map((factor) => (
                <div className="factorRow" key={factor.label}>
                  <span>{factor.label}</span>
                  <div className="factorTrack">
                    <i style={{ width: `${factor.percent}%` }} />
                  </div>
                  <b>{Math.round(factor.percent)}%</b>
                </div>
              ))}
              <div className="factorScale" aria-hidden="true">
                <span>0%</span>
                <span>33%</span>
                <span>66%</span>
                <span>100%</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function StaffSidebar() {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Bookings", icon: CalendarDays },
    { label: "Risk Monitoring", icon: Gauge },
    { label: "Customers", icon: Users },
    { label: "Reports", icon: FileText },
    { label: "Settings", icon: Settings },
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
          return (
            <a className={item.active ? "active" : ""} href="#staff-dashboard" key={item.label}>
              <Icon size={24} />
              {item.label}
            </a>
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

function MetricCard({
  title,
  value,
  delta,
  tone,
  direction,
}: {
  title: string;
  value: string;
  delta: string;
  tone: "green" | "red" | "orange";
  direction: "up" | "down";
}) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <article className="metricCard">
      <span>{title}</span>
      <strong className={`metricValue ${tone}`}>{value}</strong>
      <p className={tone}>
        <Icon size={17} />
        <b>{delta}</b> from previous week
      </p>
    </article>
  );
}

function RiskDistributionChart({ counts, total }: { counts: Record<RiskLevel, number>; total: number }) {
  const [hoveredRisk, setHoveredRisk] = useState<RiskLevel | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ risk: RiskLevel; x: number; y: number } | null>(null);
  const leadingRisk = riskLevels.reduce<RiskLevel>(
    (current, risk) => (counts[risk] > counts[current] ? risk : current),
    "High",
  );
  const activeRisk = hoverTooltip?.risk ?? hoveredRisk ?? selectedRisk ?? leadingRisk;
  const circumference = 2 * Math.PI * 78;
  let accumulated = 0;

  function selectRisk(risk: RiskLevel) {
    setSelectedRisk((current) => (current === risk ? null : risk));
  }

  function moveRiskTooltip(event: MouseEvent<SVGCircleElement>, risk: RiskLevel) {
    const container = event.currentTarget.closest(".riskDistributionBody");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setHoveredRisk(risk);
    setHoverTooltip({
      risk,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function hideRiskTooltip() {
    setHoveredRisk(null);
    setHoverTooltip(null);
  }

  function handleRiskKeyDown(event: KeyboardEvent<SVGCircleElement>, risk: RiskLevel) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectRisk(risk);
  }

  const segments = riskLevels.map((risk) => {
    const share = total ? counts[risk] / total : 0;
    const length = share * circumference;
    const segment = {
      risk,
      length,
      offset: accumulated,
    };
    accumulated += length;
    return segment;
  });

  return (
    <div className="riskDistributionBody">
      <div className="riskDonut" onMouseLeave={hideRiskTooltip}>
        <svg className="riskDonutChart" viewBox="0 0 240 240" role="img" aria-label="Risk distribution donut chart">
          <circle className="riskDonutTrack" cx="120" cy="120" r="78" />
          {segments.map(({ risk, length, offset }) => {
            if (!length) return null;
            const meta = riskMeta[risk];
            const isActive = activeRisk === risk;

            return (
              <circle
                aria-label={`${meta.label}: ${counts[risk]} bookings, ${formatShare(counts[risk], total)}`}
                aria-pressed={selectedRisk === risk}
                className={`riskDonutSegment ${meta.tone} ${isActive ? "active" : ""}`}
                cx="120"
                cy="120"
                key={risk}
                onBlur={hideRiskTooltip}
                onClick={() => selectRisk(risk)}
                onFocus={() => setHoveredRisk(risk)}
                onKeyDown={(event) => handleRiskKeyDown(event, risk)}
                onMouseEnter={(event) => moveRiskTooltip(event, risk)}
                onMouseMove={(event) => moveRiskTooltip(event, risk)}
                r="78"
                role="button"
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
                tabIndex={0}
              />
            );
          })}
        </svg>
        <div className="riskDonutCenter">
          <strong>{formatInteger(total)}</strong>
          <span>Total</span>
        </div>
      </div>
      {hoverTooltip ? (
        <article
          className={`chartHoverTooltip ${riskMeta[hoverTooltip.risk].tone}`}
          style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
        >
          <span>{riskMeta[hoverTooltip.risk].label}</span>
          <strong>{formatInteger(counts[hoverTooltip.risk])} bookings</strong>
          <p>
            {formatShare(counts[hoverTooltip.risk], total)} of selected bookings. {riskMeta[hoverTooltip.risk].insight}
          </p>
        </article>
      ) : null}

      <div className="riskLegendStack" onMouseLeave={() => setHoveredRisk(null)}>
        <div className="riskLegend">
          {riskLevels.map((risk) => (
            <RiskLegendItem
              active={activeRisk === risk}
              key={risk}
              label={riskMeta[risk].label}
              onClick={() => selectRisk(risk)}
              onFocus={() => setHoveredRisk(risk)}
              onMouseEnter={() => setHoveredRisk(risk)}
              tone={riskMeta[risk].tone}
              value={`${counts[risk]} (${formatShare(counts[risk], total)})`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskLegendItem({
  active,
  tone,
  label,
  value,
  onClick,
  onFocus,
  onMouseEnter,
}: {
  active: boolean;
  tone: "green" | "red" | "orange";
  label: string;
  value: string;
  onClick: () => void;
  onFocus: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`riskLegendItem ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
    >
      <span className={`riskDot ${tone}`} />
      <b>{label}</b>
      <strong>{value}</strong>
    </button>
  );
}

type TrendSelection = {
  index: number;
  risk: RiskLevel;
};

function TrendChart({ series }: { series: Array<{ label: string; High: number; Medium: number; Low: number }> }) {
  const [hoveredPoint, setHoveredPoint] = useState<TrendSelection | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TrendSelection | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ point: TrendSelection; x: number; y: number } | null>(null);
  const maxValue = Math.max(1, ...series.flatMap((item) => [item.High, item.Medium, item.Low]));
  const defaultPoint = useMemo<TrendSelection | null>(() => {
    for (let index = series.length - 1; index >= 0; index -= 1) {
      const risk = riskLevels.find((level) => series[index][level] > 0);
      if (risk) return { index, risk };
    }

    return series.length ? { index: series.length - 1, risk: "High" } : null;
  }, [series]);
  const selectedInRange = selectedPoint && series[selectedPoint.index] ? selectedPoint : null;
  const activePoint = hoverTooltip?.point ?? hoveredPoint ?? selectedInRange ?? defaultPoint;
  const tooltipPoint = hoverTooltip?.point ?? null;
  const tooltipTrend = tooltipPoint ? series[tooltipPoint.index] : null;
  const tooltipValue = tooltipTrend && tooltipPoint ? tooltipTrend[tooltipPoint.risk] : 0;
  const tooltipDayTotal = tooltipTrend ? riskLevels.reduce((sum, risk) => sum + tooltipTrend[risk], 0) : 0;

  function selectPoint(point: TrendSelection) {
    setSelectedPoint((current) => (current?.index === point.index && current.risk === point.risk ? null : point));
  }

  function movePointTooltip(event: MouseEvent<SVGGElement>, point: TrendSelection) {
    const container = event.currentTarget.closest(".trendChart");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setHoveredPoint(point);
    setHoverTooltip({
      point,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function hidePointTooltip() {
    setHoveredPoint(null);
    setHoverTooltip(null);
  }

  function handlePointKeyDown(event: KeyboardEvent<SVGGElement>, point: TrendSelection) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectPoint(point);
  }

  return (
    <div className="trendChart" aria-label="Cancellation risk trend chart">
      <div className="trendAxis">
        <span>{maxValue}</span>
        <span>{Math.ceil(maxValue * 0.66)}</span>
        <span>{Math.ceil(maxValue * 0.33)}</span>
        <span>0</span>
      </div>
      <svg viewBox="0 0 620 230" role="img" aria-hidden="true">
        <g className="gridLines">
          <line x1="0" y1="28" x2="620" y2="28" />
          <line x1="0" y1="82" x2="620" y2="82" />
          <line x1="0" y1="136" x2="620" y2="136" />
          <line x1="0" y1="190" x2="620" y2="190" />
        </g>
        <polyline className="lineHigh" points={trendPoints(series.map((item) => item.High), maxValue)} />
        <polyline className="lineMedium" points={trendPoints(series.map((item) => item.Medium), maxValue)} />
        <polyline className="lineLow" points={trendPoints(series.map((item) => item.Low), maxValue)} />
        {series.map((item, index) => {
          const x = trendX(index, series.length);
          return (
            <g key={item.label}>
              {riskLevels.map((risk) => {
                const meta = riskMeta[risk];
                const point = { index, risk };
                const value = item[risk];
                const isActive = activePoint?.index === index && activePoint.risk === risk;

                return (
                  <g
                    aria-label={`${item.label}, ${meta.label}: ${value} bookings`}
                    aria-pressed={selectedPoint?.index === index && selectedPoint.risk === risk}
                    className={`trendPoint ${isActive ? "active" : ""}`}
                    key={risk}
                    onBlur={hidePointTooltip}
                    onClick={() => selectPoint(point)}
                    onFocus={() => setHoveredPoint(point)}
                    onKeyDown={(event) => handlePointKeyDown(event, point)}
                    onMouseEnter={(event) => movePointTooltip(event, point)}
                    onMouseLeave={hidePointTooltip}
                    onMouseMove={(event) => movePointTooltip(event, point)}
                    role="button"
                    tabIndex={0}
                  >
                    <circle className="trendHitArea" cx={x} cy={trendY(value, maxValue)} r="13" />
                    <circle className={meta.dotClass} cx={x} cy={trendY(value, maxValue)} r={isActive ? "6.2" : "4.2"} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="trendLabels">
        {series.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
      {hoverTooltip && tooltipTrend && tooltipPoint ? (
        <article
          className={`chartHoverTooltip trend ${riskMeta[tooltipPoint.risk].tone}`}
          style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
        >
          <span>{tooltipTrend.label}</span>
          <strong>
            {riskMeta[tooltipPoint.risk].label}: {formatInteger(tooltipValue)} booking{tooltipValue === 1 ? "" : "s"}
          </strong>
          <p>
            {formatShare(tooltipValue, tooltipDayTotal)} of {formatInteger(tooltipDayTotal)} bookings that day.
          </p>
          <div className="trendBreakdown">
            {riskLevels.map((risk) => (
              <span key={risk}>
                <i className={`riskDot ${riskMeta[risk].tone}`} />
                {risk}: {tooltipTrend[risk]}
              </span>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}
