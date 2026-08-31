import { useEffect, useMemo, useState } from 'react';
import { ReversionRecord } from '../types/berth';
import { excelService } from '../services/excelService';
import { exportToCSV } from '../utils/dataUtils';

interface ReversionReportProps {
  onRefresh: () => void;
}

type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'trustGroup'
  | 'ownershipType'
  | 'owner'
  | 'pier'
  | 'berth'
  | 'berthType'
  | 'berthLength'
  | 'occupancyStatus'
  | 'occupier'
  | 'occupierType'
  | 'rentalStartDate'
  | 'rentalEndDate';

const ENDING_OWNERSHIP_TYPES = new Set(['WEMT 2026', 'WEMT ACC 2026']);

const isOccupiedLike = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === 'occupied' || normalized === 'booked' || normalized === 'rented';
};

const isVacantLike = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === 'vacant' || normalized === 'available';
};

export default function ReversionReport({ onRefresh }: ReversionReportProps) {
  const [data, setData] = useState<ReversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<string[]>(['WEMT 2026', 'WEMT ACC 2026']);
  const [showOwnershipOptions, setShowOwnershipOptions] = useState(false);
  const [berthTypeFilter, setBerthTypeFilter] = useState<string[]>([]);
  const [showBerthTypeOptions, setShowBerthTypeOptions] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<number | null>(null);
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('pier');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await excelService.loadReversionData());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the reversion report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const ownershipTypes = useMemo(
    () => [...new Set(data.map((item) => item.ownershipType).filter(Boolean))].sort(),
    [data]
  );
  const berthTypes = useMemo(
    () => [...new Set(data.map((item) => item.berthType).filter(Boolean))].sort(),
    [data]
  );
  const berthLengths = useMemo(
    () =>
      [...new Set(data.map((item) => Math.round(item.berthLength)).filter((length) => length > 0))].sort(
        (a, b) => a - b
      ),
    [data]
  );
  const occupancyStatuses = useMemo(() => ['Occupied', 'Vacant', 'Booked'], []);

  const baseFilteredData = useMemo(
    () =>
      data.filter((item) => {
        const searchTarget = [
          item.trustGroup,
          item.ownershipType,
          item.owner || '',
          String(item.pier),
          item.berth,
          item.berthType,
          item.occupancyStatus,
          item.occupier || '',
          item.occupierType || '',
        ]
          .join(' ')
          .toLowerCase();

        return (
          (!ownershipFilter.length || ownershipFilter.includes(item.ownershipType)) &&
          (!berthTypeFilter.length || berthTypeFilter.includes(item.berthType)) &&
          (lengthFilter === null || Math.round(item.berthLength) === lengthFilter) &&
          (!searchText.trim() || searchTarget.includes(searchText.toLowerCase().trim()))
        );
      }),
    [data, ownershipFilter, berthTypeFilter, lengthFilter, searchText]
  );

  const displayData = useMemo(
    () => baseFilteredData.filter((item) => occupancyFilter === 'all' || item.occupancyStatus === occupancyFilter),
    [baseFilteredData, occupancyFilter]
  );

  const sortedDisplayData = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...displayData].sort((a, b) => {
      const getValue = (record: ReversionRecord): string | number => {
        switch (sortKey) {
          case 'berthLength':
            return record.berthLength || 0;
          case 'rentalStartDate':
            return record.rentalStartDate?.getTime() || 0;
          case 'rentalEndDate':
            return record.rentalEndDate?.getTime() || 0;
          case 'pier':
            return String(record.pier).toLowerCase();
          case 'trustGroup':
          case 'ownershipType':
          case 'owner':
          case 'berth':
          case 'berthType':
          case 'occupancyStatus':
          case 'occupier':
          case 'occupierType':
            return String(record[sortKey] || '').toLowerCase();
          default:
            return '';
        }
      };

      const aValue = getValue(a);
      const bValue = getValue(b);

      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [displayData, sortDirection, sortKey]);

  const summary = useMemo(
    () => ({
      total: displayData.length,
      occupied: displayData.filter((item) => isOccupiedLike(item.occupancyStatus)).length,
      booked: displayData.filter((item) => item.occupancyStatus.toLowerCase() === 'booked').length,
      vacant: displayData.filter((item) => isVacantLike(item.occupancyStatus)).length,
    }),
    [displayData]
  );

  const sizeAvailability = useMemo(() => {
    const byLength = new Map<
      number,
      { length: number; total: number; occupied: number; available: number; availableBerths: string[] }
    >();

    baseFilteredData.forEach((item) => {
      const length = Math.round(item.berthLength);
      if (!length) return;

      const current = byLength.get(length) || {
        length,
        total: 0,
        occupied: 0,
        available: 0,
        availableBerths: [],
      };

      current.total++;
      if (isOccupiedLike(item.occupancyStatus)) current.occupied++;

      if (isVacantLike(item.occupancyStatus)) {
        current.available++;
        current.availableBerths.push(`Pier ${item.pier}`);
      }

      byLength.set(length, current);
    });

    return [...byLength.values()]
      .map((item) => ({
        ...item,
        occupancyPercent: item.total ? (item.occupied / item.total) * 100 : 0,
        availableBerths: [...new Set(item.availableBerths)],
      }))
      .sort((a, b) => a.length - b.length);
  }, [baseFilteredData]);

  const reversionAnalysis = useMemo(() => {
    const isDate = (date: Date | null, year: number, month: number, day: number) =>
      Boolean(date && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day);

    const wemtRecords = data.filter((item) => ENDING_OWNERSHIP_TYPES.has(item.ownershipType));
    const occupiedRecords = wemtRecords.filter((item) => item.occupancyStatus.toLowerCase() === 'occupied');
    const reversionStartDate = new Date(2026, 8, 30);

    const activeRentalsNotOnContinuationTerm = occupiedRecords.filter(
      (item) => Boolean(item.rentalStartDate && item.rentalStartDate >= reversionStartDate) &&
        !isDate(item.rentalEndDate, 2029, 4, 2)
    );

    const activeRentalsNotContinuing = occupiedRecords.filter(
      (item) => Boolean(item.rentalStartDate && item.rentalStartDate >= reversionStartDate) &&
        !isDate(item.rentalEndDate, 2029, 4, 2)
    );

    const continuingRecords = wemtRecords.filter(
      (item) => isDate(item.rentalStartDate, 2026, 9, 30) && isDate(item.rentalEndDate, 2029, 4, 2)
    );

    return {
      total: wemtRecords.length,
      occupied: occupiedRecords.length,
      vacant: wemtRecords.filter((item) => item.occupancyStatus.toLowerCase() === 'vacant').length,
      activeRentalsNotContinuing,
      continuingRecords,
      notContinuing: wemtRecords.length - continuingRecords.length - activeRentalsNotOnContinuationTerm.length,
    };
  }, [data]);

  const formatDate = (date: Date | null) => (date ? date.toLocaleDateString('en-NZ') : '-');

  const handleExport = () => {
    exportToCSV(
      sortedDisplayData.map((item) => ({
        'Trust Group': item.trustGroup,
        'Ownership Type': item.ownershipType,
        'Customer ID': item.customerId || '',
        Owner: item.owner || '',
        Pier: item.pier,
        Berth: item.berth,
        'Berth Type': item.berthType,
        'Berth Length (m)': Math.round(item.berthLength),
        'Occupancy Status': item.occupancyStatus,
        Occupier: item.occupier || '',
        'Occupier Type': item.occupierType || '',
        'Rental Start Date': formatDate(item.rentalStartDate),
        'Rental End Date': formatDate(item.rentalEndDate),
        'Rental Agreement ID': item.rentalAgreementId || '',
      })),
      'reversion-master-query-report.csv'
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const sortMarker = (key: SortKey) => {
    if (sortKey !== key) return ' '; // keeps header widths stable
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  if (loading) return <div className="p-6 text-gray-600">Loading reversion report...</div>;
  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-secondary mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reversion Master Query Report</h1>
          <p className="mt-1 text-sm text-gray-600">Source: ReversionMasterQuery.xlsx</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={handleExport} disabled={!displayData.length} className="btn btn-primary">Export Report</button>
          <button onClick={() => { onRefresh(); loadData(); }} className="btn btn-secondary">Refresh Data</button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Snapshot note: this report is intended to show the position at 30 Sep 2026 and assumes no active Future Rental or Future Booking lines are included.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['Total Active RMA', summary.total, 'text-gray-900'],
          ['Occupied incl. Booked', summary.occupied, 'text-green-600'],
          ['Booked', summary.booked, 'text-blue-600'],
          ['Vacant', summary.vacant, 'text-yellow-600'],
        ].map(([label, value, colour]) => (
          <div className="card" key={label as string}>
            <div className="p-4">
              <p className="text-sm text-gray-600">{label}</p>
              <p className={`text-2xl font-bold ${colour}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Reversion Continuation Summary</h2>
            <p className="mt-1 text-sm text-gray-600">
              A tenancy is continuing after the reversion only when its rental starts on 30 Sep 2026 and ends on 2 Apr 2029.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600">WEMT berths</p>
            <p className="text-2xl font-bold text-gray-900">{reversionAnalysis.total}</p>
            <p className="text-xs text-gray-400">WEMT 2026 + WEMT ACC 2026</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Continuing after reversion</p>
            <p className="text-2xl font-bold text-blue-600">{reversionAnalysis.continuingRecords.length}</p>
            <p className="text-xs text-gray-400">30 Sep 2026 - 2 Apr 2029 term</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Not continuing on this term</p>
            <p className="text-2xl font-bold text-yellow-600">{reversionAnalysis.notContinuing}</p>
            <p className="text-xs text-gray-400">excludes active rentals with a different end date</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active rentals, different end date</p>
            <p className={`text-2xl font-bold ${reversionAnalysis.activeRentalsNotContinuing.length ? 'text-red-600' : 'text-green-600'}`}>
              {reversionAnalysis.activeRentalsNotContinuing.length}
            </p>
            <p className="text-xs text-gray-400">starts 30 Sep 2026 or later; not ending 2 Apr 2029</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Filter Options</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOwnershipOptions((show) => !show)}
              className="select flex w-full items-center justify-between text-left"
            >
              <span className="truncate">
                {ownershipFilter.length
                  ? `${ownershipFilter.length} ownership type${ownershipFilter.length === 1 ? '' : 's'} selected`
                  : 'All ownership types'}
              </span>
              <span className="ml-2">v</span>
            </button>
            {showOwnershipOptions && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-lg">
                {ownershipTypes.map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={ownershipFilter.includes(value)}
                      onChange={() =>
                        setOwnershipFilter((selected) =>
                          selected.includes(value)
                            ? selected.filter((item) => item !== value)
                            : [...selected, value]
                        )
                      }
                      className="form-checkbox"
                    />
                    {value}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setOwnershipFilter([])}
                  className="mt-2 w-full border-t border-gray-200 pt-2 text-sm text-navy-600 hover:text-navy-800"
                >
                  Clear ownership types
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBerthTypeOptions((show) => !show)}
              className="select flex w-full items-center justify-between text-left"
            >
              <span className="truncate">
                {berthTypeFilter.length
                  ? `${berthTypeFilter.length} berth type${berthTypeFilter.length === 1 ? '' : 's'} selected`
                  : 'All berth types'}
              </span>
              <span className="ml-2">v</span>
            </button>
            {showBerthTypeOptions && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-lg">
                {berthTypes.map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={berthTypeFilter.includes(value)}
                      onChange={() =>
                        setBerthTypeFilter((selected) =>
                          selected.includes(value)
                            ? selected.filter((item) => item !== value)
                            : [...selected, value]
                        )
                      }
                      className="form-checkbox"
                    />
                    {value}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setBerthTypeFilter([])}
                  className="mt-2 w-full border-t border-gray-200 pt-2 text-sm text-navy-600 hover:text-navy-800"
                >
                  Clear berth types
                </button>
              </div>
            )}
          </div>

          <select
            value={lengthFilter === null ? 'all' : String(lengthFilter)}
            onChange={(event) => setLengthFilter(event.target.value === 'all' ? null : Number(event.target.value))}
            className="select"
          >
            <option value="all">All lengths</option>
            {berthLengths.map((length) => (
              <option key={length} value={length}>{length} m</option>
            ))}
          </select>

          <select value={occupancyFilter} onChange={(event) => setOccupancyFilter(event.target.value)} className="select">
            <option value="all">All occupancy statuses</option>
            {occupancyStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search berth, owner, occupier..."
            className="input"
          />

          <button
            type="button"
            onClick={() => {
              setOwnershipFilter(['WEMT 2026', 'WEMT ACC 2026']);
              setBerthTypeFilter([]);
              setLengthFilter(null);
              setOccupancyFilter('all');
              setSearchText('');
            }}
            className="btn btn-secondary"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Availability by Berth Size</h2>
          <p className="text-sm text-gray-600">Counts reflect the active filters.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Berth Size', 'Total', 'Occupied', 'Available', 'Occupancy %', 'Available Piers'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sizeAvailability.map((item) => (
                <tr key={item.length}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.length} m</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.total}</td>
                  <td className="px-4 py-3 text-sm text-red-700">{item.occupied}</td>
                  <td className="px-4 py-3 text-sm text-green-700">{item.available}</td>
                  <td className="px-4 py-3 text-sm text-blue-700">{item.occupancyPercent.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.availableBerths.length ? item.availableBerths.join(', ') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Berth Reversion Details</h2>
          <p className="text-sm text-gray-600">Showing {sortedDisplayData.length} of {data.length} berths</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('trustGroup')} className="hover:text-gray-700">Trust Group{sortMarker('trustGroup')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('ownershipType')} className="hover:text-gray-700">Ownership Type{sortMarker('ownershipType')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('owner')} className="hover:text-gray-700">Owner{sortMarker('owner')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('pier')} className="hover:text-gray-700">Pier{sortMarker('pier')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('berth')} className="hover:text-gray-700">Berth{sortMarker('berth')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('berthType')} className="hover:text-gray-700">Berth Type{sortMarker('berthType')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('berthLength')} className="hover:text-gray-700">Length{sortMarker('berthLength')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('occupancyStatus')} className="hover:text-gray-700">Occupancy{sortMarker('occupancyStatus')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('occupier')} className="hover:text-gray-700">Occupier{sortMarker('occupier')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('occupierType')} className="hover:text-gray-700">Occupier Type{sortMarker('occupierType')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('rentalStartDate')} className="hover:text-gray-700">Rental Start{sortMarker('rentalStartDate')}</button></th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('rentalEndDate')} className="hover:text-gray-700">Rental End{sortMarker('rentalEndDate')}</button></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedDisplayData.map((item, index) => (
                <tr key={`${item.berth}-${index}`}>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.trustGroup}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.ownershipType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.owner || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.pier}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.berth}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.berthType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.berthLength ? Math.round(item.berthLength) : '-'}{item.berthLength ? ' m' : ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.occupancyStatus}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.occupier || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.occupierType || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.rentalStartDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.rentalEndDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
