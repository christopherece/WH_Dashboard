import { useState } from 'react';
import { FilterState } from '../types/berth';

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  uniqueValues: {
    marinas: string[];
    piers: (string | number)[];
    berthTypes: string[];
    ownershipTypes: string[];
    berthSizes: number[];
  };
}

const OCCUPANCY_STATUSES = ['Available', 'Rented', 'Booked', 'Future Booking', 'Future Rental'];

export default function FilterPanel({ filters, onFilterChange, onClearFilters, uniqueValues }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== null && v !== undefined).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 text-sm font-normal text-navy-600">
              ({activeFilterCount} active)
            </span>
          )}
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-navy-600 hover:text-navy-800"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Marina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marina</label>
            <select
              value={filters.marina || ''}
              onChange={(e) => handleFilterChange('marina', e.target.value || null)}
              className="select"
            >
              <option value="">All Marinas</option>
              {uniqueValues.marinas.map((marina) => (
                <option key={marina} value={marina}>{marina}</option>
              ))}
            </select>
          </div>

          {/* Pier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pier</label>
            <select
              value={filters.pier || ''}
              onChange={(e) => handleFilterChange('pier', e.target.value || null)}
              className="select"
            >
              <option value="">All Piers</option>
              {uniqueValues.piers.map((pier) => (
                <option key={pier} value={pier}>Pier {pier}</option>
              ))}
            </select>
          </div>

          {/* Berth Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Berth Type</label>
            <select
              value={filters.berthType || ''}
              onChange={(e) => handleFilterChange('berthType', e.target.value || null)}
              className="select"
            >
              <option value="">All Types</option>
              {uniqueValues.berthTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Ownership Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Type</label>
            <select
              value={filters.ownershipType || ''}
              onChange={(e) => handleFilterChange('ownershipType', e.target.value || null)}
              className="select"
            >
              <option value="">All Ownership Types</option>
              {uniqueValues.ownershipTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Berth Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Berth Size (Length)</label>
            <select
              value={filters.berthSize || ''}
              onChange={(e) => handleFilterChange('berthSize', e.target.value ? Number(e.target.value) : null)}
              className="select"
            >
              <option value="">All Sizes</option>
              {uniqueValues.berthSizes.map((size) => (
                <option key={size} value={size}>{size}m</option>
              ))}
            </select>
          </div>

          {/* Occupancy Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Occupancy Status</label>
            <select
              value={filters.occupancyStatus || ''}
              onChange={(e) => handleFilterChange('occupancyStatus', e.target.value || null)}
              className="select"
            >
              <option value="">All Statuses</option>
              {OCCUPANCY_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end space-x-2 lg:col-span-2">
            <button
              onClick={onClearFilters}
              className="btn btn-secondary flex-1"
            >
              Clear Filters
            </button>
            <button
              onClick={() => onFilterChange({
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
              })}
              className="btn btn-primary flex-1"
            >
              Reset Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.marina && (
            <FilterChip label={`Marina: ${filters.marina}`} onRemove={() => handleFilterChange('marina', null)} />
          )}
          {filters.pier && (
            <FilterChip label={`Pier: ${filters.pier}`} onRemove={() => handleFilterChange('pier', null)} />
          )}
          {filters.berthType && (
            <FilterChip label={`Type: ${filters.berthType}`} onRemove={() => handleFilterChange('berthType', null)} />
          )}
          {filters.ownershipType && (
            <FilterChip label={`Ownership: ${filters.ownershipType}`} onRemove={() => handleFilterChange('ownershipType', null)} />
          )}
          {filters.berthSize && (
            <FilterChip label={`Size: ${filters.berthSize}m`} onRemove={() => handleFilterChange('berthSize', null)} />
          )}
          {filters.occupancyStatus && (
            <FilterChip label={`Status: ${filters.occupancyStatus}`} onRemove={() => handleFilterChange('occupancyStatus', null)} />
          )}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <div className="inline-flex items-center bg-navy-100 text-navy-800 text-sm px-3 py-1 rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="ml-2 text-navy-600 hover:text-navy-800"
      >
        ×
      </button>
    </div>
  );
}