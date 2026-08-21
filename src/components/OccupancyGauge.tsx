import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface OccupancyGaugeProps {
  occupancy: number;
}

const OCCUPANCY_THRESHOLDS = {
  healthy: 60,
  moderate: 80,
};

export default function OccupancyGauge({ occupancy }: OccupancyGaugeProps) {
  const getOccupancyLevel = () => {
    if (occupancy < OCCUPANCY_THRESHOLDS.healthy) return 'healthy';
    if (occupancy < OCCUPANCY_THRESHOLDS.moderate) return 'moderate';
    return 'high';
  };

  const getOccupancyColor = () => {
    const level = getOccupancyLevel();
    switch (level) {
      case 'healthy': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getOccupancyLabel = () => {
    const level = getOccupancyLevel();
    switch (level) {
      case 'healthy': return 'Good Capacity';
      case 'moderate': return 'Moderate';
      case 'high': return 'High Occupancy';
      default: return 'Unknown';
    }
  };

  const data = [
    { name: 'Occupied', value: occupancy, color: getOccupancyColor() },
    { name: 'Available', value: 100 - occupancy, color: '#e5e7eb' },
  ];

  return (
    <div className="w-full rounded-2xl bg-white p-2">
      <div className="flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={240} height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={96}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="transparent"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-4xl font-bold text-gray-900">{occupancy.toFixed(1)}%</span>
            <span className="text-sm text-gray-600">{getOccupancyLabel()}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-600">
        <div className="flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></div>
          <span>Healthy</span>
        </div>
        <div className="flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2"></div>
          <span>Moderate</span>
        </div>
        <div className="flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}