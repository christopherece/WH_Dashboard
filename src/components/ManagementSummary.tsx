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

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}