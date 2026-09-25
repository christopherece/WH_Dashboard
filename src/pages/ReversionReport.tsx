import { useEffect, useMemo, useState } from 'react';
import { BerthRecord, ReversionRecord } from '../types/berth';
import { excelService } from '../services/excelService';
import { exportToCSV, startOfDay } from '../utils/dataUtils';

interface ReversionReportProps {
  onRefresh: () => void;
  title?: string;
  subtitle?: string;
  dataLoader?: () => Promise<ReversionRecord[]>;
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
  | 'rentalEndDate'
  | 'reversionOutcome';

const isStrictOccupied = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === 'occupied' || normalized === 'rented';
};

const isBooked = (status: string) => status.toLowerCase() === 'booked';

const isVacantLike = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === 'vacant' || normalized === 'available';
};

const isCurrentRentalTiming = (timing: string | null) =>
  String(timing || '').toLowerCase().includes('current rental');

const isFutureRentalTiming = (timing: string | null) =>
  String(timing || '').toLowerCase().includes('future rental');

const isNoCurrentRentalFound = (rawStatus: string | null) =>
  String(rawStatus || '').toUpperCase().includes('NO CURRENT RENTAL FOUND');

type ReversionView = 'all' | 'leaving' | 'movingBerth' | 'continuing' | 'vacantNoRental' | 'vacantReLet' | 'relocation';

const isOccupiedOrBooked = (item: ReversionRecord) => isStrictOccupied(item.occupancyStatus) || isBooked(item.occupancyStatus);

// No rental line starts 30 Sep on this berth for someone who is on it now.
const hasNoSep30Line = (item: ReversionRecord) => item.hasSep30Rental === false && isOccupiedOrBooked(item);

// Leaving = no 30 Sep line here and the customer isn't starting on another berth either.
const isLeaving = (item: ReversionRecord) => hasNoSep30Line(item) && !item.relocatingTo?.length;

const isMovingBerth = (item: ReversionRecord) => hasNoSep30Line(item) && Boolean(item.relocatingTo?.length);

const isRelocation = (item: ReversionRecord) => Boolean(item.relocatedFrom?.length || item.relocatingTo?.length);

const matchesView = (item: ReversionRecord, view: ReversionView) => {
  switch (view) {
    case 'leaving':
      return isLeaving(item);
    case 'movingBerth':
      return isMovingBerth(item);
    case 'continuing':
      return item.hasSep30Rental === true && !isVacantLike(item.occupancyStatus);
    case 'vacantNoRental':
      return item.hasSep30Rental === false && isVacantLike(item.occupancyStatus);
    case 'vacantReLet':
      return item.hasSep30Rental === true && isVacantLike(item.occupancyStatus);
    case 'relocation':
      return isRelocation(item);
    default:
      return true;
  }
};

type CategoryId = Exclude<ReversionView, 'all' | 'relocation'>;

const REVERSION_CATEGORIES: { id: CategoryId; label: string; colour: string; description: string }[] = [
  { id: 'leaving', label: 'Leaving', colour: 'text-red-600', description: 'Occupied or booked now, no rental line starting 30 Sep, and not moving to another berth' },
  { id: 'movingBerth', label: 'Moving berth', colour: 'text-orange-600', description: 'No 30 Sep line here, but the same customer starts on another berth 30 Sep' },
  { id: 'continuing', label: 'Continuing', colour: 'text-green-600', description: 'Has a 30 Sep line' },
  { id: 'vacantNoRental', label: 'Vacant, no 30 Sep rental', colour: 'text-yellow-600', description: 'Empty now and still empty on 30 Sep' },
  { id: 'vacantReLet', label: 'Vacant, re-let 30 Sep', colour: 'text-blue-600', description: 'Empty now, new rental from 30 Sep' },
];

// Dropdown-only option: both ends of a move (the berth left and the berth taken).
const RELOCATION_OPTION = { id: 'relocation' as const, label: 'Relocations (both berths)' };

const RELOCATION_END_FROM = new Date(2026, 8, 28);
const RELOCATION_END_TO = new Date(2026, 8, 30);

const endsInRelocationWindow = (date: Date | null | undefined) => {
  if (!date) return false;
  const day = startOfDay(date);
  return day >= RELOCATION_END_FROM && day <= RELOCATION_END_TO;
};

/**
 * Links berths where a customer's rental ends 28-30 Sep and the same customer
 * has a rental line starting 30 Sep on a different berth that is changing hands
 * (vacant now, or taken over from another customer). Customers who simply keep
 * one of several berths are not treated as moving. The occupancy report is used
 * to find customers coming from berths outside the reversion workbook.
 */
function linkRelocations(records: ReversionRecord[], occupancy: BerthRecord[] | null): ReversionRecord[] {
  const linked = records.map((item) => ({ ...item, relocatedFrom: [] as string[], relocatingTo: [] as string[] }));
  const reversionBerths = new Set(linked.map((item) => item.berth));

  linked.forEach((destination) => {
    const customerId = destination.nextOccupierId;
    if (!destination.hasSep30Rental || !customerId) return;
    const changingHands = isVacantLike(destination.occupancyStatus) || destination.occupierId !== customerId;
    if (!changingHands) return;

    linked.forEach((origin) => {
      if (
        origin !== destination &&
        origin.occupierId === customerId &&
        origin.nextOccupierId !== customerId &&
        endsInRelocationWindow(origin.rentalEndDate)
      ) {
        destination.relocatedFrom.push(origin.berth);
        origin.relocatingTo.push(destination.berth);
      }
    });

    (occupancy || []).forEach((berth) => {
      if (
        berth.customerId === customerId &&
        berth.berth !== destination.berth &&
        !reversionBerths.has(berth.berth) &&
        endsInRelocationWindow(berth.dateOut)
      ) {
        destination.relocatedFrom.push(`${berth.berth} (non-WEMT)`);
      }
    });
  });

  return linked;
}

const OUTCOME_BADGE: Record<string, string> = {
  'Not Continuing': 'badge badge-danger',
  'Continuing - Same Customer': 'badge badge-success',
  'Continuing - New Customer': 'badge badge-info',
  'Vacant - New Rental 30 Sep': 'badge badge-info',
  'Vacant - No 30 Sep Rental': 'badge badge-warning',
};

const DEFAULT_REVERSION_TITLE = 'Reversion Master Query Report';
const DEFAULT_REVERSION_SUBTITLE = 'Source: ReversionMasterQuery.xlsx';
const AUCKLAND_COUNCIL_CUSTOMER_ID = '25008';

export default function ReversionReport({
  onRefresh,
  title = DEFAULT_REVERSION_TITLE,
  subtitle = DEFAULT_REVERSION_SUBTITLE,
  dataLoader = async () => excelService.loadReversionData(),
}: ReversionReportProps) {
  const [data, setData] = useState<ReversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<string[]>(['WEMT 2026', 'WEMT ACC 2026']);
  const [showOwnershipOptions, setShowOwnershipOptions] = useState(false);
  const [berthTypeFilter, setBerthTypeFilter] = useState<string[]>([]);
  const [showBerthTypeOptions, setShowBerthTypeOptions] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<number[]>([]);
  const [showLengthOptions, setShowLengthOptions] = useState(false);
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  const [rentalTimingFilter, setRentalTimingFilter] = useState('all');
  const [customerOwnershipFilter, setCustomerOwnershipFilter] = useState('all');
  const [includeBookedInOccupancy, setIncludeBookedInOccupancy] = useState(false);
  const [pendingByLength, setPendingByLength] = useState<Record<number, number>>({});
  const [searchText, setSearchText] = useState('');
  const [reversionViews, setReversionViews] = useState<Exclude<ReversionView, 'all'>[]>([]);

  const [showReversionOptions, setShowReversionOptions] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('pier');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await dataLoader();
      setData(linkRelocations(records, excelService.getCachedData()));
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
  const rentalTimings = useMemo(
    () => [...new Set(data.map((item) => item.rentalTiming).filter(Boolean) as string[])].sort(),
    [data]
  );
  const allOwnershipSelected = ownershipTypes.length > 0 && ownershipTypes.every((value) => ownershipFilter.includes(value));
  const allBerthTypesSelected = berthTypes.length > 0 && berthTypes.every((value) => berthTypeFilter.includes(value));
  const allLengthsSelected = berthLengths.length > 0 && berthLengths.every((value) => lengthFilter.includes(value));

  const getCustomerOwnershipCategory = (customerId: string | null) => {
    return String(customerId || '').trim() === AUCKLAND_COUNCIL_CUSTOMER_ID
      ? 'aucklandCouncilOwned'
      : 'private';
  };

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
          item.rentalTiming || '',
          item.nextOccupier || '',
          item.reversionOutcome || '',
        ]
          .join(' ')
          .toLowerCase();

        return (
          (!ownershipFilter.length || ownershipFilter.includes(item.ownershipType)) &&
          (!berthTypeFilter.length || berthTypeFilter.includes(item.berthType)) &&
          (!lengthFilter.length || lengthFilter.includes(Math.round(item.berthLength))) &&
          (rentalTimingFilter === 'all' || item.rentalTiming === rentalTimingFilter) &&
          (customerOwnershipFilter === 'all' || getCustomerOwnershipCategory(item.customerId) === customerOwnershipFilter) &&
          (!searchText.trim() || searchTarget.includes(searchText.toLowerCase().trim()))
        );
      }),
    [data, ownershipFilter, berthTypeFilter, lengthFilter, rentalTimingFilter, customerOwnershipFilter, searchText]
  );

  // The workbook carries the 30 Sep columns only when exported from the WEMT reversion query.
  const hasReversionColumns = useMemo(
    () => data.some((item) => item.hasSep30Rental !== null && item.hasSep30Rental !== undefined),
    [data]
  );

  const displayData = useMemo(
    () =>
      baseFilteredData.filter(
        (item) =>
          (occupancyFilter === 'all' || item.occupancyStatus === occupancyFilter) &&
          (!hasReversionColumns || !reversionViews.length || reversionViews.some((view) => matchesView(item, view)))
      ),
    [baseFilteredData, occupancyFilter, hasReversionColumns, reversionViews]
  );

  // Reversion counts use every filter except the view tiles, so each tile shows its own total.
  const reversionSummary = useMemo(() => {
    const scope = baseFilteredData.filter((item) => occupancyFilter === 'all' || item.occupancyStatus === occupancyFilter);
    const leaving = scope.filter(isLeaving);
    const leavingByType = new Map<string, number>();
    leaving.forEach((item) => {
      const type = item.occupierType || 'Unknown';
      leavingByType.set(type, (leavingByType.get(type) || 0) + 1);
    });

    return {
      total: scope.length,
      leaving: leaving.length,
      movingBerth: scope.filter(isMovingBerth).length,
      continuing: scope.filter((item) => matchesView(item, 'continuing')).length,
      continuingSameCustomer: scope.filter((item) => item.reversionOutcome === 'Continuing - Same Customer').length,
      vacantNoRental: scope.filter((item) => matchesView(item, 'vacantNoRental')).length,
      vacantReLet: scope.filter((item) => matchesView(item, 'vacantReLet')).length,
      vacantReLetRelocations: scope.filter((item) => matchesView(item, 'vacantReLet') && item.relocatedFrom?.length).length,
      continuingRelocations: scope.filter((item) => matchesView(item, 'continuing') && item.relocatedFrom?.length).length,
      relocation: scope.filter(isRelocation).length,
      multipleSep30Lines: scope.filter((item) => (item.sep30LineCount || 0) > 1).length,
      leavingByType: [...leavingByType.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [baseFilteredData, occupancyFilter]);

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
          case 'trustGroup':
          case 'ownershipType':
          case 'owner':
          case 'berthType':
          case 'occupancyStatus':
          case 'occupier':
          case 'occupierType':
          case 'reversionOutcome':
            return String(record[sortKey] || '').toLowerCase();
          default:
            return '';
        }
      };

      if (sortKey === 'pier' || sortKey === 'berth') {
        // Natural order (A2 before A10); berth breaks ties within a pier.
        const compare = (x: string | number, y: string | number) =>
          String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
        const primary = compare(a[sortKey], b[sortKey]);
        return (primary || compare(a.berth, b.berth)) * direction;
      }

      const aValue = getValue(a);
      const bValue = getValue(b);

      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [displayData, sortDirection, sortKey]);

  const summary = useMemo(() => {
    const berthKey = (item: ReversionRecord) => `${item.pier ?? ''}-${item.berth ?? ''}`;

    const futureStatusByBerth = new Map<string, string>();
    data
      .filter((item) => isFutureRentalTiming(item.rentalTiming))
      .forEach((item) => {
        const key = berthKey(item);
        const current = futureStatusByBerth.get(key);
        if (!current || (current !== 'Occupied' && item.occupancyStatus === 'Occupied')) {
          futureStatusByBerth.set(key, item.occupancyStatus);
        }
      });

    const effectiveStatus = (item: ReversionRecord) => {
      if (isCurrentRentalTiming(item.rentalTiming) && isNoCurrentRentalFound(item.rawOccupancyStatus)) {
        return futureStatusByBerth.get(berthKey(item)) || item.occupancyStatus;
      }
      return item.occupancyStatus;
    };

    const occupiedKeys = new Set(
      displayData
        .filter((item) =>
          isStrictOccupied(effectiveStatus(item)) ||
          (includeBookedInOccupancy && isBooked(effectiveStatus(item)))
        )
        .map(berthKey)
    );

    const bookedKeys = new Set(
      displayData
        .filter((item) => effectiveStatus(item).toLowerCase() === 'booked')
        .map(berthKey)
    );

    const vacantKeys = new Set(
      displayData.filter((item) => isVacantLike(effectiveStatus(item))).map(berthKey)
    );

    return {
      total: displayData.length,
      occupied: occupiedKeys.size,
      booked: bookedKeys.size,
      vacant: vacantKeys.size,
    };
  }, [data, displayData, includeBookedInOccupancy]);

  const overallOccupancyPercent = useMemo(
    () => {
      const totalPending = Object.values(pendingByLength).reduce((sum, value) => sum + (Number(value) || 0), 0);
      return summary.total ? ((summary.occupied + totalPending) / summary.total) * 100 : 0;
    },
    [summary, pendingByLength]
  );

  const sizeAvailability = useMemo(() => {
    // The master query returns only the rental current today, so a berth stays
    // taken after reversion when that rental runs through the reversion date.
    const reversionDate = new Date(2026, 8, 30);
    const berthStateByLength = new Map<
      number,
      { length: number; total: number; occupied: number; booked: number; available: number; availableBerths: string[] }
    >();
    const uniqueBerths = new Map<string, { length: number; state: 'occupied' | 'booked' | 'available' }>();

    baseFilteredData.forEach((item) => {
      const length = Math.round(item.berthLength);
      if (!length) return;

      const berthKey = `${item.pier ?? ''}-${item.berth ?? ''}`;
      if (!uniqueBerths.has(berthKey)) {
        uniqueBerths.set(berthKey, { length, state: 'available' });
      }

      const currentState = uniqueBerths.get(berthKey)!;
      if (item.hasSep30Rental !== null && item.hasSep30Rental !== undefined) {
        // Exact answer from the reversion query: is there a rental line starting 30 Sep?
        if (item.hasSep30Rental) {
          const bookedOnly = isBooked(item.nextRentalStatus || '');
          currentState.state = bookedOnly && !includeBookedInOccupancy ? 'booked' : 'occupied';
        }
        return;
      }

      const continuesPastReversion = item.rentalEndDate instanceof Date && !Number.isNaN(item.rentalEndDate.getTime())
        ? item.rentalEndDate >= reversionDate
        : false;

      if (continuesPastReversion && (isStrictOccupied(item.occupancyStatus) || (includeBookedInOccupancy && isBooked(item.occupancyStatus)))) {
        currentState.state = 'occupied';
      } else if (continuesPastReversion && isBooked(item.occupancyStatus)) {
        currentState.state = 'booked';
      }
    });

    uniqueBerths.forEach((value, berthKey) => {
      const current = berthStateByLength.get(value.length) || {
        length: value.length,
        total: 0,
        occupied: 0,
        booked: 0,
        available: 0,
        availableBerths: [],
      };

      current.total++;
      if (value.state === 'occupied') current.occupied++;
      if (value.state === 'booked') current.booked++;
      if (value.state === 'available') {
        current.available++;
        current.availableBerths.push(`Pier ${berthKey.split('-')[0]}`);
      }

      berthStateByLength.set(value.length, current);
    });

    return [...berthStateByLength.values()]
      .map((item) => ({
        ...item,
        pendingCount: Math.min(pendingByLength[item.length] || 0, item.available),
        adjustedAvailable: Math.max(item.available - Math.min(pendingByLength[item.length] || 0, item.available), 0),
        projectedOccupancyPercent: item.total
          ? ((item.occupied + (includeBookedInOccupancy ? item.booked : 0) + Math.min(pendingByLength[item.length] || 0, item.available)) / item.total) * 100
          : 0,
        availableBerths: [...new Set(item.availableBerths)],
      }))
      .sort((a, b) => a.length - b.length);
  }, [baseFilteredData, includeBookedInOccupancy, pendingByLength]);

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
        'Rental Timing': item.rentalTiming || '',
        'Rental Start Date': formatDate(item.rentalStartDate),
        'Rental End Date': formatDate(item.rentalEndDate),
        'Rental Agreement ID': item.rentalAgreementId || '',
        ...(hasReversionColumns
          ? {
              'Has 30 Sep Rental': item.hasSep30Rental ? 'YES' : 'NO',
              Leaving: isLeaving(item) ? 'YES' : 'NO',
              'Moving To': item.relocatingTo?.join(', ') || '',
              'Relocated From': item.relocatedFrom?.join(', ') || '',
              'Reversion Outcome': item.reversionOutcome || '',
              '30 Sep Occupier': item.nextOccupier || '',
              '30 Sep Occupier Type': item.nextOccupierType || '',
              '30 Sep Rental Status': item.nextRentalStatus || '',
              '30 Sep Rental Start': formatDate(item.nextRentalStartDate || null),
              '30 Sep Rental End': formatDate(item.nextRentalEndDate || null),
              '30 Sep Agreement ID': item.nextRentalAgreementId || '',
              '30 Sep Line Count': item.sep30LineCount ?? '',
              'New Ownership Type': item.newOwnershipType || '',
            }
          : {}),
      })),
      reversionViews.length === 1 && reversionViews[0] === 'leaving' ? 'wemt-reversion-leaving.csv' : 'reversion-master-query-report.csv'
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
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={handleExport} disabled={!displayData.length} className="btn btn-primary">Export Report</button>
          <button onClick={() => { onRefresh(); loadData(); }} className="btn btn-secondary">Refresh Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ['Total Berths', summary.total, 'text-gray-900'],
          [includeBookedInOccupancy ? 'Occupied (Incl Booked)' : 'Occupied', summary.occupied, 'text-green-600'],
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

      {hasReversionColumns ? (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">30 Sep 2026 Reversion</h2>
            <p className="text-sm text-gray-600">
              Click a tile to list those berths, or combine them with the Reversion filter below. Counts reflect the filters below.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              ...REVERSION_CATEGORIES.map((category) => ({
                id: category.id as ReversionView,
                label: category.label,
                colour: category.colour,
                value: reversionSummary[category.id],
                active: reversionViews.length === 1 && reversionViews[0] === category.id,
              })),
              { id: 'all' as ReversionView, label: 'All berths', colour: 'text-gray-900', value: reversionSummary.total, active: !reversionViews.length },
            ].map((tile) => (
              <button
                type="button"
                key={tile.id}
                onClick={() => setReversionViews(tile.id === 'all' ? [] : [tile.id as CategoryId])}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  tile.active ? 'border-navy-500 bg-navy-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-600">{tile.label}</p>
                <p className={`text-2xl font-bold ${tile.colour}`}>{tile.value}</p>
              </button>
            ))}
          </div>

          <div className="mx-4 mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50">
            <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Note</p>
            <table className="w-full text-left text-sm">
              <tbody>
                {REVERSION_CATEGORIES.map((category) => (
                  <tr key={category.id} className="border-t border-gray-200 first:border-t-0">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{category.label}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${category.colour}`}>{reversionSummary[category.id]}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {category.description}
                      {category.id === 'continuing' && `; ${reversionSummary.continuingSameCustomer} of these are the same customer`}
                      {category.id === 'continuing' && reversionSummary.continuingRelocations > 0 &&
                        `, ${reversionSummary.continuingRelocations} are a new customer relocating from another berth`}
                      {category.id === 'vacantReLet' &&
                        `; ${reversionSummary.vacantReLetRelocations} of these are a customer relocating from another berth (their rental there ends 28-30 Sep)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pb-4 text-sm text-gray-600">
            {reversionSummary.leavingByType.length > 0 && (
              <span>
                Leaving by type: {reversionSummary.leavingByType.map(([type, count]) => `${type} ${count}`).join(' · ')}
              </span>
            )}
            {reversionSummary.multipleSep30Lines > 0 && (
              <span className="text-amber-700">
                {reversionSummary.multipleSep30Lines} berth{reversionSummary.multipleSep30Lines === 1 ? ' has' : 's have'} more than one 30 Sep line. Check for duplicates.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          This workbook has no 30 Sep rental columns, so berths leaving at reversion can't be identified. Re-export
          ReversionMasterQuery.xlsx from the WEMT reversion query (with HasSep30Rental, NextOccupier and ReversionOutcome)
          to turn on the Leaving view.
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Filter Options</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-8">
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
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={allOwnershipSelected}
                    onChange={(event) => setOwnershipFilter(event.target.checked ? [...ownershipTypes] : [])}
                    className="form-checkbox"
                  />
                  Select all
                </label>
                <div className="my-1 border-t border-gray-200" />
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
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={allBerthTypesSelected}
                    onChange={(event) => setBerthTypeFilter(event.target.checked ? [...berthTypes] : [])}
                    className="form-checkbox"
                  />
                  Select all
                </label>
                <div className="my-1 border-t border-gray-200" />
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLengthOptions((show) => !show)}
              className="select flex w-full items-center justify-between text-left"
            >
              <span className="truncate">
                {lengthFilter.length
                  ? `${lengthFilter.length} length${lengthFilter.length === 1 ? '' : 's'} selected`
                  : 'All Lengths'}
              </span>
              <span className="ml-2">v</span>
            </button>
            {showLengthOptions && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-lg">
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={allLengthsSelected}
                    onChange={(event) => setLengthFilter(event.target.checked ? [...berthLengths] : [])}
                    className="form-checkbox"
                  />
                  Select all
                </label>
                <div className="my-1 border-t border-gray-200" />
                {berthLengths.map((length) => (
                  <label key={length} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={lengthFilter.includes(length)}
                      onChange={() =>
                        setLengthFilter((selected) =>
                          selected.includes(length)
                            ? selected.filter((item) => item !== length)
                            : [...selected, length].sort((a, b) => a - b)
                        )
                      }
                      className="form-checkbox"
                    />
                    {length} m
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setLengthFilter([])}
                  className="mt-2 w-full border-t border-gray-200 pt-2 text-sm text-navy-600 hover:text-navy-800"
                >
                  Clear lengths
                </button>
              </div>
            )}
          </div>

          {hasReversionColumns && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReversionOptions((show) => !show)}
                className="select flex w-full items-center justify-between text-left"
              >
                <span className="truncate">
                  {reversionViews.length === 0
                    ? 'All reversion outcomes'
                    : reversionViews.length === 1
                      ? [...REVERSION_CATEGORIES, RELOCATION_OPTION].find((category) => category.id === reversionViews[0])?.label
                      : `${reversionViews.length} reversion outcomes`}
                </span>
                <span className="ml-2">v</span>
              </button>
              {showReversionOptions && (
                <div className="absolute z-10 mt-1 w-64 rounded-md border border-gray-300 bg-white p-2 shadow-lg">
                  {[...REVERSION_CATEGORIES, RELOCATION_OPTION].map((category) => (
                    <label key={category.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reversionViews.includes(category.id)}
                        onChange={() =>
                          setReversionViews((selected) =>
                            selected.includes(category.id)
                              ? selected.filter((item) => item !== category.id)
                              : [...selected, category.id]
                          )
                        }
                        className="form-checkbox"
                      />
                      <span className="flex-1">{category.label}</span>
                      <span className="text-xs text-gray-500">{reversionSummary[category.id]}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReversionViews([])}
                    className="mt-2 w-full border-t border-gray-200 pt-2 text-sm text-navy-600 hover:text-navy-800"
                  >
                    Clear reversion outcomes
                  </button>
                </div>
              )}
            </div>
          )}

          <select value={occupancyFilter} onChange={(event) => setOccupancyFilter(event.target.value)} className="select">
            <option value="all">Select all occupancy statuses</option>
            {occupancyStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {rentalTimings.length > 0 && (
            <select value={rentalTimingFilter} onChange={(event) => setRentalTimingFilter(event.target.value)} className="select">
              <option value="all">All rental timings</option>
              {rentalTimings.map((timing) => (
                <option key={timing} value={timing}>{timing}</option>
              ))}
            </select>
          )}

          <select
            value={customerOwnershipFilter}
            onChange={(event) => setCustomerOwnershipFilter(event.target.value)}
            className="select"
          >
            <option value="all">All customer ownership</option>
            <option value="aucklandCouncilOwned">Auckland Council Owned (Customer ID 25008)</option>
            <option value="private">Private</option>
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
              setLengthFilter([]);
              setOccupancyFilter('all');
              setRentalTimingFilter('all');
              setCustomerOwnershipFilter('all');
              setIncludeBookedInOccupancy(false);
              setPendingByLength({});
              setSearchText('');
              setReversionViews([]);
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
          <p className="text-sm text-gray-600">
            {hasReversionColumns
              ? 'Berths free from 30 Sep 2026: no rental line starting 30 Sep. Counts reflect the active filters.'
              : 'Berths free from 30 Sep 2026: vacant now, or current rental ends before then. Counts reflect the active filters.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6">
          {sizeAvailability.map((item) => (
            <div key={item.length} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
              <p className="text-xs font-medium text-gray-600">{item.length}m</p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-bold text-gray-900">{item.adjustedAvailable}</p>
                <p className="text-xs text-gray-500">/ {item.total}</p>
              </div>
            </div>
          ))}
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
                {hasReversionColumns && (
                  <>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">30 Sep Rental</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"><button onClick={() => toggleSort('reversionOutcome')} className="hover:text-gray-700">Outcome{sortMarker('reversionOutcome')}</button></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedDisplayData.map((item, index) => (
                <tr key={`${item.pier}-${item.berth}-${index}`} className={isLeaving(item) ? 'bg-red-50' : isMovingBerth(item) ? 'bg-orange-50' : undefined}>
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
                  {hasReversionColumns && (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.hasSep30Rental ? (
                          <>
                            <div>{item.nextOccupier || '-'}</div>
                            <div className="text-xs text-gray-500">
                              {[item.nextOccupierType, item.nextRentalStatus, item.nextRentalEndDate ? `to ${formatDate(item.nextRentalEndDate)}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {(item.sep30LineCount || 0) > 1 && (
                              <div className="text-xs text-amber-700">{item.sep30LineCount} lines start 30 Sep</div>
                            )}
                            {Boolean(item.relocatedFrom?.length) && (
                              <div className="text-xs font-medium text-orange-700">Relocating from {item.relocatedFrom!.join(', ')}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                        {Boolean(item.relocatingTo?.length) && (
                          <div className="text-xs font-medium text-orange-700">Moving to {item.relocatingTo!.join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.reversionOutcome ? (
                          <span className={OUTCOME_BADGE[item.reversionOutcome] || 'badge badge-info'}>{item.reversionOutcome}</span>
                        ) : '-'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
