import { BerthRecord, KPIMetrics } from '../types/berth';
import { calculatePierOccupancy } from '../utils/dataUtils';

interface ManagementSummaryProps {
  data: BerthRecord[];
  metrics: KPIMetrics;
}

export default function ManagementSummary({ data, metrics }: ManagementSummaryProps) {
  const pierOccupancy = calculatePierOccupancy(data);
  
  const highestOccupancyPier = pierOccupancy.length > 0
    ? pierOccupancy.reduce((max, pier) => pier.occupancyPercentage > max.occupancyPercentage ? pier : max)
    : null;
    
  const lowestOccupancyPier = pierOccupancy.length > 0
    ? pierOccupancy.reduce((min, pier) => pier.occupancyPercentage < min.occupancyPercentage ? pier : min)
    : null;

  // Calculate occupancy by berth length
  const berthLengthOccupancy = data.reduce((acc, berth) => {
    const length = berth.nominalLength || berth.actualLength;
    if (!length) return acc;

    if (!acc[length]) {
      acc[length] = { length, total: 0, occupied: 0 };
    }
    acc[length].total += 1;
    if (berth.occupiedFlag === 1) {
      acc[length].occupied += 1;
    }
    return acc;
  }, {} as Record<number, { length: number; total: number; occupied: number }>);

  const lengthOccupancyArray = Object.values(berthLengthOccupancy)
    .map(item => ({
      ...item,
      occupancyPercentage: (item.occupied / item.total) * 100
    }))
    .sort((a, b) => b.occupancyPercentage - a.occupancyPercentage);

  const top3Lengths = lengthOccupancyArray.slice(0, 3);
  const leastOccupiedLength = lengthOccupancyArray.length > 0 
    ? lengthOccupancyArray[lengthOccupancyArray.length - 1]
    : null;

  return (
    <div className="card bg-gradient-to-br from-slate-50 to-white">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3 className="card-title">Management Summary</h3>
          <p className="mt-1 text-sm text-slate-500">Live operational snapshot</p>
        </div>
        <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Occupancy</p>
          <p className="mt-2 text-2xl font-bold text-navy-700">{metrics.occupancyPercentage.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Available</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{metrics.available}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Booked</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{metrics.booked}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rented</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{metrics.occupied}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Future Booking</p>
          <p className="mt-2 text-2xl font-bold text-indigo-700">{metrics.futureBookings}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Future Rental</p>
          <p className="mt-2 text-2xl font-bold text-sky-700">{metrics.futureRentals}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Vessel Compliance</p>
          <p className="mt-2 text-2xl font-bold text-violet-700">{metrics.vesselComplianceRate.toFixed(1)}%</p>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">Average Age</p>
          <p className="mt-2 text-2xl font-bold text-cyan-700">{metrics.averageAge ? `${metrics.averageAge.toFixed(1)} yrs` : 'N/A'}</p>
        </div>

        {highestOccupancyPier && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Highest Occupancy Pier</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              Pier {highestOccupancyPier.pier} <span className="text-emerald-700">({highestOccupancyPier.occupancyPercentage.toFixed(1)}%)</span>
            </p>
          </div>
        )}

        {lowestOccupancyPier && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Lowest Occupancy Pier</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              Pier {lowestOccupancyPier.pier} <span className="text-amber-700">({lowestOccupancyPier.occupancyPercentage.toFixed(1)}%)</span>
            </p>
          </div>
        )}

        {top3Lengths.length > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">Top Occupied Length</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {top3Lengths[0].length}m <span className="text-teal-700">({top3Lengths[0].occupancyPercentage.toFixed(1)}%)</span>
            </p>
          </div>
        )}

        {leastOccupiedLength && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Least Occupied Length</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {leastOccupiedLength.length}m <span className="text-orange-700">({leastOccupiedLength.occupancyPercentage.toFixed(1)}%)</span>
            </p>
          </div>
        )}
      </div>

      {top3Lengths.length > 1 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Top Occupied Berth Lengths by Percentage</p>
            <p className="text-xs text-slate-500 mt-1">Ranked by occupancy rate (requires min. 2 berths)</p>
          </div>
          <div className="space-y-4">
            {top3Lengths.filter(item => item.total >= 2).map((item, idx) => {
              const medalColors = [
                { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800' },
                { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', bar: 'bg-slate-400', badge: 'bg-slate-200 text-slate-700' },
                { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-800' },
              ];
              const colors = medalColors[idx] || medalColors[2];
              
              return (
                <div key={item.length} className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-500' : 'bg-orange-500'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${colors.text}`}>{item.length}m Berth</p>
                        <p className={`text-xs ${colors.text} opacity-75`}>{item.occupied} occupied of {item.total} total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${colors.text}`}>{item.occupancyPercentage.toFixed(0)}%</p>
                      <p className="text-xs text-slate-500">occupancy</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${colors.bar} transition-all`}
                      style={{ width: `${item.occupancyPercentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            }).slice(0, 3)}
          </div>
        </div>
      )}
    </div>
  );
}