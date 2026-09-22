import { useState, useMemo, useEffect, useRef } from 'react';
import { TimeBasedOccupancyRecord } from '../types/berth';
import { exportToCSV } from '../utils/dataUtils';
import { excelService } from '../services/excelService';
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

  // Calculate aggregate metrics for KPI cards
  const aggregateMetrics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        fleetWideOccupancy: 0,
        totalBerths: 0,
        categories: 0,
      };
    }

    // Find the most recent time period for current snapshot metrics
    const sortedData = [...filteredData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    if (sortedData.length === 0) {
      return {
        fleetWideOccupancy: 0,
        totalBerths: 0,
        categories: 0,
      };
    }

    const mostRecentYear = sortedData[0].year;
    const mostRecentMonth = sortedData[0].month;

    // Filter to only the most recent period for current snapshot metrics
    const currentSnapshot = filteredData.filter(
      record => record.year === mostRecentYear && record.month === mostRecentMonth
    );

    // Calculate fleet-wide occupancy as simple average of all individual berth occupancy percentages
    let totalOccupancySum = 0;
    let recordCount = 0;

    currentSnapshot.forEach(record => {
      totalOccupancySum += record.occupancyPercent;
      recordCount += 1;
    });

    // Fleet-wide occupancy is the simple average of all individual berth records
    const fleetWideOccupancy = recordCount > 0
      ? totalOccupancySum / recordCount
      : 0;

    // Get unique berths count from current snapshot
    const uniqueBerths = new Set(currentSnapshot.map(r => r.berth)).size;

    // Count unique berth types as categories from current snapshot
    const categories = new Set(currentSnapshot.map(r => r.berthType)).size;

    return {
      fleetWideOccupancy: Math.round(fleetWideOccupancy * 10) / 10,
      totalBerths: uniqueBerths,
      categories,
    };
  }, [filteredData]);

  // Prepare data for month-by-month chart
  const monthlyChartData = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Group by year-month and calculate average occupancy
    const monthlyData = new Map<string, { year: number; month: number; occupancy: number; count: number }>();

    filteredData.forEach(record => {
      const key = `${record.year}-${record.month}`;
      const existing = monthlyData.get(key);

      if (existing) {
        existing.occupancy += record.occupancyPercent;
        existing.count += 1;
      } else {
        monthlyData.set(key, {
          year: record.year,
          month: record.month,
          occupancy: record.occupancyPercent,
          count: 1,
        });
      }
    });

    // Convert to array and calculate averages
    const chartData = Array.from(monthlyData.values())
      .map(item => ({
        month: `${item.month}/${item.year}`,
        occupancy: Math.round((item.occupancy / item.count) * 10) / 10,
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/').map(Number);
        const [bMonth, bYear] = b.month.split('/').map(Number);
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      });

    return chartData;
  }, [filteredData]);

  // Prepare data for berth type over time chart
  const berthTypeChartData = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Group by berth type and year-month
    const berthTypeData = new Map<string, Map<string, { occupancy: number; count: number }>>();

    filteredData.forEach(record => {
      const berthType = record.berthType || 'Unknown';
      const timeKey = `${record.month}/${record.year}`;

      if (!berthTypeData.has(berthType)) {
        berthTypeData.set(berthType, new Map());
      }

      const timeMap = berthTypeData.get(berthType)!;
      const existing = timeMap.get(timeKey);

      if (existing) {
        existing.occupancy += record.occupancyPercent;
        existing.count += 1;
      } else {
        timeMap.set(timeKey, {
          occupancy: record.occupancyPercent,
          count: 1,
        });
      }
    });

    // Get all unique time periods
    const allTimePeriods = new Set<string>();
    berthTypeData.forEach(timeMap => {
      timeMap.forEach((_, timeKey) => allTimePeriods.add(timeKey));
    });

    const sortedTimePeriods = Array.from(allTimePeriods).sort((a, b) => {
      const [aMonth, aYear] = a.split('/').map(Number);
      const [bMonth, bYear] = b.split('/').map(Number);
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });

    // Build chart data array
    const chartData = sortedTimePeriods.map(timeKey => {
      const dataPoint: any = { month: timeKey };

      berthTypeData.forEach((timeMap, berthType) => {
        const record = timeMap.get(timeKey);
        if (record) {
          dataPoint[berthType] = Math.round((record.occupancy / record.count) * 10) / 10;
        }
      });

      return dataPoint;
    });

    return chartData;
  }, [filteredData]);

  // Get unique berth types for the chart
  const chartBerthTypes = useMemo(() => {
    const types = new Set(filteredData.map(r => r.berthType));
    return Array.from(types).sort();
  }, [filteredData]);

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

  // Prepare data for seasonal pattern chart (occupancy by month of year)
  const seasonalPatternData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthlyOccupancy = new Map<number, { totalOccupancy: number; count: number }>();

    filteredData.forEach(record => {
      const existing = monthlyOccupancy.get(record.month);
      if (existing) {
        existing.totalOccupancy += record.occupancyPercent;
        existing.count += 1;
      } else {
        monthlyOccupancy.set(record.month, {
          totalOccupancy: record.occupancyPercent,
          count: 1,
        });
      }
    });

    return monthNames.map((name, index) => {
      const month = index + 1;
      const data = monthlyOccupancy.get(month);
      const occupancy = data ? Math.round((data.totalOccupancy / data.count) * 10) / 10 : 0;
      return {
        month: name,
        occupancy,
      };
    });
  }, [filteredData]);

  // Prepare data for current snapshot table
  const currentSnapshotData = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Find the most recent time period
    const sortedData = [...filteredData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    if (sortedData.length === 0) return [];

    const mostRecentYear = sortedData[0].year;
    const mostRecentMonth = sortedData[0].month;

    // Filter to only the most recent period
    const recentData = filteredData.filter(
      record => record.year === mostRecentYear && record.month === mostRecentMonth
    );

    // Group by berth type and calculate average occupancy
    const berthTypeData = new Map<string, { totalOccupancy: number; count: number; berths: Set<string> }>();

    recentData.forEach(record => {
      const berthType = record.berthType || 'Unknown';
      const existing = berthTypeData.get(berthType);

      if (existing) {
        existing.totalOccupancy += record.occupancyPercent;
        existing.count += 1;
        existing.berths.add(record.berth);
      } else {
        berthTypeData.set(berthType, {
          totalOccupancy: record.occupancyPercent,
          count: 1,
          berths: new Set([record.berth]),
        });
      }
    });

    return Array.from(berthTypeData.entries()).map(([berthType, data]) => ({
      berthType,
      berths: data.berths.size,
      occupancy: Math.round((data.totalOccupancy / data.count) * 10) / 10,
    })).sort((a, b) => b.berths - a.berths);
  }, [filteredData]);

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
            This data uses time-based occupancy calculation (occupied days / total berth-days)
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
              <p className="text-sm font-medium text-slate-500">Fleet-wide occupancy</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{aggregateMetrics.fleetWideOccupancy}%</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-navy-100 text-navy-700">
              📊
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Berths</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{aggregateMetrics.totalBerths.toLocaleString()}</p>
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
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{aggregateMetrics.categories}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold bg-sky-100 text-sky-700">
              📁
            </div>
          </div>
        </div>
      </div>

      {/* Month-by-Month Occupancy Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Overall occupancy, month by month</h3>
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
                domain={[80, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Occupancy']}
                labelFormatter={(label: string) => `Month: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="occupancy"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Occupancy by Berth Type Over Time Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Occupancy by berth type, year over year</h3>
          <p className="text-sm text-gray-500">Annual occupancy by category</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={berthTypeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, '']}
                labelFormatter={(label: string) => `Month: ${label}`}
              />
              <Legend />
              {chartBerthTypes.map((berthType) => (
                <Line
                  key={berthType}
                  type="monotone"
                  dataKey={berthType}
                  stroke={getBerthTypeColor(berthType)}
                  strokeWidth={2}
                  dot={{ fill: getBerthTypeColor(berthType), strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column layout for Seasonal Pattern and Current Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Pattern Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Seasonal pattern</h3>
            <p className="text-sm text-gray-500">Occupancy by month of year</p>
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
                  domain={[85, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Occupancy']}
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
          </div>
          <div className="p-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berth type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berths</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSnapshotData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.berthType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.berths}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="flex-1 mr-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${item.occupancy}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium">{item.occupancy}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}