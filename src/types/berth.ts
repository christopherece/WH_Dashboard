export interface BerthRecord {
  berthId: number;
  berth: string;
  pier: string | number;
  berthType: string;
  nominalLength: number;
  nominalWidth: number;
  nominalDepth: number;
  actualLength: number;
  actualWidth: number;
  actualDepth: number;
  marina: string;
  berthStatus: string;
  ownershipTypeId: number;
  ownershipType: string;
  occupancyStatus: string;
  occupiedFlag: number;
  availableFlag: number;
  rentalAgreementId: string | null;
  bookingId: string | null;
  dateIn: Date | null;
  dateOut: Date | null;
  bookingEnteredDate: Date | null;
  customerId: string | null;
  customerName: string | null;
  customerAddressLine1: string | null;
  customerAddressLine2: string | null;
  customerAddressLine3: string | null;
  customerAddressLine4: string | null;
  customerAddressLine5: string | null;
  customerCountryCode: string | null;
  customerPostCode: string | null;
  customerCity: string | null;
  customerRegion: string | null;
  customerDateOfBirth: Date | null;
  vesselId: string | null;
  vesselName: string | null;
  serviceStatus: string | null;
  serviceLineType: string | null;
  // Vessel compliance fields
  powerConnectionType: string | null;
  ewofRequired: boolean;
  tntRequired: boolean;
  insuranceExpiry: Date | null;
  ewofExpiry: Date | null;
  tntExpiry: Date | null;
}

export type OccupancyStatus = 'Available' | 'Rented' | 'Booked' | 'Future Booking' | 'Future Rental';

export interface FilterState {
  date: Date | null;
  year: number | null;
  month: number | null;
  marina: string | null;
  pier: string | number | null;
  berth: string | null;
  berthType: string | null;
  ownershipType: string | null;
  occupancyStatus: OccupancyStatus | null;
  berthSize: number | null;
}

export interface KPIMetrics {
  totalActiveBerths: number;
  occupied: number;
  booked: number;
  available: number;
  occupancyPercentage: number;
  vesselComplianceRate: number;
  averageAge: number;
}

export interface DataQualityReport {
  rowsLoaded: number;
  activeBerths: number;
  missingBerthNames: number;
  missingBerthTypes: number;
  missingOwnershipTypes: number;
  missingDates: number;
  invalidDateRanges: number;
  issues: string[];
}

export interface PierOccupancy {
  pier: string | number;
  totalBerths: number;
  occupied: number;
  booked: number;
  available: number;
  occupancyPercentage: number;
}

export interface BerthTypeOccupancy {
  berthType: string;
  totalBerths: number;
  occupied: number;
  booked: number;
  available: number;
  occupancyPercentage: number;
}

export interface OwnershipOccupancy {
  ownershipType: string;
  totalBerths: number;
  occupied: number;
  booked: number;
  available: number;
  occupancyPercentage: number;
}

export interface LengthOccupancy {
  lengthRange: string;
  totalBerths: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}

export interface OccupancyTrend {
  date: Date;
  occupied: number;
  booked: number;
  available: number;
  total: number;
  occupancyPercentage: number;
}

export interface MonthlyOccupancy {
  month: number;
  monthName: string;
  totalBerths: number;
  occupied: number;
  booked: number;
  available: number;
  occupancyPercentage: number;
}

export interface VesselCompliance {
  vesselId: string | null;
  vesselName: string | null;
  berth: string;
  pier: string | number;
  customerName: string | null;
  powerConnectionType: string | null;
  ewofRequired: boolean;
  tntRequired: boolean;
  insuranceExpiry: Date | null;
  ewofExpiry: Date | null;
  tntExpiry: Date | null;
  insuranceStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  ewofStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  tntStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  overallCompliance: 'Compliant' | 'Warning' | 'Non-Compliant';
  sizeCompatibility: 'Compatible' | 'Over Size' | 'Under Size';
  vesselLength: number;
  vesselWidth: number;
  berthLength: number;
  berthWidth: number;
}