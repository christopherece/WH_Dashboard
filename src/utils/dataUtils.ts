import { BerthRecord, FilterState, KPIMetrics, PierOccupancy, BerthTypeOccupancy, OwnershipOccupancy, LengthOccupancy, OccupancyTrend, MonthlyOccupancy } from '../types/berth';

export function filterData(data: BerthRecord[], filters: FilterState): BerthRecord[] {
  if (!data || data.length === 0) return [];
  
  return data.filter(record => {
    if (!record) return false;
    
    if (filters.marina && record.marina !== filters.marina) return false;
    if (filters.pier && String(record.pier) !== String(filters.pier)) return false;
    if (filters.berth && record.berth !== filters.berth) return false;
    if (filters.berthType && filters.berthType.length > 0 && !filters.berthType.includes(record.berthType)) return false;
    if (filters.ownershipType && filters.ownershipType.length > 0 && !filters.ownershipType.includes(record.ownershipType)) return false;
    if (filters.occupancyStatus && record.occupancyStatus !== filters.occupancyStatus) return false;
    if (filters.berthSize && record.nominalLength !== filters.berthSize) return false;
    return true;
  });
}

export function calculateKPIMetrics(data: BerthRecord[]): KPIMetrics {
  if (!data || data.length === 0) {
    return {
      totalActiveBerths: 0,
      occupied: 0,
      booked: 0,
      available: 0,
      futureBookings: 0,
      futureRentals: 0,
      occupancyPercentage: 0,
      vesselComplianceRate: 0,
      averageAge: 0,
    };
  }

  const activeBerths = data.filter(r => r.berthStatus === 'Active');
  const totalActiveBerths = activeBerths.length;

  const occupied = activeBerths.filter(r => r.occupancyStatus === 'Rented').length;
  const booked = activeBerths.filter(r => r.occupancyStatus === 'Booked').length;
  const available = activeBerths.filter(r => r.occupancyStatus === 'Available').length;
  const futureBookings = activeBerths.filter(r => r.occupancyStatus === 'Future Booking').length;
  const futureRentals = activeBerths.filter(r => r.occupancyStatus === 'Future Rental').length;

  const occupancyPercentage = totalActiveBerths > 0
    ? ((occupied + booked) / totalActiveBerths) * 100
    : 0;

  const vesselRecords = data.filter(r => r.occupancyStatus === 'Rented' && r.vesselName);
  const compliantVessels = vesselRecords.filter((record) => {
    const statuses = [
      getExpiryStatus(record.insuranceExpiry, true),
      getExpiryStatus(record.ewofExpiry, Boolean(record.ewofRequired)),
      getExpiryStatus(record.tntExpiry, Boolean(record.tntRequired)),
    ];
    return statuses.every(status => status === 'Valid' || status === 'Not Required');
  }).length;

  const vesselComplianceRate = vesselRecords.length > 0
    ? (compliantVessels / vesselRecords.length) * 100
    : 0;

  const validAges = getUniqueCustomerAges(data);

  const averageAge = validAges.length > 0
    ? validAges.reduce((sum, age) => sum + age, 0) / validAges.length
    : 0;

  return {
    totalActiveBerths,
    occupied,
    booked,
    available,
    futureBookings,
    futureRentals,
    occupancyPercentage: Math.round(occupancyPercentage * 10) / 10,
    vesselComplianceRate: Math.round(vesselComplianceRate * 10) / 10,
    averageAge: validAges.length > 0 ? Number(averageAge.toFixed(1)) : 0,
  };
}

export function calculatePierOccupancy(data: BerthRecord[]): PierOccupancy[] {
  if (!data || data.length === 0) return [];

  const pierMap = new Map<string | number, PierOccupancy>();

  data.filter(r => r.berthStatus === 'Active').forEach(record => {
    const pier = record.pier;
    if (!pierMap.has(pier)) {
      pierMap.set(pier, {
        pier,
        totalBerths: 0,
        occupied: 0,
        booked: 0,
        available: 0,
        occupancyPercentage: 0,
      });
    }

    const pierData = pierMap.get(pier)!;
    pierData.totalBerths++;

    if (record.occupancyStatus === 'Rented') pierData.occupied++;
    else if (record.occupancyStatus === 'Booked') pierData.booked++;
    else if (record.occupancyStatus === 'Available') pierData.available++;
  });

  return Array.from(pierMap.values()).map(pier => ({
    ...pier,
    occupancyPercentage: pier.totalBerths > 0 
      ? Math.round(((pier.occupied + pier.booked) / pier.totalBerths) * 1000) / 10 
      : 0,
  })).sort((a, b) => naturalCompare(a.pier, b.pier));
}

export function calculateBerthTypeOccupancy(data: BerthRecord[]): BerthTypeOccupancy[] {
  if (!data || data.length === 0) return [];

  const typeMap = new Map<string, BerthTypeOccupancy>();

  data.filter(r => r.berthStatus === 'Active').forEach(record => {
    const type = record.berthType || 'Unknown';
    if (!typeMap.has(type)) {
      typeMap.set(type, {
        berthType: type,
        totalBerths: 0,
        occupied: 0,
        booked: 0,
        available: 0,
        occupancyPercentage: 0,
      });
    }

    const typeData = typeMap.get(type)!;
    typeData.totalBerths++;

    if (record.occupancyStatus === 'Rented') typeData.occupied++;
    else if (record.occupancyStatus === 'Booked') typeData.booked++;
    else if (record.occupancyStatus === 'Available') typeData.available++;
  });

  return Array.from(typeMap.values()).map(type => ({
    ...type,
    occupancyPercentage: type.totalBerths > 0 
      ? Math.round(((type.occupied + type.booked) / type.totalBerths) * 1000) / 10 
      : 0,
  })).sort((a, b) => b.totalBerths - a.totalBerths);
}

export function calculateOwnershipOccupancy(data: BerthRecord[]): OwnershipOccupancy[] {
  if (!data || data.length === 0) return [];

  const ownershipMap = new Map<string, OwnershipOccupancy>();

  data.filter(r => r.berthStatus === 'Active').forEach(record => {
    const ownership = record.ownershipType || 'Unknown';
    if (!ownershipMap.has(ownership)) {
      ownershipMap.set(ownership, {
        ownershipType: ownership,
        totalBerths: 0,
        occupied: 0,
        booked: 0,
        available: 0,
        occupancyPercentage: 0,
      });
    }

    const ownershipData = ownershipMap.get(ownership)!;
    ownershipData.totalBerths++;

    if (record.occupancyStatus === 'Rented') ownershipData.occupied++;
    else if (record.occupancyStatus === 'Booked') ownershipData.booked++;
    else if (record.occupancyStatus === 'Available') ownershipData.available++;
  });

  return Array.from(ownershipMap.values()).map(ownership => ({
    ...ownership,
    occupancyPercentage: ownership.totalBerths > 0 
      ? Math.round(((ownership.occupied + ownership.booked) / ownership.totalBerths) * 1000) / 10 
      : 0,
  })).sort((a, b) => b.totalBerths - a.totalBerths);
}

export function calculateLengthOccupancy(data: BerthRecord[]): LengthOccupancy[] {
  if (!data || data.length === 0) return [];

  const lengthMap = new Map<number, LengthOccupancy>();

  data.filter(r => r.berthStatus === 'Active').forEach(record => {
    const length = record.nominalLength; // Use exact value from NominalLength column
    
    if (!lengthMap.has(length)) {
      lengthMap.set(length, {
        lengthRange: `${length}m`,
        totalBerths: 0,
        occupied: 0,
        available: 0,
        occupancyPercentage: 0,
      });
    }

    const lengthData = lengthMap.get(length)!;
    lengthData.totalBerths++;

    if (record.occupancyStatus === 'Rented' || record.occupancyStatus === 'Booked') {
      lengthData.occupied++;
    } else if (record.occupancyStatus === 'Available') {
      lengthData.available++;
    }
  });

  return Array.from(lengthMap.values())
    .map(length => ({
      ...length,
      occupancyPercentage: length.totalBerths > 0 
        ? Math.round((length.occupied / length.totalBerths) * 1000) / 10 
        : 0,
    }))
    .sort((a, b) => {
      // Extract numeric values from strings like "12m" for sorting
      const aLength = parseFloat(a.lengthRange);
      const bLength = parseFloat(b.lengthRange);
      return aLength - bLength;
    });
}

export function calculateOccupancyTrend(data: BerthRecord[], _aggregation: 'daily' | 'monthly' | 'yearly'): OccupancyTrend[] {
  if (!data || data.length === 0) {
    return [{
      date: new Date(),
      occupied: 0,
      booked: 0,
      available: 0,
      total: 0,
      occupancyPercentage: 0,
    }];
  }

  // For now, return current data as a single point
  // In a real implementation, this would aggregate historical data
  const activeBerths = data.filter(r => r.berthStatus === 'Active');
  const occupied = activeBerths.filter(r => r.occupancyStatus === 'Rented').length;
  const booked = activeBerths.filter(r => r.occupancyStatus === 'Booked').length;
  const available = activeBerths.filter(r => r.occupancyStatus === 'Available').length;
  const total = activeBerths.length;
  const occupancyPercentage = total > 0 ? ((occupied + booked) / total) * 100 : 0;

  return [{
    date: new Date(),
    occupied,
    booked,
    available,
    total,
    occupancyPercentage: Math.round(occupancyPercentage * 10) / 10,
  }];
}

export function calculateMonthlyOccupancy(data: BerthRecord[], _year: number): MonthlyOccupancy[] {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (!data || data.length === 0) {
    return months.map((monthName, index) => ({
      month: index + 1,
      monthName,
      totalBerths: 0,
      occupied: 0,
      booked: 0,
      available: 0,
      occupancyPercentage: 0,
    }));
  }

  // For now, return current data distributed across months
  // In a real implementation, this would use actual historical data
  const activeBerths = data.filter(r => r.berthStatus === 'Active');
  const occupied = activeBerths.filter(r => r.occupancyStatus === 'Rented').length;
  const booked = activeBerths.filter(r => r.occupancyStatus === 'Booked').length;
  const available = activeBerths.filter(r => r.occupancyStatus === 'Available').length;
  const total = activeBerths.length;
  const occupancyPercentage = total > 0 ? ((occupied + booked) / total) * 100 : 0;

  return months.map((monthName, index) => ({
    month: index + 1,
    monthName,
    totalBerths: total,
    occupied,
    booked,
    available,
    occupancyPercentage: Math.round(occupancyPercentage * 10) / 10,
  }));
}

export function getUniqueValues<T>(data: BerthRecord[], key: keyof BerthRecord): T[] {
  if (!data || data.length === 0) return [];
  
  const values = new Set<T>();
  data.forEach(record => {
    if (!record) return;
    const value = record[key];
    if (value !== null && value !== undefined && value !== '') {
      values.add(value as T);
    }
  });
  
  return Array.from(values).sort((a, b) => naturalCompare(a, b)) as T[];
}

export type ProjectedStatus = 'Rented' | 'Booked' | 'Available';

/**
 * Projects each berth's status on a given date from the single current/next
 * agreement the master query returns per berth. A berth is Rented/Booked when
 * the date falls inside that agreement's DateIn–DateOut window, otherwise it is
 * treated as available. Agreements that follow the one in the export are not
 * visible, so dates beyond DateOut may be optimistic.
 */
export function getProjectedStatus(record: BerthRecord, targetDate: Date): ProjectedStatus {
  const target = startOfDay(targetDate).getTime();
  const dateIn = record.dateIn ? startOfDay(record.dateIn).getTime() : null;
  // DateOut is parsed onto the day after an end-of-day (23:59:59) timestamp, so
  // the berth is free from that day onward.
  const dateOut = record.dateOut ? record.dateOut.getTime() : null;

  if (dateIn === null || target < dateIn) return 'Available';
  if (dateOut !== null && target >= dateOut) return 'Available';

  const status = record.occupancyStatus;
  if (status === 'Rented' || status === 'Future Rental') return 'Rented';
  if (status === 'Booked' || status === 'Future Booking') return 'Booked';
  return 'Available';
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type ExpiryStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'Missing' | 'Not Required';

/**
 * Mirrors the master query's compliance CASE logic: compares on date only, an
 * expiry of today is still valid-but-expiring, and a required document with no
 * expiry is reported as Missing rather than Expired.
 */
export function getExpiryStatus(expiryDate: Date | null, isRequired: boolean, warningDays = 30): ExpiryStatus {
  if (!isRequired) return 'Not Required';
  if (!expiryDate) return 'Missing';

  const today = startOfDay(new Date());
  const warningDate = new Date(today);
  warningDate.setDate(today.getDate() + warningDays);
  const expiry = startOfDay(expiryDate);

  if (expiry < today) return 'Expired';
  if (expiry <= warningDate) return 'Expiring Soon';
  return 'Valid';
}

export function calculateAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age;
}

/**
 * Ages of distinct customers (a customer holding several berths is counted
 * once). Ages under 20 are excluded as they come from placeholder or
 * mistyped DOBs in the source data.
 */
export function getUniqueCustomerAges(data: BerthRecord[]): number[] {
  const ageByCustomer = new Map<string, number>();

  data.forEach((record, index) => {
    const age = calculateAge(record.customerDateOfBirth);
    if (age === null || age < 20) return;
    const key = record.customerId || record.customerName || `row-${index}`;
    if (!ageByCustomer.has(key)) ageByCustomer.set(key, age);
  });

  return [...ageByCustomer.values()];
}

function naturalCompare(a: unknown, b: unknown): number {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function formatDate(date: Date | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-NZ').format(num);
}

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Array.from(new Set(data.flatMap(row => Object.keys(row || {})))) as string[];

  const csvRows = [
    headers.map(header => `"${header}"`).join(','),
    ...data.map(row => headers.map(header => {
      const value = row?.[header];
      const normalised = value instanceof Date ? formatDate(value) : value ?? '';
      return `"${String(normalised).replace(/"/g, '""')}"`;
    }).join(','))
  ];

  const csvContent = csvRows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}