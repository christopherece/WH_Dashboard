import { useState, useMemo, useEffect, useRef } from 'react';
import { TimeBasedOccupancyRecord } from '../types/berth';
import { exportToCSV } from '../utils/dataUtils';
import { excelService } from '../services/excelService';
import { buildOccupancyReport, formatPct, formatPts, SMALL_SAMPLE_BERTHS } from '../utils/occupancyAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface TimeBasedOccupancyProps {
  onRefresh: () => void;
}

export default function TimeBasedOccupancy({ onRefresh }: TimeBasedOccupancyProps) {
  const [data, setData] = useState<TimeBasedOccupancyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedMarina, setSelectedMarina] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedBerthTypes, setSelectedBerthTypes] = useState<string[]>([]);
  const [showBerthTypeOptions, setShowBerthTypeOptions] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);
  const berthTypeDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await excelService.loadTimeBasedOccupancyData();
      setData(result);
      setLastUpdated(excelService.getLastTimeBasedLoaded());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load time-based occupancy data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (berthTypeDropdownRef.current && !berthTypeDropdownRef.current.contains(event.target as Node)) {
        setShowBerthTypeOptions(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter data
  const filteredData = useMemo(() => {
    let result = data;

    if (selectedMarina) {
      result = result.filter(r => r.marina === selectedMarina);
    }
    if (selectedYears && selectedYears.length > 0) {
      result = result.filter(r => selectedYears.includes(r.year));
    }
    if (selectedMonth) {
      result = result.filter(r => r.month === selectedMonth);
    }
    if (selectedBerthTypes && selectedBerthTypes.length > 0) {
      result = result.filter(r => selectedBerthTypes.includes(r.berthType));
    }

    return result;
  }, [data, selectedMarina, selectedYears, selectedMonth, selectedBerthTypes]);

  // Get unique values for filters
  const uniqueMarinas = useMemo(() => {
    const marinas = new Set(data.map(r => r.marina));
    return Array.from(marinas).sort();
  }, [data]);

  const uniqueYears = useMemo(() => {
    const years = new Set(data.map(r => r.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  const uniqueMonths = useMemo(() => {
    const months = new Set(data.map(r => r.month));
    return Array.from(months).sort((a, b) => a - b);
  }, [data]);

  const uniqueBerthTypes = useMemo(() => {
    const berthTypes = new Set(data.map(r => r.berthType));
    return Array.from(berthTypes).sort();
  }, [data]);

  // Berth-days weighted report metrics (latest complete month, trends, per-type and seasonal breakdowns)
  const report = useMemo(() => buildOccupancyReport(filteredData), [filteredData]);

  // Month-by-month chart with 12-month rolling average; partial months flagged
  const monthlyChartData = useMemo(() => report.months.map((m, i) => ({
    month: m.label,
    occupancy: Math.round(m.occupancy * 10) / 10,
    rolling: report.rolling12[i] == null ? null : Math.round(report.rolling12[i]! * 10) / 10,
    partial: !m.complete,
  })), [report]);

  // Largest (non-small-sample) categories, annual occupancy
  const largestTypes = useMemo(
    () => report.byType.filter(t => !t.smallSample).slice(0, 4),
    [report]
  );

  const annualChartData = useMemo(() => report.years.map(year => {
    const point: Record<string, number | string | null> = {
      year: report.partialYears[year] ? `${year}*` : String(year),
    };
    largestTypes.forEach(t => {
      const v = t.annual[year];
      point[t.berthType] = v == null ? null : Math.round(v * 10) / 10;
    });
    return point;
  }), [report, largestTypes]);

  // Color mapping for berth types
  const berthTypeColors: Record<string, string> = {
    'Multihull': '#38bdf8', // light blue
    'Marina Berth': '#22c55e', // green
    'Alongside': '#eab308', // yellow
    'Charter Berth': '#ef4444', // red
  };

  const getBerthTypeColor = (berthType: string) => {
    return berthTypeColors[berthType] || '#6366f1'; // default purple
  };

  const seasonalPatternData = useMemo(() => report.seasonal.map(s => ({
    month: s.month,
    occupancy: s.occupancy == null ? 0 : Math.round(s.occupancy * 10) / 10,
  })), [report]);

  const renderDelta = (value: number | null, suffix = '') => {
    if (value == null) return <span className="text-slate-400">—</span>;
    const r = Math.round(value * 10) / 10;
    const cls = r > 0 ? 'text-emerald-600' : r < 0 ? 'text-rose-600' : 'text-slate-500';
    const icon = r > 0 ? '▲' : r < 0 ? '▼' : '▬';
    return <span className={`${cls} font-medium whitespace-nowrap`}>{icon} {formatPts(value)}{suffix}</span>;
  };

  const latestLabel = report.latest?.label ?? '—';
  const partialMonths = report.months.filter(m => !m.complete);
  const handleExport = () => {
    exportToCSV(filteredData, 'time-based-occupancy.csv');
  };

  const handleClearFilters = () => {
    setSelectedMarina('');
    setSelectedYears([]);
    setSelectedMonth(null);
    setSelectedBerthTypes([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading time-based occupancy data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading data</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time-Based Occupancy</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data Last Updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Berth-days weighted occupancy (total occupied berth-days / total available berth-days). Headline figures use the latest complete month.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="btn btn-primary"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              loadData();
              onRefresh();
            }}
            className="btn btn-secondary"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="card-title">Filters</h3>
          <button
            onClick={handleClearFilters}
            className="text-sm text-navy-600 hover:text-navy-800"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marina</label>
            <select
              value={selectedMarina}
              onChange={(e) => setSelectedMarina(e.target.value)}
              className="select"
            >
              <option value="">All Marinas</option>
              {uniqueMarinas.map((marina) => (
                <option key={marina} value={marina}>{marina}</option>
              ))}
            </select>
          </div>
          <div className="relative" ref={yearDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <button
              type="button"
              onClick={() => setShowYearOptions((show) => !show)}
              className="select flex w-full items-center justify-between text-left"
            >
              <span className="truncate">
                {selectedYears && selectedYears.length > 0
                  ? `${selectedYears.length} year${selectedYears.length === 1 ? '' : 's'} selected`
                  : 'All Years'}
              </span>
              <span className="ml-2">v</span>
            </button>

            {showYearOptions && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-lg">
                {uniqueYears.map((year) => (
                  <label key={year} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedYears([...selectedYears, year]);
                        } else {
                          setSelectedYears(selectedYears.filter(y => y !== year));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{year}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth || ''}
              onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
              className="select"
            >
              <option value="">All Months</option>
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="relative" ref={berthTypeDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Berth Type</label>
            <button
              type="button"
              onClick={() => setShowBerthTypeOptions((show) => !show)}
              className="select flex w-full items-center justify-between text-left"
            >
              <span className="truncate">
                {selectedBerthTypes && selectedBerthTypes.length > 0
                  ? `${selectedBerthTypes.length} berth type${selectedBerthTypes.length === 1 ? '' : 's'} selected`
                  : 'All Berth Types'}
              </span>
              <span className="ml-2">v</span>
            </button>

            {showBerthTypeOptions && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-lg">
                {uniqueBerthTypes.map((berthType) => (
                  <label key={berthType} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBerthTypes.includes(berthType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBerthTypes([...selectedBerthTypes, berthType]);
                        } else {
                          setSelectedBerthTypes(selectedBerthTypes.filter(t => t !== berthType));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{berthType}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy-700 to-navy-800" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Occupancy, {latestLabel}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{formatPct(report.latest?.occupancy)}</p>
              <p className="mt-2 text-xs text-slate-500">
                {renderDelta(report.yoy)} vs {report.sameMonthLastYear?.label ?? 'last year'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-navy-100 text-navy-700">
              📊
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Last 12 months</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{formatPct(report.last12)}</p>
              <p className="mt-2 text-xs text-slate-500">
                {renderDelta(report.last12Change)} vs previous 12 months ({formatPct(report.prev12)})
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-emerald-100 text-emerald-700">
              📈
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Empty berths</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{Math.round(report.emptyBerths).toLocaleString()}</p>
              <p className="mt-2 text-xs text-slate-500">
                on an average day in {latestLabel} — {report.totalBerths > 0 ? ((report.emptyBerths / report.totalBerths) * 100).toFixed(1) : '0.0'}% of {report.totalBerths.toLocaleString()} berths
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-amber-100 text-amber-700">
              🛥️
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-violet-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Period peak / low</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {formatPct(report.peak?.occupancy)} <span className="text-lg font-semibold text-slate-400">/ {formatPct(report.low?.occupancy)}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Peak {report.peak?.label ?? '—'} · Low {report.low?.label ?? '—'} (complete months)
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-violet-100 text-violet-700">
              ↕
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Berths</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{report.totalBerths.toLocaleString()}</p>
              <p className="mt-2 text-xs text-slate-500">tracked in {latestLabel}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-rose-100 text-rose-700">
              ⚓
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Categories</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{report.categories}</p>
              <p className="mt-2 text-xs text-slate-500">berth types in selection</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-sky-100 text-sky-700">
              📁
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {report.insights.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Executive summary</h3>
            <p className="text-sm text-gray-500">Headline figures use {latestLabel}, the latest complete month.</p>
          </div>
          <ul className="space-y-2 list-disc pl-5 text-sm text-slate-700">
            {report.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Month-by-Month Occupancy Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Overall occupancy, month by month (berth-days weighted)</h3>
          <p className="text-sm text-gray-500">
            Monthly occupancy with 12-month rolling average. Partial months are shown hollow and excluded from peak, low and headline figures.
          </p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 5)), 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="occupancy"
                name="Monthly occupancy"
                stroke="#2563eb"
                strokeWidth={2}
                dot={(props: any) => (
                  <circle
                    key={`dot-${props.index}`}
                    cx={props.cx}
                    cy={props.cy}
                    r={4}
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill={props.payload?.partial ? '#fff' : '#2563eb'}
                  />
                )}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="rolling"
                name="12-month rolling average"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance by Berth Type */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance by berth type, year over year</h3>
          <p className="text-sm text-gray-500">Annual occupancy for the largest categories, weighted by berth-days</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={annualChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
              <Legend />
              {largestTypes.map(t => (
                <Bar
                  key={t.berthType}
                  dataKey={t.berthType}
                  name={`${t.berthType} · ${t.berths.toLocaleString()} berths`}
                  fill={getBerthTypeColor(t.berthType)}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berth type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Berths</th>
                {report.years.map(y => (
                  <th key={y} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {y}{report.partialYears[y] ? '*' : ''}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change †</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report.byType.map(t => (
                <tr key={t.berthType} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {t.berthType}
                    {t.smallSample && <span className="badge badge-warning ml-2">small sample</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">{t.berths.toLocaleString()}</td>
                  {report.years.map(y => (
                    <td key={y} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      {t.annual[y] == null ? '—' : t.annual[y]!.toFixed(1)}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{renderDelta(t.change)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">All selected</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">{report.allSelected.berths.toLocaleString()}</td>
                {report.years.map(y => (
                  <td key={y} className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {report.allSelected.annual[y] == null ? '—' : report.allSelected.annual[y]!.toFixed(1)}
                  </td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{renderDelta(report.allSelected.change)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">
            {Object.keys(report.partialYears).length > 0 && (
              <>* Partial year: {Object.entries(report.partialYears).map(([y, n]) => `${y} (${n} month${n === 1 ? '' : 's'})`).join(', ')}. </>
            )}
            † Last 12 complete months vs first 12 months of data, in percentage points.
            Categories with fewer than {SMALL_SAMPLE_BERTHS} berths move in large steps; treat as directional.
          </p>
        </div>
      </div>

      {/* Two-column layout for Seasonal Pattern and Current Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Pattern Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Seasonal pattern</h3>
            <p className="text-sm text-gray-500">Occupancy by month of year, all years combined (berth-days weighted)</p>
            {report.strongestMonth && report.weakestMonth && (
              <p className="text-sm text-gray-700 mt-1">
                Strongest: <span className="font-medium">{report.strongestMonth.month} {formatPct(report.strongestMonth.occupancy)}</span>
                {' · '}
                Weakest: <span className="font-medium">{report.weakestMonth.month} {formatPct(report.weakestMonth.occupancy)}</span>
              </p>
            )}
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seasonalPatternData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 5)), 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Occupancy']}
                />
                <Bar
                  dataKey="occupancy"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Snapshot Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current snapshot</h3>
            <p className="text-sm text-gray-500">
              Berth count and occupancy by category for {latestLabel}, the latest complete month.
              "Empty berths" is the average number of berths unoccupied on any given day.
            </p>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berth type</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Berths</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    vs {report.sameMonthLastYear?.label ?? 'last year'}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Empty</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...report.byType.map(t => ({ ...t, total: false })), { ...report.allSelected, berthType: 'All selected', smallSample: false, total: true }].map(item => (
                  <tr key={item.berthType} className={item.total ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.berthType}
                      {item.smallSample && <span className="badge badge-warning ml-2">small</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900">{item.berths.toLocaleString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="flex-1 mr-3 min-w-[60px]">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${item.latest ?? 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium">{formatPct(item.latest)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">{renderDelta(item.vsLastYear)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900">{Math.round(item.emptyBerths).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Notes & Methodology */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Notes &amp; methodology</h3>
        </div>
        <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
          <li>
            Occupancy = occupied berth-days ÷ available berth-days × 100. Every figure (monthly, annual, seasonal,
            per category and filtered totals) is calculated from the underlying berth-days, so larger categories carry
            proportionally more weight.
          </li>
          <li>
            Headline figures use {latestLabel}, the latest complete month. Peak and low are taken from complete months only.
          </li>
          {partialMonths.length > 0 && (
            <li>
              Partial months: {partialMonths.map(m => `${m.label} (${m.daysCovered} of ${new Date(m.year, m.month, 0).getDate()} days)`).join(', ')}.
              They are shown hollow on the monthly chart and contribute to annual and seasonal averages in proportion to their days.
            </li>
          )}
          <li>
            Empty berths = berths × (1 − occupancy) for the month, i.e. the average number of berths unoccupied on a given day.
          </li>
          {report.byType.some(t => t.smallSample) && (
            <li>
              Small categories: {report.byType.filter(t => t.smallSample).map(t => `${t.berthType} (${t.berths})`).join(', ')} berths.
              Figures for these move in large steps and should be read as directional.
            </li>
          )}
          <li>Source: TimeBasedOccupancy.xlsx — {filteredData.length.toLocaleString()} rows used.</li>
        </ul>
      </div>
    </div>
  );
}
