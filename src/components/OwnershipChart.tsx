import { BerthRecord } from '../types/berth';
import { calculateOwnershipOccupancy } from '../utils/dataUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OwnershipChartProps {
  data: BerthRecord[];
}

export default function OwnershipChart({ data }: OwnershipChartProps) {
  const ownershipData = calculateOwnershipOccupancy(data);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Occupancy by Ownership Type</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={ownershipData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="ownershipType" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
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
  );
}