import { useMemo } from 'react';
import { BerthRecord } from '../types/berth';

interface FutureBookingsProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function FutureBookings({ data, lastUpdated, onRefresh }: FutureBookingsProps) {
  const futureRecords = useMemo(() => {
    return data.filter(record =>
      record.occupancyStatus === 'Future Booking' || record.occupancyStatus === 'Future Rental'
    );
  }, [data]);

  const bookingCount = futureRecords.filter(r => r.occupancyStatus === 'Future Booking').length;
  const rentalCount = futureRecords.filter(r => r.occupancyStatus === 'Future Rental').length;

  const formatDate = (value: Date | null) => {
    if (!value) return '—';
    return value.toLocaleDateString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="dashboard-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Future Bookings & Rentals</h1>
          <p className="page-subtitle">
            Data Last Updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
          </p>
        </div>
        <button onClick={onRefresh} className="btn btn-secondary">
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
          <p className="text-sm font-medium text-slate-500">Total Future Commitments</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{futureRecords.length}</p>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <p className="text-sm font-medium text-slate-500">Future Bookings</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{bookingCount}</p>
        </div>

        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <p className="text-sm font-medium text-slate-500">Future Rentals</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rentalCount}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="card-title">Upcoming Commitments</h3>
          <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {futureRecords.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Berth</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Marina</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Pier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vessel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date In</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {futureRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No future booking or rental records found for the current filtered data.
                  </td>
                </tr>
              ) : (
                futureRecords.map((record) => (
                  <tr key={`${record.berthId}-${record.occupancyStatus}-${record.customerName || 'unknown'}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{record.berth || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.marina || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.pier || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.berthType || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                        {record.occupancyStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.customerName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.vesselName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(record.dateIn)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(record.dateOut)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
