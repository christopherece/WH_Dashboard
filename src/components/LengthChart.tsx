import { BerthRecord } from '../types/berth';
import { calculateLengthOccupancy } from '../utils/dataUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LengthChartProps {
  data: BerthRecord[];
}

export default function LengthChart({ data }: LengthChartProps) {
  const lengthData = calculateLengthOccupancy(data);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Occupancy by Actual Berth Length</h3>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={lengthData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="lengthRange" 
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
          <Bar dataKey="available" name="Available" fill="#16a34a" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}