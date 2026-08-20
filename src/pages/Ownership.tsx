import { BerthRecord } from '../types/berth';
import { calculateOwnershipOccupancy } from '../utils/dataUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OwnershipProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function Ownership({ data, lastUpdated, onRefresh }: OwnershipProps) {
  const ownershipData = calculateOwnershipOccupancy(data);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ownership Analysis</h1>
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

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Occupancy by Ownership Type</h3>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={ownershipData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="ownershipType" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: any, name: string) => {
                if (name === 'occupancyPercentage') return [`${value.toFixed(1)}%`, 'Occupancy'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="occupied" name="Occupied" fill="#dc2626" stackId="a" />
            <Bar dataKey="booked" name="Booked" fill="#ea580c" stackId="a" />
            <Bar dataKey="available" name="Available" fill="#16a34a" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Ownership Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ownership Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Berths</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupied</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ownershipData.map((ownership) => (
                <tr key={ownership.ownershipType}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ownership.ownershipType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ownership.totalBerths}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ownership.occupied}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ownership.booked}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ownership.available}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ownership.occupancyPercentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}