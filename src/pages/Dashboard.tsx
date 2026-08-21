import { useState, useMemo } from 'react';
import { BerthRecord, FilterState } from '../types/berth';
import { filterData, calculateKPIMetrics, getUniqueValues } from '../utils/dataUtils';
import KPICards from '../components/KPICards';
import FilterPanel from '../components/FilterPanel';
import OccupancyGauge from '../components/OccupancyGauge';
import PierOccupancyChart from '../components/PierOccupancyChart';
import BerthTypeChart from '../components/BerthTypeChart';
import OwnershipChart from '../components/OwnershipChart';
import LengthChart from '../components/LengthChart';
import ManagementSummary from '../components/ManagementSummary';
import DataQualityIndicator from '../components/DataQualityIndicator';

interface DashboardProps {
  allData: BerthRecord[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function Dashboard({ allData, filters, onFilterChange, lastUpdated, onRefresh }: DashboardProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const filteredData = useMemo(() => filterData(allData, localFilters), [allData, localFilters]);

  const uniqueValues = useMemo(() => ({
    marinas: getUniqueValues<string>(allData, 'marina'),
    piers: getUniqueValues<string | number>(allData, 'pier'),
    berthTypes: getUniqueValues<string>(allData, 'berthType'),
    ownershipTypes: getUniqueValues<string>(allData, 'ownershipType'),
    berthSizes: getUniqueValues<number>(allData, 'nominalLength'),
  }), [allData]);

  const kpiMetrics = useMemo(() => calculateKPIMetrics(filteredData), [filteredData]);

  const handleFilterChange = (newFilters: FilterState) => {
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
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
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
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
    <div className="dashboard-shell">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Data Last Updated: {formatLastUpdated()}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="btn btn-secondary"
        >
          Refresh Data
        </button>
      </div>

      {/* Data Quality Indicator */}
      <DataQualityIndicator data={filteredData} />

      {/* Filter Panel */}
      <FilterPanel
        filters={localFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        uniqueValues={uniqueValues}
      />

      {/* KPI Cards */}
      <KPICards metrics={kpiMetrics} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_0.95fr] gap-5">
        <ManagementSummary data={filteredData} metrics={kpiMetrics} />

        <div className="card bg-gradient-to-br from-navy-50 via-white to-slate-50 p-4">
          <div className="card-header mb-3">
            <h3 className="card-title">Operational Highlights</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fleet Overview</p>
              <p className="mt-3 text-4xl font-bold text-slate-900">{kpiMetrics.totalActiveBerths}</p>
              <p className="mt-1 text-sm text-slate-500">active berths in view</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Occupancy Gauge</p>
              <div className="mt-1">
                <OccupancyGauge occupancy={kpiMetrics.occupancyPercentage} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PierOccupancyChart data={filteredData} />
        <div className="grid gap-6">
          <BerthTypeChart data={filteredData} />
          <OwnershipChart data={filteredData} />
        </div>
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
        <LengthChart data={filteredData} />
      </div>
    </div>
  );
}