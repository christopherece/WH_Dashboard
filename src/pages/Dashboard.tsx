import { useState, useMemo } from 'react';
import { BerthRecord, FilterState } from '../types/berth';
import { filterData, calculateKPIMetrics, getUniqueValues } from '../utils/dataUtils';
import KPICards from '../components/KPICards';
import FilterPanel from '../components/FilterPanel';
import OccupancyGauge from '../components/OccupancyGauge';
import OccupancyTrendChart from '../components/OccupancyTrendChart';
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

      {/* Management Summary */}
      <ManagementSummary data={filteredData} metrics={kpiMetrics} />

      {/* Occupancy Gauge */}
      <OccupancyGauge occupancy={kpiMetrics.occupancyPercentage} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OccupancyTrendChart data={filteredData} />
        <PierOccupancyChart data={filteredData} />
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BerthTypeChart data={filteredData} />
        <OwnershipChart data={filteredData} />
        <LengthChart data={filteredData} />
      </div>
    </div>
  );
}