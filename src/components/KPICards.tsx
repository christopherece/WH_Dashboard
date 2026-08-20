import { KPIMetrics } from '../types/berth';

interface KPICardsProps {
  metrics: KPIMetrics;
}

export default function KPICards({ metrics }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Active Berths',
      value: metrics.totalActiveBerths,
      icon: '⚓',
      color: 'navy',
    },
    {
      title: 'Occupied',
      value: metrics.occupied,
      icon: '🔴',
      color: 'red',
    },
    {
      title: 'Booked',
      value: metrics.booked,
      icon: '🟠',
      color: 'orange',
    },
    {
      title: 'Available',
      value: metrics.available,
      icon: '🟢',
      color: 'green',
    },
    {
      title: 'Occupancy %',
      value: `${metrics.occupancyPercentage}%`,
      icon: '📊',
      color: 'blue',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className="text-3xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}