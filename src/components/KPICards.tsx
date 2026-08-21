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
      accent: 'from-navy-700 to-navy-800',
      iconClass: 'bg-navy-100 text-navy-700',
    },
    {
      title: 'Occupied',
      value: metrics.occupied,
      icon: '●',
      accent: 'from-rose-500 to-rose-600',
      iconClass: 'bg-rose-100 text-rose-700',
    },
    {
      title: 'Booked',
      value: metrics.booked,
      icon: '●',
      accent: 'from-amber-400 to-orange-500',
      iconClass: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Available',
      value: metrics.available,
      icon: '●',
      accent: 'from-emerald-500 to-emerald-600',
      iconClass: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Occupancy %',
      value: `${metrics.occupancyPercentage}%`,
      icon: '▣',
      accent: 'from-sky-500 to-blue-600',
      iconClass: 'bg-sky-100 text-sky-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="metric-card"
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{card.value}</p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold ${card.iconClass}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}