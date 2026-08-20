import * as XLSX from 'xlsx';
import { BerthRecord, DataQualityReport } from '../types/berth';

const EXCEL_FILE_PATHS = [
  '/OccupancyReport.xlsx',
  '/NewDashboardWithCompliance.xlsx',
];

export class ExcelService {
  private cachedData: BerthRecord[] | null = null;
  private lastLoaded: Date | null = null;

  async loadData(): Promise<{ data: BerthRecord[]; dataQuality: DataQualityReport }> {
    try {
      let response: Response | null = null;
      let resolvedPath = '';

      for (const filePath of EXCEL_FILE_PATHS) {
        response = await fetch(filePath);
        if (response.ok) {
          resolvedPath = filePath;
          break;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to load Excel file. Tried: ${EXCEL_FILE_PATHS.join(', ')}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Excel file is empty or corrupted');
      }

      console.info(`Loaded Excel data from ${resolvedPath}`);

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file contains no sheets');
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (!rawData || rawData.length === 0) {
        throw new Error('Excel file contains no data');
      }

      const data = this.parseData(rawData);
      const dataQuality = this.analyzeDataQuality(data);

      this.cachedData = data;
      this.lastLoaded = new Date();

      return { data, dataQuality };
    } catch (error) {
      console.error('Error loading Excel data:', error);
      if (error instanceof Error) {
        throw new Error(`Occupancy data is currently unavailable: ${error.message}`);
      }
      throw new Error('Occupancy data is currently unavailable. Please ensure the Excel file is present.');
    }
  }

  private parseData(rawData: any[]): BerthRecord[] {
    return rawData.map((row: any, index: number) => {
      try {
        // Parse berth as string since it contains alphanumeric values like "AA01"
        const berthValue = row.Berth || row.BerthNumber || row.BerthNo || row.BerthNo || row['Berth No'] || row['Berth Number'] || row.BERTH;
        const berth = this.parseString(berthValue);

        return {
          berthId: this.parseNumber(row.BerthID || row.ID || row.Id),
          berth: berth,
          pier: this.parseStringOrNumber(row.Pier || row.PIER),
          berthType: this.parseString(row.BerthType || row.Type || row.TYPE),
          nominalLength: this.parseNumber(row.NominalLength || row.Length || row.LENGTH),
          nominalWidth: this.parseNumber(row.NominalWidth || row.Width),
          nominalDepth: this.parseNumber(row.NominalDepth || row.Depth),
          actualLength: this.parseNumber(row.ActualLength),
          actualWidth: this.parseNumber(row.ActualWidth),
          actualDepth: this.parseNumber(row.ActualDepth),
          marina: this.parseString(row.Marina || row.MARINA),
          berthStatus: this.parseString(row.BerthStatus || row.Status || row.STATUS),
          ownershipTypeId: this.parseNumber(row.OwnershipTypeID),
          ownershipType: this.parseString(row.OwnershipType || row.Ownership),
          occupancyStatus: this.parseString(row.OccupancyStatus),
          occupiedFlag: this.parseNumber(row.OccupiedFlag),
          availableFlag: this.parseNumber(row.AvailableFlag),
          rentalAgreementId: this.parseNullableString(row.RentalAgreementID),
          bookingId: this.parseNullableString(row.BookingID),
          dateIn: this.parseDate(row.DateIn),
          dateOut: this.parseDate(row.DateOut),
          bookingEnteredDate: this.parseDate(row.BookingEnteredDate),
          customerId: this.parseNullableString(row.CustomerID),
          customerName: this.parseNullableString(row.CustomerName),
          vesselId: this.parseNullableString(row.VesselID),
          vesselName: this.parseNullableString(row.VesselName),
          serviceStatus: this.parseNullableString(row.ServiceStatus),
          serviceLineType: this.parseNullableString(row.ServiceLineType),
          insuranceExpiry: this.parseDate(row.InsuranceExpiry),
          ewofExpiry: this.parseDate(row.EWOFExpiry),
          tntExpiry: this.parseDate(row.TNTExpiry),
        };
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error);
        // Return a default record for failed rows
        return this.getDefaultRecord();
      }
    }).filter(record => record.berthId > 0); // Filter out completely invalid records
  }

  private getDefaultRecord(): BerthRecord {
    return {
      berthId: 0,
      berth: '',
      pier: 0,
      berthType: '',
      nominalLength: 0,
      nominalWidth: 0,
      nominalDepth: 0,
      actualLength: 0,
      actualWidth: 0,
      actualDepth: 0,
      marina: '',
      berthStatus: '',
      ownershipTypeId: 0,
      ownershipType: '',
      occupancyStatus: '',
      occupiedFlag: 0,
      availableFlag: 0,
      rentalAgreementId: null,
      bookingId: null,
      dateIn: null,
      dateOut: null,
      bookingEnteredDate: null,
      customerId: null,
      customerName: null,
      vesselId: null,
      vesselName: null,
      serviceStatus: null,
      serviceLineType: null,
      insuranceExpiry: null,
      ewofExpiry: null,
      tntExpiry: null,
    };
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === 'NULL' || value === '') {
      return 0;
    }
    
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private parseStringOrNumber(value: any): string | number {
    if (value === null || value === undefined || value === 'NULL') return '';
    // If it's already a number, return it
    if (typeof value === 'number') return value;
    // If it's a string that can be converted to a number, convert it
    const num = Number(value);
    if (!isNaN(num) && value !== '') return num;
    // Otherwise return as string
    return String(value);
  }

  private parseString(value: any): string {
    if (value === null || value === undefined || value === 'NULL') return '';
    return String(value);
  }

  private parseNullableString(value: any): string | null {
    if (value === null || value === undefined || value === 'NULL' || value === '') return null;
    return String(value);
  }

  private parseDate(value: any): Date | null {
    if (value === null || value === undefined || value === 'NULL' || value === '') return null;
    
    // Handle Excel serial dates
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date;
    }

    // Handle string dates
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  private analyzeDataQuality(data: BerthRecord[]): DataQualityReport {
    const issues: string[] = [];
    let missingBerthNames = 0;
    let missingBerthTypes = 0;
    let missingOwnershipTypes = 0;
    let missingDates = 0;
    let invalidDateRanges = 0;

    data.forEach(record => {
      if (!record.berth || record.berth === '') missingBerthNames++;
      if (!record.berthType) missingBerthTypes++;
      if (!record.ownershipType) missingOwnershipTypes++;
      
      if (record.occupancyStatus === 'Rented' || record.occupancyStatus === 'Booked') {
        if (!record.dateIn) missingDates++;
        if (record.dateIn && record.dateOut && record.dateIn > record.dateOut) {
          invalidDateRanges++;
        }
      }
    });

    if (missingBerthNames > 0) issues.push(`${missingBerthNames} records have missing berth numbers.`);
    if (missingBerthTypes > 0) issues.push(`${missingBerthTypes} records have missing berth types.`);
    if (missingOwnershipTypes > 0) issues.push(`${missingOwnershipTypes} records have missing ownership types.`);
    if (missingDates > 0) issues.push(`${missingDates} records have missing dates.`);
    if (invalidDateRanges > 0) issues.push(`${invalidDateRanges} records have invalid date ranges.`);

    const activeBerths = data.filter(r => r.berthStatus === 'Active').length;

    return {
      rowsLoaded: data.length,
      activeBerths,
      missingBerthNames,
      missingBerthTypes,
      missingOwnershipTypes,
      missingDates,
      invalidDateRanges,
      issues,
    };
  }

  getCachedData(): BerthRecord[] | null {
    return this.cachedData;
  }

  getLastLoaded(): Date | null {
    return this.lastLoaded;
  }

  clearCache(): void {
    this.cachedData = null;
    this.lastLoaded = null;
  }
}

export const excelService = new ExcelService();