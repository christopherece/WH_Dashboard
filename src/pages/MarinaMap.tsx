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

interface BerthZonePosition {
  x: number;
  startY: number;
  endY: number;
  firstNumber?: number;
  lastNumber: number;
  laneOffset?: number;
}

// Coordinates are percentages of the original 3110 × 1548 marina plan. Berths
// run along the piers vertically, not from left to right.
const BERTH_ZONE_POSITIONS: Record<string, BerthZonePosition> = {
  A: { x: 48.0, startY: 10.2, endY: 39.4, lastNumber: 55 },
  AA: { x: 49.3, startY: 10.2, endY: 36.3, lastNumber: 45 },
  AB: { x: 50.5, startY: 10.2, endY: 37.7, lastNumber: 48 },
  B: { x: 43.5, startY: 9.0, endY: 35.4, lastNumber: 62 },
  C: { x: 38.8, startY: 9.0, endY: 34.8, lastNumber: 53 },
  D: { x: 33.7, startY: 9.2, endY: 33.8, firstNumber: 0, lastNumber: 39 },
  E: { x: 28.5, startY: 10.3, endY: 37.3, lastNumber: 55 },
  EB: { x: 30.5, startY: 10.3, endY: 12.0, lastNumber: 1 },
  EBE: { x: 31.6, startY: 10.3, endY: 13.0, lastNumber: 3 },
  F: { x: 20.8, startY: 10.4, endY: 40.0, lastNumber: 155, laneOffset: 0.55 },
  G: { x: 14.7, startY: 10.4, endY: 39.4, firstNumber: 0, lastNumber: 57 },
  H: { x: 9.9, startY: 10.4, endY: 39.0, lastNumber: 58 },
  JS: { x: 7.1, startY: 10.8, endY: 24.0, lastNumber: 23 },
  SP: { x: 6.8, startY: 44.0, endY: 62.0, lastNumber: 15 },
  K: { x: 8.8, startY: 46.0, endY: 69.0, firstNumber: 2, lastNumber: 56 },
  L: { x: 12.4, startY: 46.0, endY: 77.0, firstNumber: 2, lastNumber: 64 },
  M: { x: 16.2, startY: 46.0, endY: 83.5, firstNumber: 2, lastNumber: 72 },
  N: { x: 19.8, startY: 46.0, endY: 87.0, firstNumber: 2, lastNumber: 74 },
  P: { x: 25.0, startY: 48.0, endY: 90.5, firstNumber: 2, lastNumber: 78 },
  Q: { x: 29.2, startY: 48.0, endY: 92.5, firstNumber: 2, lastNumber: 83 },
  R: { x: 33.0, startY: 48.0, endY: 94.3, lastNumber: 86 },
  S: { x: 37.8, startY: 48.0, endY: 91.0, lastNumber: 112 },
  T: { x: 45.5, startY: 50.0, endY: 89.5, lastNumber: 52 },
  U: { x: 51.3, startY: 50.0, endY: 88.5, lastNumber: 60 },
  V: { x: 57.7, startY: 50.0, endY: 89.0, firstNumber: 0, lastNumber: 68 },
  W: { x: 61.5, startY: 50.0, endY: 89.0, lastNumber: 74 },
  X: { x: 65.3, startY: 50.0, endY: 89.0, lastNumber: 77 },
  Y: { x: 69.5, startY: 49.5, endY: 79.0, lastNumber: 57 },
  YC: { x: 52.5, startY: 85.0, endY: 91.7, lastNumber: 36 },
  Z: { x: 84.5, startY: 76.0, endY: 97.0, firstNumber: 0, lastNumber: 51 },
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
  const firstNumber = zone.firstNumber ?? 1;
  const index = Math.max(0, numericPart - firstNumber);
  const berthCount = Math.max(1, zone.lastNumber - firstNumber + 1);
  const rowCount = Math.ceil(berthCount / 2);
  const rowIndex = Math.floor(index / 2);
  const progress = Math.min(rowIndex / Math.max(rowCount - 1, 1), 1);
  const x = zone.x + (index % 2 === 0 ? -(zone.laneOffset ?? 0.8) : (zone.laneOffset ?? 0.8));
  const y = zone.startY + progress * (zone.endY - zone.startY);

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

        <div className="relative aspect-[3110/1548] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img
            src="/Westhaven Marina Main.png"
            alt="Westhaven marina map"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0">
            {berthMarkers.map(marker => (
              <div
                key={`${marker.code}-${marker.status}`}
                title={`${marker.code}: ${marker.status}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border shadow-sm ring-1 ring-white/70 ${STATUS_COLORS[marker.status] || 'bg-slate-400 border-slate-500 text-white'}`}
                style={{ left: marker.position.left, top: marker.position.top, transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
