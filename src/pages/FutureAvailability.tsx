import { useState } from 'react';
import { BerthRecord, FilterState } from '../types/berth';
import { getProjectedStatus, filterData } from '../utils/dataUtils';

interface FutureAvailabilityProps {
  allData: BerthRecord[];
  filters: FilterState;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function FutureAvailability({ allData, filters, lastUpdated, onRefresh }: FutureAvailabilityProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Project every active berth onto the selected date. The occupancy-status
  // filter describes today's status, so it is not applied to a projection.
  const berthsInScope = filterData(allData, { ...filters, occupancyStatus: null })
    .filter(r => r.berthStatus === 'Active');
  const projected = berthsInScope.map(r => getProjectedStatus(r, selectedDate));

  const occupied = projected.filter(s => s === 'Rented').length;
  const booked = projected.filter(s => s === 'Booked').length;
  const available = projected.filter(s => s === 'Available').length;
  const total = berthsInScope.length;
  const occupancyPercentage = total > 0 ? ((occupied + booked) / total) * 100 : 0;

  // Build yyyy-mm-dd from local parts; toISOString() is UTC and shows the
  // previous day for most of the morning in NZ.
  const toInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Future Availability</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data Last Updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="btn btn-secondary"
        >
          Refresh Data
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Currently Projected Availability</strong> - Future availability is based on each berth's current or next booking/rental in the source data. Agreements after that one are not in the export, so projections far ahead may overstate availability.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Select Future Date</h3>
        </div>
        <input
          type="date"
          value={toInputValue(selectedDate)}
          onChange={(e) => {
            if (!e.target.value) return;
            const [year, month, day] = e.target.value.split('-').map(Number);
            setSelectedDate(new Date(year, month - 1, day));
          }}
          className="input max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Projected Date</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatDate(selectedDate)}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Berths</p>
          <p className="text-xl font-bold text-navy-700 mt-1">{total}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Occupied/Booked</p>
          <p className="text-xl font-bold text-red-600 mt-1">{occupied + booked}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Available</p>
          <p className="text-xl font-bold text-green-600 mt-1">{available}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Projected Occupancy: {occupancyPercentage.toFixed(1)}%</h3>
        </div>
        <div className="text-sm text-gray-600">
          As of {formatDate(selectedDate)}, {available} berths are projected to be available out of {total} total berths.
        </div>
      </div>
    </div>
  );
}