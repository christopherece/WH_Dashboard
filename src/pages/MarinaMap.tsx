import { useMemo } from 'react';
import { BerthRecord } from '../types/berth';

interface MarinaMapProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-emerald-500 border-emerald-600 text-white',
  Rented: 'bg-rose-500 border-rose-600 text-white',
  Booked: 'bg-amber-500 border-amber-600 text-white',
  'Future Booking': 'bg-sky-500 border-sky-600 text-white',
  'Future Rental': 'bg-violet-500 border-violet-600 text-white',
};

function normalizeBerthCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

const BERTH_ZONE_POSITIONS: Record<string, { x: number; y: number; stepX: number; rowOffset: number }> = {
  A: { x: 12, y: 18, stepX: 2.2, rowOffset: 0 },
  AA: { x: 18, y: 24, stepX: 2.2, rowOffset: 0 },
  AB: { x: 24, y: 24, stepX: 2.2, rowOffset: 0 },
  B: { x: 32, y: 18, stepX: 2.2, rowOffset: 0 },
  C: { x: 41, y: 18, stepX: 2.2, rowOffset: 0 },
  D: { x: 50, y: 18, stepX: 2.2, rowOffset: 0 },
  E: { x: 59, y: 18, stepX: 2.2, rowOffset: 0 },
  EB: { x: 67, y: 30, stepX: 2.1, rowOffset: 0 },
  EBE: { x: 74, y: 39, stepX: 1.9, rowOffset: 0 },
  ELLIOTT: { x: 81, y: 54, stepX: 1.8, rowOffset: 0 },
  F: { x: 10, y: 46, stepX: 2.1, rowOffset: 0 },
  G: { x: 19, y: 46, stepX: 2.1, rowOffset: 0 },
  H: { x: 29, y: 46, stepX: 2.1, rowOffset: 0 },
  JS: { x: 39, y: 46, stepX: 2.0, rowOffset: 0 },
  K: { x: 48, y: 46, stepX: 2.0, rowOffset: 0 },
  L: { x: 58, y: 46, stepX: 2.0, rowOffset: 0 },
  M: { x: 15, y: 63, stepX: 2.2, rowOffset: 0 },
  N: { x: 25, y: 63, stepX: 2.2, rowOffset: 0 },
  P: { x: 35, y: 63, stepX: 2.2, rowOffset: 0 },
  Q: { x: 44, y: 63, stepX: 2.2, rowOffset: 0 },
  R: { x: 53, y: 63, stepX: 2.2, rowOffset: 0 },
  S: { x: 62, y: 63, stepX: 2.1, rowOffset: 0 },
  SP: { x: 70, y: 63, stepX: 1.8, rowOffset: 0 },
  T: { x: 18, y: 77, stepX: 1.9, rowOffset: 0 },
  U: { x: 27, y: 77, stepX: 1.9, rowOffset: 0 },
  V: { x: 36, y: 77, stepX: 1.9, rowOffset: 0 },
  W: { x: 46, y: 77, stepX: 1.9, rowOffset: 0 },
  X: { x: 56, y: 77, stepX: 1.9, rowOffset: 0 },
  Y: { x: 18, y: 89, stepX: 1.8, rowOffset: 0 },
  YC: { x: 28, y: 89, stepX: 1.8, rowOffset: 0 },
  YEND: { x: 38, y: 89, stepX: 1.8, rowOffset: 0 },
  Z: { x: 50, y: 89, stepX: 1.8, rowOffset: 0 },
};

function getMarkerPosition(code: string) {
  const normalized = normalizeBerthCode(code);
  const match = normalized.match(/^([A-Z]+)(\d+)/);

  const prefix = match ? match[1] : normalized.replace(/\d+/g, '');
  const numericPart = match ? Number(match[2]) : 1;

  const zoneKey = Object.keys(BERTH_ZONE_POSITIONS)
    .sort((a, b) => b.length - a.length)
    .find(zone => prefix === zone || prefix.startsWith(zone)) || 'A';

  const zone = BERTH_ZONE_POSITIONS[zoneKey] || BERTH_ZONE_POSITIONS.A;
  const index = Math.max(0, numericPart - 1);
  const x = zone.x + index * zone.stepX;
  const y = zone.y + (index > 12 ? 0.6 : 0) + zone.rowOffset;

  return {
    left: `${Math.min(Math.max(x, 4), 96)}%`,
    top: `${Math.min(Math.max(y, 8), 94)}%`,
  };
}

export default function MarinaMap({ data, lastUpdated, onRefresh }: MarinaMapProps) {
  const berthMarkers = useMemo(() => {
    const active = data.filter(record => record.berthStatus === 'Active' && record.berth);

    return active
      .map(record => {
        const code = normalizeBerthCode(record.berth);
        return {
          code,
          status: record.occupancyStatus || 'Available',
          position: getMarkerPosition(code),
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data]);

  const summary = {
    available: berthMarkers.filter(item => item.status === 'Available').length,
    rented: berthMarkers.filter(item => item.status === 'Rented').length,
    booked: berthMarkers.filter(item => item.status === 'Booked').length,
    future: berthMarkers.filter(item => item.status === 'Future Booking' || item.status === 'Future Rental').length,
  };

  return (
    <div className="dashboard-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marina Map</h1>
          <p className="page-subtitle">
            Data Last Updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
          </p>
        </div>
        <button onClick={onRefresh} className="btn btn-secondary">
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
          <p className="text-sm font-medium text-slate-500">Available</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.available}</p>
        </div>
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <p className="text-sm font-medium text-slate-500">Rented</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.rented}</p>
        </div>
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <p className="text-sm font-medium text-slate-500">Booked</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.booked}</p>
        </div>
        <div className="metric-card">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-violet-500" />
          <p className="text-sm font-medium text-slate-500">Future</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.future}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="card-title">Berth Availability Map</h3>
            <p className="mt-1 text-sm text-slate-500">Colored berth markers reflect current occupancy status.</p>
          </div>
          <div className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
            {berthMarkers.length} active berths
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img
            src="/Westhaven Marina Main.png"
            alt="Westhaven marina map"
            className="h-[760px] w-full object-contain object-center"
          />

          <div className="absolute inset-0">
            {berthMarkers.map(marker => (
              <div
                key={`${marker.code}-${marker.status}`}
                title={`${marker.code}: ${marker.status}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[5px] font-bold shadow-sm ${STATUS_COLORS[marker.status] || 'bg-slate-400 border-slate-500 text-white'}`}
                style={{ left: marker.position.left, top: marker.position.top, transform: 'translate(-50%, -50%)' }}
              >
                {marker.code.replace(/\D+/, '')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
