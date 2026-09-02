import { BerthRecord } from '../types/berth';
import { calculatePierOccupancy } from '../utils/dataUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

interface PierOccupancyChartProps {
  data: BerthRecord[];
}

export default function PierOccupancyChart({ data }: PierOccupancyChartProps) {
  const pierData = calculatePierOccupancy(data);

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3 className="card-title">Occupancy by Pier</h3>
          <p className="mt-1 text-sm text-slate-500">Stacked berth status across each pier</p>
        </div>
        <div className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
          {pierData.length} piers
        </div>
      </div>

      <div className="h-[680px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pierData} layout="vertical" barSize={28} margin={{ top: 10, right: 28, left: 6, bottom: 10 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#475569', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              dataKey="pier"
              type="category"
              tickFormatter={(value) => `Pier ${value}`}
              tick={{ fill: '#475569', fontSize: 12 }}
              width={110}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08)',
              }}
              formatter={(value: number, name: string) => {
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: '12px' }}
              iconType="circle"
            />
            <Bar dataKey="occupied" name="Occupied" fill="#ef4444" stackId="a" radius={[0, 6, 6, 0]}>
              <LabelList
                dataKey="occupied"
                position="center"
                fill="#fff"
                style={{ fontSize: 13, fontWeight: 700 }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
            <Bar dataKey="booked" name="Booked" fill="#f59e0b" stackId="a" radius={[0, 6, 6, 0]}>
              <LabelList
                dataKey="booked"
                position="center"
                fill="#fff"
                style={{ fontSize: 13, fontWeight: 700 }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
            <Bar dataKey="available" name="Available" fill="#22c55e" stackId="a" radius={[0, 6, 6, 0]}>
              <LabelList
                dataKey="available"
                position="center"
                fill="#fff"
                style={{ fontSize: 13, fontWeight: 700 }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}