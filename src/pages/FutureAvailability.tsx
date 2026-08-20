import { useState } from 'react';
import { BerthRecord, FilterState } from '../types/berth';
import { getFutureAvailability, filterData } from '../utils/dataUtils';

interface FutureAvailabilityProps {
  allData: BerthRecord[];
  filters: FilterState;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function FutureAvailability({ allData, filters, lastUpdated, onRefresh }: FutureAvailabilityProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const futureData = getFutureAvailability(allData, selectedDate);
  const filteredFutureData = filterData(futureData, filters);

  const occupied = filteredFutureData.filter(r => r.occupancyStatus === 'Rented').length;
  const booked = filteredFutureData.filter(r => r.occupancyStatus === 'Booked').length;
  const available = filteredFutureData.filter(r => r.occupancyStatus === 'Available').length;
  const total = filteredFutureData.length;
  const occupancyPercentage = total > 0 ? ((occupied + booked) / total) * 100 : 0;

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
          <strong>Currently Projected Availability</strong> - Future availability is based on bookings and rentals currently recorded in the source data and may change.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Select Future Date</h3>
        </div>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
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