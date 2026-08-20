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
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Occupancy Rate</h3>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-gray-900">{occupancy.toFixed(1)}%</span>
            <span className="text-sm text-gray-600">{getOccupancyLabel()}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span className="text-gray-600">0-60%: Healthy</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-gray-600">60-80%: Moderate</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span className="text-gray-600">80%+: High</span>
        </div>
      </div>
    </div>
  );
}