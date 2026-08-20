import { BerthRecord } from '../types/berth';
import { calculatePierOccupancy } from '../utils/dataUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface PierOccupancyChartProps {
  data: BerthRecord[];
}

export default function PierOccupancyChart({ data }: PierOccupancyChartProps) {
  const pierData = calculatePierOccupancy(data);

  const getBarColor = (index: number) => {
    const colors = ['#1e40af', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#16a34a', '#0891b2'];
    return colors[index % colors.length];
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Occupancy by Pier</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={pierData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="pier" type="category" tickFormatter={(value) => `Pier ${value}`} tick={{ fontSize: 12 }} width={60} />
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