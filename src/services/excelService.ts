import * as XLSX from 'xlsx';
import { BerthRecord, DataQualityReport, ReversionRecord } from '../types/berth';

const EXCEL_FILE_NAMES = [
  'OccupancyReport.xlsx',
  'NewDashboardWithCompliance.xlsx',
];
const REVERSION_FILE_NAME = 'ReversionMasterQuery.xlsx';

// Use a relative URL so a browser on another device talks to the laptop hosting
// the dashboard, rather than its own localhost. Vite proxies this in development.
// A localhost value is only valid for the hosting laptop, so never send it to
// browsers opened from another device.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const isLocalOnlyUrl = configuredApiUrl
  ? /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i.test(configuredApiUrl)
  : false;
const API_URL = configuredApiUrl && !isLocalOnlyUrl ? configuredApiUrl.replace(/\/$/, '') : '';

export class ExcelService {
  private cachedData: BerthRecord[] | null = null;
  private lastLoaded: Date | null = null;

  async loadData(): Promise<{ data: BerthRecord[]; dataQuality: DataQualityReport }> {
    try {
      let response: Response | null = null;
      let resolvedPath = '';

      // Try loading from backend API
      for (const fileName of EXCEL_FILE_NAMES) {
        try {
          response = await fetch(`${API_URL}/api/file/${fileName}`);
          if (response.ok) {
            resolvedPath = fileName;
            break;
          }
        } catch (error) {
          console.warn(`Failed to fetch ${fileName} from API:`, error);
          continue;
        }
      }

      // Fallback to public folder if API fails
      if (!response || !response.ok) {
        console.info('Falling back to public folder...');
        for (const fileName of EXCEL_FILE_NAMES) {
          response = await fetch(`/${fileName}`);
          if (response.ok) {
            resolvedPath = `(public) ${fileName}`;
            break;
          }
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to load Excel file. Tried API and public folder.`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('The data server returned a web page instead of the Excel workbook. Ensure the dashboard server is running and reachable.');
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

  async loadReversionData(): Promise<ReversionRecord[]> {
    let response: Response | null = null;

    try {
      response = await fetch(`${API_URL}/api/file/${REVERSION_FILE_NAME}`);
    } catch (error) {
      console.warn('Failed to fetch Reversion Master Query from API:', error);
    }

    if (!response?.ok) {
      response = await fetch(`/${REVERSION_FILE_NAME}`);
    }

    if (!response.ok) {
      throw new Error('Reversion Master Query data is currently unavailable. Ensure ReversionMasterQuery.xlsx is present in the configured data folder.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (!rawData.length) {
      throw new Error('Reversion Master Query contains no data.');
    }

    return this.parseReversionData(rawData);
  }

  private parseData(rawData: any[]): BerthRecord[] {
    return rawData.map((row: any, index: number) => {
      try {
        const normalizedRow = this.normalizeRowKeys(row);

        // Parse berth as string since it contains alphanumeric values like "AA01"
        const berthValue = this.getFirstValue(normalizedRow, ['Berth', 'BerthNumber', 'BerthNo', 'Berth Number', 'Berth Number', 'BERTH']);
        const berth = this.parseString(berthValue);

        return {
          berthId: this.parseNumber(this.getFirstValue(normalizedRow, ['BerthID', 'ID', 'Id'])),
          berth: berth,
          pier: this.parseStringOrNumber(this.getFirstValue(normalizedRow, ['Pier', 'PIER'])),
          berthType: this.parseString(this.getFirstValue(normalizedRow, ['BerthType', 'Type', 'TYPE'])),
          nominalLength: this.parseNumber(this.getFirstValue(normalizedRow, ['NominalLength', 'Length', 'LENGTH'])),
          nominalWidth: this.parseNumber(this.getFirstValue(normalizedRow, ['NominalWidth', 'Width'])),
          nominalDepth: this.parseNumber(this.getFirstValue(normalizedRow, ['NominalDepth', 'Depth'])),
          actualLength: this.parseNumber(this.getFirstValue(normalizedRow, ['ActualLength', 'BerthActualLength'])),
          actualWidth: this.parseNumber(this.getFirstValue(normalizedRow, ['ActualWidth', 'BerthActualWidth'])),
          actualDepth: this.parseNumber(this.getFirstValue(normalizedRow, ['ActualDepth', 'BerthActualDepth'])),
          vesselLength: this.parseNumber(this.getFirstValue(normalizedRow, ['VesselLength', 'VesselLengthM', 'BoatLength', 'BoatLengthM'])),
          vesselWidth: this.parseNumber(this.getFirstValue(normalizedRow, ['VesselWidth', 'VesselWidthM', 'VesselBeam', 'Beam', 'BoatWidth', 'BoatWidthM'])),
          berthActualLength: this.parseNumber(this.getFirstValue(normalizedRow, ['BerthActualLength', 'ActualLength'])),
          berthActualWidth: this.parseNumber(this.getFirstValue(normalizedRow, ['BerthActualWidth', 'ActualWidth'])),
          marina: this.parseString(this.getFirstValue(normalizedRow, ['Marina', 'MARINA'])),
          berthStatus: this.parseString(this.getFirstValue(normalizedRow, ['BerthStatus', 'Status', 'STATUS'])),
          ownershipTypeId: this.parseNumber(this.getFirstValue(normalizedRow, ['OwnershipTypeID'])),
          ownershipType: this.parseString(this.getFirstValue(normalizedRow, ['OwnershipType', 'Ownership'])),
          occupancyStatus: this.parseString(this.getFirstValue(normalizedRow, ['OccupancyStatus'])),
          occupiedFlag: this.parseNumber(this.getFirstValue(normalizedRow, ['OccupiedFlag'])),
          availableFlag: this.parseNumber(this.getFirstValue(normalizedRow, ['AvailableFlag'])),
          rentalAgreementId: this.parseNullableString(this.getFirstValue(normalizedRow, ['RentalAgreementID'])),
          bookingId: this.parseNullableString(this.getFirstValue(normalizedRow, ['BookingID'])),
          dateIn: this.parseDate(this.getFirstValue(normalizedRow, ['DateIn'])),
          dateOut: this.parseDate(this.getFirstValue(normalizedRow, ['DateOut'])),
          bookingEnteredDate: this.parseDate(this.getFirstValue(normalizedRow, ['BookingEnteredDate'])),
          customerId: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerID'])),
          customerName: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerName'])),
          customerAddressLine1: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerAddressLine1'])),
          customerAddressLine2: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerAddressLine2'])),
          customerAddressLine3: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerAddressLine3'])),
          customerAddressLine4: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerAddressLine4'])),
          customerAddressLine5: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerAddressLine5'])),
          customerCountryCode: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerCountryCode'])),
          customerPostCode: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerPostCode'])),
          customerCity: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerCity', 'City', 'Suburb', 'CustomerAddressLine3', 'CustomerAddressLine5', 'CustomerAddressLine4'])),
          customerRegion: this.parseNullableString(this.getFirstValue(normalizedRow, ['Region', 'State', 'CustomerAddressLine4', 'CustomerAddressLine5', 'CustomerCountryCode'])),
          customerDateOfBirth: this.parseDate(this.getFirstValue(normalizedRow, [
            'CustomerDateOfBirth',
            'CustomerDateofBirth',
            'CustomerDAteofBirth',
            'CustomerDOB',
            'CustomerBirthDate',
            'Customer Date Of Birth',
            'Customer Birth Date',
            'DateOfBirth',
            'DOB'
          ])),
          vesselId: this.parseNullableString(this.getFirstValue(normalizedRow, ['VesselID'])),
          vesselName: this.parseNullableString(this.getFirstValue(normalizedRow, ['VesselName'])),
          serviceStatus: this.parseNullableString(this.getFirstValue(normalizedRow, ['ServiceStatus'])),
          serviceLineType: this.parseNullableString(this.getFirstValue(normalizedRow, ['ServiceLineType'])),
          powerConnectionType: this.parseNullableString(this.getFirstValue(normalizedRow, ['PowerConnectionType'])),
          ewofRequired: this.parseRequiredFlag(this.getFirstValue(normalizedRow, ['EWOFRequired'])),
          tntRequired: this.parseRequiredFlag(this.getFirstValue(normalizedRow, ['TNTRequired'])),
          insuranceExpiry: this.parseDate(this.getFirstValue(normalizedRow, ['InsuranceExpiry'])),
          ewofExpiry: this.parseDate(this.getFirstValue(normalizedRow, ['EWOFExpiry'])),
          tntExpiry: this.parseDate(this.getFirstValue(normalizedRow, ['TNTExpiry'])),
        };
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error);
        // Return a default record for failed rows
        return this.getDefaultRecord();
      }
    }).filter(record => record.berthId > 0); // Filter out completely invalid records
  }

  private parseReversionData(rawData: any[]): ReversionRecord[] {
    return rawData.map((row) => {
      const normalizedRow = this.normalizeRowKeys(row);
      return {
        trustGroup: this.parseString(this.getFirstValue(normalizedRow, ['TrustGroup'])),
        ownershipType: this.parseString(this.getFirstValue(normalizedRow, ['OwnershipType'])),
        customerId: this.parseNullableString(this.getFirstValue(normalizedRow, ['CustomerID'])),
        owner: this.parseNullableString(this.getFirstValue(normalizedRow, ['Owner'])),
        pier: this.parseStringOrNumber(this.getFirstValue(normalizedRow, ['Pier'])),
        berth: this.parseString(this.getFirstValue(normalizedRow, ['Berth'])),
        berthType: this.parseString(this.getFirstValue(normalizedRow, ['BerthType'])),
        berthLength: this.parseNumber(this.getFirstValue(normalizedRow, ['BerthLength'])),
        occupancyStatus: this.parseString(this.getFirstValue(normalizedRow, ['OccupancyStatus'])),
        occupier: this.parseNullableString(this.getFirstValue(normalizedRow, ['Occupier'])),
        occupierType: this.parseNullableString(this.getFirstValue(normalizedRow, ['OccupierType'])),
        rentalStartDate: this.parseDate(this.getFirstValue(normalizedRow, ['RentalStartDate'])),
        rentalEndDate: this.parseDate(this.getFirstValue(normalizedRow, ['RentalEndDate'])),
        rentalAgreementId: this.parseNullableString(this.getFirstValue(normalizedRow, ['RentalAgreementID'])),
      };
    }).filter((record) => record.berth);
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
      vesselLength: 0,
      vesselWidth: 0,
      berthActualLength: 0,
      berthActualWidth: 0,
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
      customerAddressLine1: null,
      customerAddressLine2: null,
      customerAddressLine3: null,
      customerAddressLine4: null,
      customerAddressLine5: null,
      customerCountryCode: null,
      customerPostCode: null,
      customerCity: null,
      customerRegion: null,
      customerDateOfBirth: null,
      vesselId: null,
      vesselName: null,
      serviceStatus: null,
      serviceLineType: null,
      powerConnectionType: null,
      ewofRequired: false,
      tntRequired: false,
      insuranceExpiry: null,
      ewofExpiry: null,
      tntExpiry: null,
    };
  }

  private normalizeRowKeys(row: any): Record<string, any> {
    if (!row || typeof row !== 'object') {
      return {};
    }

    const normalized: Record<string, any> = {};

    Object.keys(row).forEach((key) => {
      const value = row[key];
      const cleanKey = String(key).trim();
      normalized[cleanKey] = value;
      normalized[cleanKey.toLowerCase()] = value;
      normalized[cleanKey.toLowerCase().replace(/\s+/g, '')] = value;
      normalized[cleanKey.replace(/\s+/g, '')] = value;
    });

    return normalized;
  }

  private getFirstValue(row: Record<string, any>, keys: string[]): any {
    for (const key of keys) {
      const direct = row[key];
      if (direct !== undefined && direct !== null && direct !== '') {
        return direct;
      }

      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
      const match = Object.keys(row).find((candidate) => candidate.trim().toLowerCase().replace(/\s+/g, '') === normalizedKey);
      if (match !== undefined && row[match] !== undefined && row[match] !== null && row[match] !== '') {
        return row[match];
      }
    }

    return undefined;
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

  private parseRequiredFlag(value: any): boolean {
    if (value === null || value === undefined || value === 'NULL' || value === '') return false;
    const normalized = String(value).trim().toUpperCase();
    return ['Y', 'YES', 'TRUE', '1', 'REQUIRED', 'REQ'].includes(normalized);
  }

  private parseDate(value: any): Date | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || ['NULL', 'N/A', 'NA', 'UNKNOWN'].includes(trimmed.toUpperCase())) return null;

      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value === 0) return null;
      // Excel stores dates as day serials. Parse their calendar components directly
      // to avoid daylight-saving offsets changing the displayed date.
      const excelDate = XLSX.SSF.parse_date_code(value);
      return excelDate ? new Date(excelDate.y, excelDate.m - 1, excelDate.d) : null;
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
