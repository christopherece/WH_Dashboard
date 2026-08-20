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
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Management Summary</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-sm text-gray-600">Current Occupancy</p>
          <p className="text-2xl font-bold text-navy-700">{metrics.occupancyPercentage.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Available Berths</p>
          <p className="text-2xl font-bold text-green-600">{metrics.available}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Booked</p>
          <p className="text-2xl font-bold text-orange-600">{metrics.booked}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Rented</p>
          <p className="text-2xl font-bold text-red-600">{metrics.occupied}</p>
        </div>
        {highestOccupancyPier && (
          <div>
            <p className="text-sm text-gray-600">Highest Occupancy Pier</p>
            <p className="text-lg font-semibold text-gray-900">
              Pier {highestOccupancyPier.pier} ({highestOccupancyPier.occupancyPercentage.toFixed(1)}%)
            </p>
          </div>
        )}
        {lowestOccupancyPier && (
          <div>
            <p className="text-sm text-gray-600">Lowest Occupancy Pier</p>
            <p className="text-lg font-semibold text-gray-900">
              Pier {lowestOccupancyPier.pier} ({lowestOccupancyPier.occupancyPercentage.toFixed(1)}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}