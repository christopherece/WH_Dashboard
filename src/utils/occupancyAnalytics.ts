import { TimeBasedOccupancyRecord } from '../types/berth';

// All figures are berth-days weighted: occupied berth-days ÷ available berth-days × 100.

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_ABBR = MONTH_NAMES.map(m => m.slice(0, 3));
export const SMALL_SAMPLE_BERTHS = 5;

export interface MonthStat {
  year: number;
  month: number;
  label: string; // e.g. "Aug 2026"
  occupied: number;
  available: number;
  berths: number;
  daysCovered: number;
  complete: boolean;
  occupancy: number;
}

export interface BerthTypeStat {
  berthType: string;
  berths: number;
  smallSample: boolean;
  annual: Record<number, number | null>;
  change: number | null; // last 12 complete months vs first 12 complete months, in pts
  latest: number | null;
  sameMonthLastYear: number | null;
  vsLastYear: number | null;
  emptyBerths: number;
}

export interface OccupancyReport {
  months: MonthStat[];
  latest: MonthStat | null;
  sameMonthLastYear: MonthStat | null;
  yoy: number | null;
  last12: number | null;
  prev12: number | null;
  last12Change: number | null;
  peak: MonthStat | null;
  low: MonthStat | null;
  emptyBerths: number;
  totalBerths: number;
  categories: number;
  years: number[];
  partialYears: Record<number, number>; // year -> months with data, for years that aren't full
  byType: BerthTypeStat[];
  allSelected: Omit<BerthTypeStat, 'berthType' | 'smallSample'>;
  seasonal: { month: string; occupancy: number | null }[];
  strongestMonth: { month: string; occupancy: number } | null;
  weakestMonth: { month: string; occupancy: number } | null;
  rolling12: (number | null)[]; // aligned with months
  insights: string[];
}

const pct = (occupied: number, available: number) => (available > 0 ? (occupied / available) * 100 : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const daysInCalendarMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

export const formatPct = (n: number | null | undefined) => (n == null ? '—' : `${round1(n).toFixed(1)}%`);
export const formatPts = (n: number | null | undefined) => {
  if (n == null) return '—';
  const r = round1(n);
  if (r === 0) return '±0.0 pts';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(1)} pts`;
};

function buildMonths(records: TimeBasedOccupancyRecord[]): MonthStat[] {
  const map = new Map<number, MonthStat>();
  for (const r of records) {
    const idx = monthIndex(r.year, r.month);
    let m = map.get(idx);
    if (!m) {
      m = {
        year: r.year,
        month: r.month,
        label: `${MONTH_ABBR[r.month - 1]} ${r.year}`,
        occupied: 0,
        available: 0,
        berths: 0,
        daysCovered: 0,
        complete: false,
        occupancy: 0,
      };
      map.set(idx, m);
    }
    m.occupied += r.occupiedDays;
    m.available += r.daysInMonth;
    m.berths += 1;
    m.daysCovered = Math.max(m.daysCovered, r.daysInMonth);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, m]) => ({
      ...m,
      complete: m.daysCovered === daysInCalendarMonth(m.year, m.month),
      occupancy: pct(m.occupied, m.available),
    }));
}

// Weighted occupancy over the `count` months ending at (and including) `endPos`,
// skipping `offset` months first. Returns null if there aren't enough months.
function windowOccupancy(complete: MonthStat[], endPos: number, count: number, offset = 0): number | null {
  const end = endPos - offset;
  const start = end - count + 1;
  if (start < 0) return null;
  let o = 0;
  let a = 0;
  for (let i = start; i <= end; i++) {
    o += complete[i].occupied;
    a += complete[i].available;
  }
  return pct(o, a);
}

// First 12 months of data (partial months weighted by their days) vs the last 12 complete months.
function firstVsLast12(records: TimeBasedOccupancyRecord[]): number | null {
  const months = buildMonths(records);
  const complete = months.filter(m => m.complete);
  if (months.length < 24 || complete.length < 12) return null;
  const first = windowOccupancy(months, 11, 12);
  const last = windowOccupancy(complete, complete.length - 1, 12);
  return first == null || last == null ? null : last - first;
}

function annualOccupancy(records: TimeBasedOccupancyRecord[], years: number[]): Record<number, number | null> {
  const totals = new Map<number, { o: number; a: number }>();
  for (const r of records) {
    const t = totals.get(r.year) ?? { o: 0, a: 0 };
    t.o += r.occupiedDays;
    t.a += r.daysInMonth;
    totals.set(r.year, t);
  }
  const result: Record<number, number | null> = {};
  for (const y of years) {
    const t = totals.get(y);
    result[y] = t && t.a > 0 ? pct(t.o, t.a) : null;
  }
  return result;
}

function monthStats(records: TimeBasedOccupancyRecord[], month: MonthStat | null) {
  if (!month) return { occupancy: null as number | null, berths: 0, empty: 0 };
  const rows = records.filter(r => r.year === month.year && r.month === month.month);
  const o = rows.reduce((s, r) => s + r.occupiedDays, 0);
  const a = rows.reduce((s, r) => s + r.daysInMonth, 0);
  return {
    occupancy: a > 0 ? pct(o, a) : null,
    berths: new Set(rows.map(r => r.berth)).size,
    empty: month.daysCovered > 0 ? (a - o) / month.daysCovered : 0,
  };
}

export function buildOccupancyReport(records: TimeBasedOccupancyRecord[]): OccupancyReport {
  const months = buildMonths(records);
  const complete = months.filter(m => m.complete);
  const latest = complete.length ? complete[complete.length - 1] : null;
  const latestPos = complete.length - 1;

  const sameMonthLastYear = latest
    ? complete.find(m => m.year === latest.year - 1 && m.month === latest.month) ?? null
    : null;
  const yoy = latest && sameMonthLastYear ? latest.occupancy - sameMonthLastYear.occupancy : null;

  const last12 = latest ? windowOccupancy(complete, latestPos, 12) : null;
  const prev12 = latest ? windowOccupancy(complete, latestPos, 12, 12) : null;
  const last12Change = last12 != null && prev12 != null ? last12 - prev12 : null;

  const peak = complete.reduce<MonthStat | null>((best, m) => (!best || m.occupancy > best.occupancy ? m : best), null);
  const low = complete.reduce<MonthStat | null>((worst, m) => (!worst || m.occupancy < worst.occupancy ? m : worst), null);

  const latestAll = monthStats(records, latest);
  const lastYearAll = monthStats(records, sameMonthLastYear);

  const years = Array.from(new Set(months.map(m => m.year))).sort((a, b) => a - b);
  const partialYears: Record<number, number> = {};
  for (const y of years) {
    const ym = months.filter(m => m.year === y);
    if (ym.length < 12 || ym.some(m => !m.complete)) partialYears[y] = ym.length;
  }

  // Per berth type
  const typeGroups = new Map<string, TimeBasedOccupancyRecord[]>();
  for (const r of records) {
    const t = r.berthType || 'Unknown';
    if (!typeGroups.has(t)) typeGroups.set(t, []);
    typeGroups.get(t)!.push(r);
  }
  const byType: BerthTypeStat[] = Array.from(typeGroups.entries())
    .map(([berthType, rows]) => {
      const now = monthStats(rows, latest);
      const then = monthStats(rows, sameMonthLastYear);
      const berths = now.berths || new Set(rows.map(r => r.berth)).size;
      return {
        berthType,
        berths,
        smallSample: berths < SMALL_SAMPLE_BERTHS,
        annual: annualOccupancy(rows, years),
        change: firstVsLast12(rows),
        latest: now.occupancy,
        sameMonthLastYear: then.occupancy,
        vsLastYear: now.occupancy != null && then.occupancy != null ? now.occupancy - then.occupancy : null,
        emptyBerths: now.empty,
      };
    })
    .sort((a, b) => b.berths - a.berths);

  const allSelected = {
    berths: latestAll.berths || new Set(records.map(r => r.berth)).size,
    annual: annualOccupancy(records, years),
    change: firstVsLast12(records),
    latest: latestAll.occupancy,
    sameMonthLastYear: lastYearAll.occupancy,
    vsLastYear: latestAll.occupancy != null && lastYearAll.occupancy != null ? latestAll.occupancy - lastYearAll.occupancy : null,
    emptyBerths: latestAll.empty,
  };

  // Seasonal pattern: all years combined, partial months contribute in proportion to their days
  const seasonalTotals = Array.from({ length: 12 }, () => ({ o: 0, a: 0 }));
  for (const m of months) {
    seasonalTotals[m.month - 1].o += m.occupied;
    seasonalTotals[m.month - 1].a += m.available;
  }
  const seasonal = seasonalTotals.map((t, i) => ({
    month: MONTH_NAMES[i],
    occupancy: t.a > 0 ? pct(t.o, t.a) : null,
  }));
  const withData = seasonal.filter((s): s is { month: string; occupancy: number } => s.occupancy != null);
  const strongestMonth = withData.reduce<typeof withData[number] | null>((b, s) => (!b || s.occupancy > b.occupancy ? s : b), null);
  const weakestMonth = withData.reduce<typeof withData[number] | null>((w, s) => (!w || s.occupancy < w.occupancy ? s : w), null);

  // 12-month rolling average (berth-days weighted), aligned with months
  const rolling12 = months.map((_, i) => {
    if (i < 11) return null;
    let o = 0;
    let a = 0;
    for (let j = i - 11; j <= i; j++) {
      o += months[j].occupied;
      a += months[j].available;
    }
    return pct(o, a);
  });

  const report: OccupancyReport = {
    months,
    latest,
    sameMonthLastYear,
    yoy,
    last12,
    prev12,
    last12Change,
    peak,
    low,
    emptyBerths: latestAll.empty,
    totalBerths: allSelected.berths,
    categories: byType.length,
    years,
    partialYears,
    byType,
    allSelected,
    seasonal,
    strongestMonth,
    weakestMonth,
    rolling12,
    insights: [],
  };
  report.insights = buildInsights(report);
  return report;
}

function buildInsights(r: OccupancyReport): string[] {
  const out: string[] = [];
  if (!r.latest) return out;

  let headline = `Across ${r.totalBerths.toLocaleString()} berths in ${r.categories} ${r.categories === 1 ? 'category' : 'categories'}, occupancy was ${formatPct(r.latest.occupancy)} in ${r.latest.label}.`;
  if (r.peak) headline += ` It peaked at ${formatPct(r.peak.occupancy)} in ${r.peak.label}`;
  if (r.last12 != null) headline += `${r.peak ? ' and' : ' It'} averaged ${formatPct(r.last12)} over the last 12 months`;
  out.push(`${headline}.`);

  if (r.last12 != null && r.prev12 != null && r.last12Change != null) {
    const dir = Math.abs(r.last12Change) < 0.5 ? 'broadly flat' : r.last12Change < 0 ? 'trending down' : 'trending up';
    out.push(`Occupancy is ${dir}. The last 12 months averaged ${formatPct(r.last12)}, ${formatPts(r.last12Change)} on the previous 12 months (${formatPct(r.prev12)}).`);
  }

  const biggest = r.byType[0];
  if (biggest && r.byType.length > 1) {
    const share = Math.round((biggest.berths / r.totalBerths) * 100);
    let s = `${biggest.berthType} (${biggest.berths.toLocaleString()} berths, ${share}% of inventory) drives the overall result. It ran at ${formatPct(biggest.latest)} in ${r.latest.label}`;
    if (biggest.vsLastYear != null) s += `, ${formatPts(biggest.vsLastYear)} on a year earlier`;
    out.push(`${s}.`);
  }

  const comparable = r.byType.filter(t => !t.smallSample && t.change != null);
  if (comparable.length > 1) {
    const worst = comparable.reduce((a, b) => (b.change! < a.change! ? b : a));
    const best = comparable.reduce((a, b) => (b.change! > a.change! ? b : a));
    if (worst.change! < 0) out.push(`${worst.berthType} has declined the most: ${formatPts(worst.change)} comparing the last 12 months with the first 12 months of data.`);
    if (best.change! > 0) out.push(`${best.berthType} has improved the most: ${formatPts(best.change)} comparing the last 12 months with the first 12 months of data.`);
  }

  if (r.emptyBerths > 0) {
    const empty = Math.round(r.emptyBerths);
    const share = r.totalBerths > 0 ? (r.emptyBerths / r.totalBerths) * 100 : 0;
    let s = `About ${empty.toLocaleString()} berths sit empty on an average day (${r.latest.label}, ${share.toFixed(1)}% of inventory).`;
    const top = [...r.byType].sort((a, b) => b.emptyBerths - a.emptyBerths).filter(t => Math.round(t.emptyBerths) > 0);
    if (top.length) {
      s += ` ${top[0].berthType} accounts for ${Math.round(top[0].emptyBerths)} of them (${Math.round((top[0].emptyBerths / r.emptyBerths) * 100)}%)`;
      if (top[1]) s += `, followed by ${top[1].berthType} with ${Math.round(top[1].emptyBerths)}`;
      s += '. This is where the revenue opportunity sits.';
    }
    out.push(s);
  }

  if (r.strongestMonth && r.weakestMonth && r.strongestMonth !== r.weakestMonth) {
    const swing = r.strongestMonth.occupancy - r.weakestMonth.occupancy;
    const size = swing < 2 ? 'modest' : swing < 5 ? 'noticeable' : 'strong';
    out.push(`Seasonality is ${size}. ${r.strongestMonth.month} is typically the strongest month (${formatPct(r.strongestMonth.occupancy)}) and ${r.weakestMonth.month} the weakest (${formatPct(r.weakestMonth.occupancy)}), a swing of ${round1(swing).toFixed(1)} pts.`);
  }

  return out;
}
