import { BerthRecord, FilterState, KPIMetrics, PierOccupancy, BerthTypeOccupancy, OwnershipOccupancy, LengthOccupancy, OccupancyTrend, MonthlyOccupancy } from '../types/berth';

export function filterData(data: BerthRecord[], filters: FilterState): BerthRecord[] {
  if (!data || data.length === 0) return [];
  
  return data.filter(record => {
    if (!record) return false;
    
    if (filters.marina && record.marina !== filters.marina) return false;
    if (filters.pier && record.pier !== filters.pier) return false;
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
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + 30);

    const getStatus = (expiryDate: Date | null, isRequired: boolean) => {
      if (!isRequired) return 'Valid';
      if (!expiryDate) return 'Expired';
      if (expiryDate < today) return 'Expired';
      if (expiryDate <= warningDate) return 'Expiring Soon';
      return 'Valid';
    };

    const insuranceStatus = getStatus(record.insuranceExpiry, true);
    const ewofStatus = getStatus(record.ewofExpiry, Boolean(record.ewofRequired));
    const tntStatus = getStatus(record.tntExpiry, Boolean(record.tntRequired));

    const hasExpired = insuranceStatus === 'Expired' || ewofStatus === 'Expired' || tntStatus === 'Expired';
    const hasWarning = insuranceStatus === 'Expiring Soon' || ewofStatus === 'Expiring Soon' || tntStatus === 'Expiring Soon';

    return !hasExpired && !hasWarning;
  }).length;

  const vesselComplianceRate = vesselRecords.length > 0
    ? (compliantVessels / vesselRecords.length) * 100
    : 0;

  const validAges = data
    .map((record) => {
      const dob = record.customerDateOfBirth;
      if (!dob || Number.isNaN(dob.getTime())) return null;

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
      }

      return age;
    })
    .filter((age): age is number => age !== null && age >= 20);

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
  })).sort((a, b) => {
    // Sort strings alphabetically, numbers numerically
    if (typeof a.pier === 'string' && typeof b.pier === 'string') {
      return a.pier.localeCompare(b.pier);
    }
    return Number(a.pier) - Number(b.pier);
  });
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
  
  // Sort strings alphabetically, numbers numerically
  const sortedArray = Array.from(values);
  if (sortedArray.length > 0 && typeof sortedArray[0] === 'string') {
    return sortedArray.sort() as T[];
  }
  return sortedArray.sort((a, b) => Number(a) - Number(b)) as T[];
}

export function getFutureAvailability(data: BerthRecord[], targetDate: Date): BerthRecord[] {
  if (!data || data.length === 0) return [];
  if (!targetDate) return data.filter(r => r.berthStatus === 'Active');

  return data.filter(record => {
    if (!record) return false;
    if (record.berthStatus !== 'Active') return false;

    const dateIn = record.dateIn;
    const dateOut = record.dateOut;

    // If no dates, consider available
    if (!dateIn && !dateOut) return true;

    // If target date is within a rental/booking period, it's not available
    if (dateIn && dateOut) {
      return targetDate < dateIn || targetDate > dateOut;
    }

    // If only dateIn exists, consider unavailable after that date
    if (dateIn && !dateOut) {
      return targetDate < dateIn;
    }

    return true;
  });
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