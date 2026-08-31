import { useState, useMemo } from 'react';
import { BerthRecord, FilterState } from '../types/berth';
import { exportToCSV, getUniqueValues } from '../utils/dataUtils';
import BerthTable from '../components/BerthTable';
import BerthDetailPanel from '../components/BerthDetailPanel';
import FilterPanel from '../components/FilterPanel';

interface BerthsProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function Berths({ data, lastUpdated, onRefresh }: BerthsProps) {
  const [selectedBerth, setSelectedBerth] = useState<BerthRecord | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
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
    if (filters.berthType && filters.berthType.length > 0) {
      result = result.filter(r => filters.berthType.includes(r.berthType));
    }
    if (filters.ownershipType && filters.ownershipType.length > 0) {
      result = result.filter(r => filters.ownershipType.includes(r.ownershipType));
    }
    if (filters.berthSize) {
      result = result.filter(r => r.nominalLength === filters.berthSize);
    }
    if (filters.occupancyStatus) {
      result = result.filter(r => r.occupancyStatus === filters.occupancyStatus);
    }

    return result;
  }, [data, filters]);

  const uniqueValues = useMemo(() => ({
    marinas: getUniqueValues<string>(data, 'marina'),
    piers: getUniqueValues<string | number>(data, 'pier'),
    berthTypes: getUniqueValues<string>(data, 'berthType'),
    ownershipTypes: getUniqueValues<string>(data, 'ownershipType'),
    berthSizes: getUniqueValues<number>(data, 'nominalLength'),
  }), [data]);

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

  const handleExport = () => {
    exportToCSV(filteredData, 'berth-occupancy.csv');
  };

  const handleBerthClick = (berth: BerthRecord) => {
    setSelectedBerth(berth);
  };

  const handleCloseDetail = () => {
    setSelectedBerth(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Berth Availability</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data Last Updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="btn btn-secondary"
          >
            {showTechnicalDetails ? 'Hide Technical Details' : 'Show Technical Details'}
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary"
          >
            Export CSV
          </button>
          <button
            onClick={onRefresh}
            className="btn btn-secondary"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        uniqueValues={uniqueValues}
      />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Berth Listing ({filteredData.length} berths)</h3>
        </div>
        <BerthTable
          data={filteredData}
          onBerthClick={handleBerthClick}
          showTechnicalDetails={showTechnicalDetails}
        />
      </div>

      {selectedBerth && (
        <BerthDetailPanel
          berth={selectedBerth}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}