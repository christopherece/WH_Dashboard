import { BerthRecord } from '../types/berth';
import { calculateBerthTypeOccupancy } from '../utils/dataUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BerthTypeChartProps {
  data: BerthRecord[];
}

export default function BerthTypeChart({ data }: BerthTypeChartProps) {
  const typeData = calculateBerthTypeOccupancy(data);

  const COLORS = ['#1e40af', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#16a34a', '#0891b2', '#65a30d'];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Occupancy by Berth Type</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={typeData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.berthType} (${entry.occupancyPercentage.toFixed(1)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="totalBerths"
          >
            {typeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'occupancyPercentage') return [`${value.toFixed(1)}%`, 'Occupancy'];
              return [value, name];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}