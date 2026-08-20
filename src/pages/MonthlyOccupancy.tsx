import { useState, useMemo } from 'react';
import { BerthRecord, FilterState } from '../types/berth';
import { calculateMonthlyOccupancy, calculateKPIMetrics, getUniqueValues } from '../utils/dataUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KPICards from '../components/KPICards';
import FilterPanel from '../components/FilterPanel';

interface MonthlyOccupancyProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

const COLORS = ['#dc2626', '#ea580c', '#16a34a', '#3b82f6', '#8b5cf6'];

export default function MonthlyOccupancy({ data, lastUpdated, onRefresh }: MonthlyOccupancyProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState<FilterState>({
    date: null,
    year: null,
    month: null,
    marina: null,
    pier: null,
    berth: null,
    berthType: null,
    ownershipType: null,
    occupancyStatus: null,
    berthSize: null,
  });

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let result = data;

    if (filters.marina) {
      result = result.filter(r => r.marina === filters.marina);
    }
    if (filters.pier) {
      result = result.filter(r => r.pier.toString() === filters.pier.toString());
    }
    if (filters.berthType) {
      result = result.filter(r => r.berthType === filters.berthType);
    }
    if (filters.ownershipType) {
      result = result.filter(r => r.ownershipType === filters.ownershipType);
    }
    if (filters.berthSize) {
      result = result.filter(r => r.nominalLength === filters.berthSize);
    }
    if (filters.occupancyStatus) {
      result = result.filter(r => r.occupancyStatus === filters.occupancyStatus);
    }

    return result;
  }, [data, filters]);

  const monthlyData = calculateMonthlyOccupancy(filteredData, selectedYear);
  const kpiMetrics = calculateKPIMetrics(filteredData);

  const uniqueValues = useMemo(() => ({
    marinas: getUniqueValues<string>(data, 'marina'),
    piers: getUniqueValues<string | number>(data, 'pier'),
    berthTypes: getUniqueValues<string>(data, 'berthType'),
    ownershipTypes: getUniqueValues<string>(data, 'ownershipType'),
    berthSizes: getUniqueValues<number>(data, 'nominalLength'),
  }), [data]);

  const highestMonth = monthlyData.length > 0
    ? monthlyData.reduce((max, month) => month.occupancyPercentage > max.occupancyPercentage ? month : max)
    : null;

  const lowestMonth = monthlyData.length > 0
    ? monthlyData.reduce((min, month) => month.occupancyPercentage < min.occupancyPercentage ? month : min)
    : null;

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  // Prepare data for status breakdown pie chart
  const statusBreakdown = useMemo(() => {
    const activeBerths = filteredData.filter(r => r.berthStatus === 'Active');
    return [
      { name: 'Occupied', value: activeBerths.filter(r => r.occupancyStatus === 'Rented').length },
      { name: 'Booked', value: activeBerths.filter(r => r.occupancyStatus === 'Booked').length },
      { name: 'Available', value: activeBerths.filter(r => r.occupancyStatus === 'Available').length },
    ];
  }, [filteredData]);

  // Prepare data for marina breakdown
  const marinaBreakdown = useMemo(() => {
    const marinas = getUniqueValues<string>(filteredData, 'marina');
    return marinas.map(marina => {
      const marinaData = filteredData.filter(r => r.marina === marina && r.berthStatus === 'Active');
      const occupied = marinaData.filter(r => r.occupancyStatus === 'Rented').length;
      const booked = marinaData.filter(r => r.occupancyStatus === 'Booked').length;
      const available = marinaData.filter(r => r.occupancyStatus === 'Available').length;
      const total = marinaData.length;
      return {
        name: marina,
        total,
        occupied,
        booked,
        available,
        occupancyPercentage: total > 0 ? ((occupied + booked) / total) * 100 : 0,
      };
    });
  }, [filteredData]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      date: null,
      year: null,
      month: null,
      marina: null,
      pier: null,
      berth: null,
      berthType: null,
      ownershipType: null,
      occupancyStatus: null,
      berthSize: null,
    });
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Unknown';
    return lastUpdated.toLocaleString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Current Occupancy Analysis</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data Last Updated: {formatLastUpdated()}
          </p>
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This page shows current snapshot data from your master Excel file. 
              Use the filters below to analyze occupancy by different dimensions.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="btn btn-secondary"
        >
          Refresh Data
        </button>
      </div>

      {/* Data Quality Indicator */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Data Source Information</h3>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-lg font-semibold text-gray-900">{data.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Berths</p>
              <p className="text-lg font-semibold text-gray-900">{filteredData.filter(r => r.berthStatus === 'Active').length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Filtered Records</p>
              <p className="text-lg font-semibold text-gray-900">{filteredData.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Analysis Date</p>
              <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        uniqueValues={uniqueValues}
      />

      {/* KPI Cards */}
      <KPICards metrics={kpiMetrics} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Status Breakdown</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Marina Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Marina Occupancy Comparison</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marinaBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'occupancyPercentage') return [`${value.toFixed(1)}%`, 'Occupancy'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="occupied" name="Occupied" fill="#dc2626" stackId="a" />
              <Bar dataKey="booked" name="Booked" fill="#ea580c" stackId="a" />
              <Bar dataKey="available" name="Available" fill="#16a34a" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Detailed Marina Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Berths</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupied</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {marinaBreakdown.map((marina) => (
                <tr key={marina.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{marina.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{marina.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{marina.occupied}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{marina.booked}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{marina.available}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{marina.occupancyPercentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Comparison Note */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Historical Analysis</h3>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Historical Data Note:</strong> Since you currently have only one master Excel file with current occupancy data, 
            historical monthly analysis is not available. To enable historical tracking, consider:
          </p>
          <ul className="mt-2 text-sm text-yellow-800 list-disc list-inside space-y-1">
            <li>Adding date fields to track when each berth's status changed</li>
            <li>Maintaining monthly snapshots of your data</li>
            <li>Implementing a database to store historical occupancy records</li>
          </ul>
        </div>
      </div>
    </div>
  );
}