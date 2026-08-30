import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BerthRecord } from '../types/berth';

interface CustomerHeatMapProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

interface OriginSummary {
  city: string;
  region: string;
  count: number;
  customers: string[];
  lat: number;
  lng: number;
}

const DEFAULT_VIEW: LatLngTuple = [-41.3, 173.5];

const WORLD_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  auckland: { lat: -36.8485, lng: 174.7633 },
  albany: { lat: -36.725, lng: 174.687 },
  whangaparaoa: { lat: -36.61, lng: 174.73 },
  kumeu: { lat: -36.77, lng: 174.56 },
  waiuku: { lat: -37.25, lng: 174.73 },
  pokeno: { lat: -37.24, lng: 175.02 },
  whangarei: { lat: -35.725, lng: 174.323 },
  hamilton: { lat: -37.787, lng: 175.279 },
  tauranga: { lat: -37.687, lng: 176.165 },
  'bay of plenty': { lat: -37.7, lng: 176.2 },
  taupo: { lat: -38.684, lng: 176.07 },
  rotorua: { lat: -38.136, lng: 176.249 },
  napier: { lat: -39.492, lng: 176.912 },
  'havelock north': { lat: -39.668, lng: 176.88 },
  hastings: { lat: -39.646, lng: 176.842 },
  wellington: { lat: -41.286, lng: 174.776 },
  porirua: { lat: -41.133, lng: 174.84 },
  christchurch: { lat: -43.532, lng: 172.63 },
  roleston: { lat: -43.595, lng: 172.38 },
  dunedin: { lat: -45.878, lng: 170.502 },
  queenstown: { lat: -45.031, lng: 168.662 },
  wanaka: { lat: -44.7, lng: 169.13 },
  nelson: { lat: -41.268, lng: 173.283 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  brisbane: { lat: -27.4698, lng: 153.0251 },
  london: { lat: 51.5072, lng: -0.1276 },
  paris: { lat: 48.8566, lng: 2.3522 },
  berlin: { lat: 52.52, lng: 13.405 },
  newyork: { lat: 40.7128, lng: -74.006 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  losangeles: { lat: 34.0522, lng: -118.2437 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  hongkong: { lat: 22.3193, lng: 114.1694 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  seoul: { lat: 37.5665, lng: 126.978 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  perth: { lat: -31.9505, lng: 115.8605 },
};

const normalizeLocation = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';

  const cleaned = String(value)
    .replace(/\bNULL\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  return cleaned || 'Unknown';
};

const normalizeCity = (input: string): string => {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return 'unknown';

  const aliasMap: Record<string, string> = {
    'auckland city': 'auckland',
    'albany auckland': 'albany',
    'bay of plenty nz': 'bay of plenty',
    'bay of plenty': 'bay of plenty',
    'whangaparaoa beach': 'whangaparaoa',
    'havelock north hawke s bay': 'havelock north',
    'christchurch city': 'christchurch',
    'wellington city': 'wellington',
    'new zealand': 'auckland',
    'australia': 'sydney',
    'canada': 'toronto',
    'united kingdom': 'london',
    'uk': 'london',
    'usa': 'newyork',
    'us': 'newyork',
    'united states': 'newyork',
    'united states of america': 'newyork',
    'united arab emirates': 'dubai',
    'singapore city': 'singapore',
    'hong kong city': 'hongkong',
    'tokyo city': 'tokyo',
    'seoul city': 'seoul',
    'england': 'london',
    'scotland': 'london',
    'wales': 'london',
    'northern ireland': 'london',
  };

  return aliasMap[normalized] || normalized;
};

const getLocationAlias = (input: string): string => {
  const value = normalizeLocation(input);
  const lower = value.toLowerCase();

  if (lower.includes('united states') || lower.includes('usa') || lower.includes('us')) return 'newyork';
  if (lower.includes('canada')) return 'toronto';
  if (lower.includes('united kingdom') || lower.includes('uk') || lower.includes('england') || lower.includes('scotland') || lower.includes('wales')) return 'london';
  if (lower.includes('australia')) return 'sydney';
  if (lower.includes('new zealand')) return 'auckland';
  if (lower.includes('singapore')) return 'singapore';
  if (lower.includes('hong kong')) return 'hongkong';
  if (lower.includes('tokyo')) return 'tokyo';
  if (lower.includes('seoul')) return 'seoul';
  if (lower.includes('dubai')) return 'dubai';
  if (lower.includes('france') || lower.includes('paris')) return 'paris';
  if (lower.includes('germany') || lower.includes('berlin')) return 'berlin';
  if (lower.includes('los angeles')) return 'losangeles';
  if (lower.includes('new york')) return 'newyork';
  if (lower.includes('chicago')) return 'chicago';

  return normalizeCity(value);
};

const getCustomerLocation = (record: BerthRecord): string => {
  const values = [
    record.customerAddressLine5,
    record.customerAddressLine4,
    record.customerAddressLine3,
    record.customerAddressLine2,
    record.customerAddressLine1,
    record.customerCity,
    record.customerRegion,
    record.customerCountryCode,
  ];

  for (const value of values) {
    const normalized = normalizeLocation(value);
    if (normalized && normalized !== 'Unknown' && normalized.toUpperCase() !== 'NULL') {
      const lower = normalized.toLowerCase();
      if (lower.includes('po box') || lower.includes('p.o. box')) {
        continue;
      }
      return normalized;
    }
  }

  return 'Unknown';
};

const getCityPosition = (city: string): { lat: number; lng: number } => {
  const normalized = getLocationAlias(city);
  const found = WORLD_CITY_COORDS[normalized];

  if (found) return found;

  const lower = normalized.toLowerCase();
  if (lower.includes('auckland') || lower.includes('albany')) return { lat: -36.8485, lng: 174.7633 };
  if (lower.includes('newyork') || lower.includes('new york')) return { lat: 40.7128, lng: -74.006 };
  if (lower.includes('losangeles') || lower.includes('los angeles')) return { lat: 34.0522, lng: -118.2437 };
  if (lower.includes('chicago')) return { lat: 41.8781, lng: -87.6298 };
  if (lower.includes('toronto')) return { lat: 43.6532, lng: -79.3832 };
  if (lower.includes('london')) return { lat: 51.5072, lng: -0.1276 };
  if (lower.includes('whangarei')) return { lat: -35.725, lng: 174.323 };
  if (lower.includes('hamilton')) return { lat: -37.787, lng: 175.279 };
  if (lower.includes('tauranga') || lower.includes('bay of plenty')) return { lat: -37.687, lng: 176.165 };
  if (lower.includes('taupo') || lower.includes('rotorua')) return { lat: -38.136, lng: 176.249 };
  if (lower.includes('napier') || lower.includes('hastings') || lower.includes('havelock')) return { lat: -39.492, lng: 176.912 };
  if (lower.includes('wellington')) return { lat: -41.286, lng: 174.776 };
  if (lower.includes('christchurch')) return { lat: -43.532, lng: 172.63 };
  if (lower.includes('dunedin')) return { lat: -45.878, lng: 170.502 };
  if (lower.includes('london') || lower.includes('paris') || lower.includes('berlin')) return { lat: 51.5072, lng: 0 };
  if (lower.includes('new york') || lower.includes('chicago') || lower.includes('los angeles') || lower.includes('toronto')) return { lat: 40.71, lng: -95.0 };
  if (lower.includes('singapore') || lower.includes('hong kong') || lower.includes('tokyo') || lower.includes('seoul')) return { lat: 35.6762, lng: 139.6503 };
  if (lower.includes('dubai')) return { lat: 25.2048, lng: 55.2708 };
  if (lower.includes('sydney') || lower.includes('melbourne') || lower.includes('brisbane') || lower.includes('perth')) return { lat: -33.8688, lng: 151.2093 };

  return { lat: -41.3, lng: 173.5 };
};

function MapViewController({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.4), { maxZoom: 8, animate: true });
  }, [points, map]);

  return null;
}

export default function CustomerHeatMap({ data, lastUpdated, onRefresh }: CustomerHeatMapProps) {
  const mapRef = useRef<any>(null);

  const originData = useMemo(() => {
    const grouped = new Map<string, OriginSummary>();

    data.forEach((record) => {
      const city = getCustomerLocation(record);

      if (!city || city === 'Unknown' || city.toUpperCase() === 'NULL') {
        return;
      }

      const normalizedCity = normalizeCity(city);
      const key = normalizedCity;
      const position = getCityPosition(city);
      const existing = grouped.get(key) ?? {
        city: city,
        region: normalizeLocation(record.customerRegion || record.customerAddressLine4 || record.customerCountryCode || 'New Zealand'),
        count: 0,
        customers: [],
        lat: position.lat,
        lng: position.lng,
      };

      existing.count += 1;
      const customerName = normalizeLocation(record.customerName);
      if (customerName !== 'Unknown' && !existing.customers.includes(customerName)) {
        existing.customers.push(customerName);
      }

      existing.lat = position.lat;
      existing.lng = position.lng;
      grouped.set(key, existing);
    });

    return [...grouped.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [data]);

  const maxCount = Math.max(...originData.map((item) => item.count), 1);

  const totalCustomersWithLocation = data.filter((record) => {
    const city = getCustomerLocation(record);
    return city !== 'Unknown' && city.trim().toUpperCase() !== 'NULL';
  }).length;
  const strongestOrigin = originData[0];

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => {
    if (originData.length > 0) {
      const bounds = L.latLngBounds(originData.map((entry) => [entry.lat, entry.lng] as [number, number]));
      mapRef.current?.fitBounds(bounds.pad(0.4), { maxZoom: 8, animate: true });
    } else {
      mapRef.current?.flyTo(DEFAULT_VIEW, 5, { animate: true, duration: 0.8 });
    }
  };

  return (
    <div className="dashboard-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Heat Map</h1>
          <p className="page-subtitle">
            Customer locations plotted by real geography and concentration.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onRefresh} className="btn btn-secondary">
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <p className="text-sm text-slate-500">Customers with address data</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{totalCustomersWithLocation}</p>
        </div>

        <div className="metric-card">
          <p className="text-sm text-slate-500">Active origin clusters</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{originData.length}</p>
        </div>

        <div className="metric-card">
          <p className="text-sm text-slate-500">Top region</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{strongestOrigin ? strongestOrigin.city : 'N/A'}</p>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.9fr] gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="card-title">Customer distribution</h3>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Last updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
            </span>
          </div>

          <div className="relative h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner shadow-slate-200/80">
            <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white/90 text-lg font-semibold text-slate-700 shadow-sm hover:bg-white"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white/90 text-lg font-semibold text-slate-700 shadow-sm hover:bg-white"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-9 rounded-lg border border-slate-200 bg-white/90 px-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-white"
              >
                Reset
              </button>
            </div>

            <div className="absolute inset-0">
              <MapContainer
                ref={mapRef}
                center={DEFAULT_VIEW}
                zoom={5}
                minZoom={2}
                maxZoom={12}
                scrollWheelZoom
                zoomControl={false}
                className="h-full w-full"
                style={{ background: '#dfeef8' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewController points={originData.map((entry) => ({ lat: entry.lat, lng: entry.lng }))} />

                {originData.map((entry) => (
                  <CircleMarker
                    key={entry.city}
                    center={[entry.lat, entry.lng]}
                    radius={Math.max(9, 8 + (entry.count / maxCount) * 28)}
                    pathOptions={{
                      color: '#1d4ed8',
                      fillColor: '#1d4ed8',
                      fillOpacity: 0.72,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-slate-800">{entry.city}</div>
                        <div className="text-slate-600">{entry.region}</div>
                        <div className="mt-1 font-medium text-blue-700">{entry.count} customers</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top customer origins</h3>
          </div>

          <div className="space-y-4">
            {originData.length > 0 ? (
              originData.map((entry) => {
                const width = (entry.count / maxCount) * 100;

                return (
                  <div key={entry.city} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{entry.city}</p>
                        <p className="text-xs text-slate-500">{entry.region}</p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {entry.count}
                      </span>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No customer locations were detected from the current workbook data.
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
