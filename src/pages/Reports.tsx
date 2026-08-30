import { useState } from 'react';
import { BerthRecord } from '../types/berth';
import { calculateKPIMetrics, calculatePierOccupancy, calculateBerthTypeOccupancy, calculateOwnershipOccupancy, exportToCSV } from '../utils/dataUtils';

interface ReportsProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

type ReportType = 'occupancy' | 'availability' | 'pier' | 'ownership' | 'berthType' | 'futureStatus' | 'customerAge';

const calculateCustomerAge = (dateOfBirth: Date | null): number | null => {
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age;
};

export default function Reports({ data, lastUpdated, onRefresh }: ReportsProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('occupancy');

  const generateReport = () => {
    switch (selectedReport) {
      case 'occupancy':
        return generateOccupancyReport();
      case 'availability':
        return generateAvailabilityReport();
      case 'pier':
        return generatePierReport();
      case 'ownership':
        return generateOwnershipReport();
      case 'berthType':
        return generateBerthTypeReport();
      case 'futureStatus':
        return generateFutureStatusReport();
      case 'customerAge':
        return generateCustomerAgeReport();
      default:
        return [];
    }
  };

  const generateOccupancyReport = () => {
    const metrics = calculateKPIMetrics(data);
    return [{
      report: 'Occupancy Summary',
      totalActiveBerths: metrics.totalActiveBerths,
      occupied: metrics.occupied,
      booked: metrics.booked,
      available: metrics.available,
      occupancyPercentage: metrics.occupancyPercentage,
    }];
  };

  const generateAvailabilityReport = () => {
    return data.filter(r => r.occupancyStatus === 'Available').map(r => ({
      berth: r.berth,
      pier: r.pier,
      berthType: r.berthType,
      length: r.nominalLength,
      ownership: r.ownershipType,
      status: r.occupancyStatus,
    }));
  };

  const generatePierReport = () => {
    return calculatePierOccupancy(data);
  };

  const generateOwnershipReport = () => {
    return calculateOwnershipOccupancy(data);
  };

  const generateBerthTypeReport = () => {
    return calculateBerthTypeOccupancy(data);
  };

  const generateFutureStatusReport = () => {
    return data
      .filter(r => r.occupancyStatus === 'Future Booking' || r.occupancyStatus === 'Future Rental')
      .map(r => ({
        berth: r.berth,
        marina: r.marina,
        pier: r.pier,
        berthType: r.berthType,
        occupancyStatus: r.occupancyStatus,
        ownershipType: r.ownershipType,
        customerName: r.customerName || '—',
        vesselName: r.vesselName || '—',
        dateIn: r.dateIn ? r.dateIn.toLocaleDateString('en-NZ') : '—',
        dateOut: r.dateOut ? r.dateOut.toLocaleDateString('en-NZ') : '—',
        bookingEnteredDate: r.bookingEnteredDate ? r.bookingEnteredDate.toLocaleDateString('en-NZ') : '—',
      }));
  };

  const generateCustomerAgeReport = () => {
    const validRecords = data.filter(r => r.customerDateOfBirth && !Number.isNaN(r.customerDateOfBirth.getTime()));

    if (validRecords.length === 0) {
      return [{ ageBand: 'No DOB data', customerCount: 0, percentage: 0 }];
    }

    const ageBands = [
      { label: 'Under 18', min: 0, max: 17 },
      { label: '18-24', min: 18, max: 24 },
      { label: '25-34', min: 25, max: 34 },
      { label: '35-44', min: 35, max: 44 },
      { label: '45-54', min: 45, max: 54 },
      { label: '55-64', min: 55, max: 64 },
      { label: '65+', min: 65, max: 200 },
    ];

    const rows = ageBands.map(band => {
      const customerCount = validRecords.filter(record => {
        const age = calculateCustomerAge(record.customerDateOfBirth);
        return age !== null && age >= band.min && age <= band.max;
      }).length;

      const percentage = (customerCount / validRecords.length) * 100;

      return {
        ageBand: band.label,
        customerCount,
        percentage: Number(percentage.toFixed(1)),
      };
    }).filter(row => row.customerCount > 0);

    const averageAge = validRecords.reduce((sum, record) => {
      const age = calculateCustomerAge(record.customerDateOfBirth);
      return sum + (age ?? 0);
    }, 0) / validRecords.length;

    return [
      { ageBand: 'Customers with DOB', customerCount: validRecords.length, percentage: 100 },
      { ageBand: 'Average Age', customerCount: Number(averageAge.toFixed(1)), percentage: 0 },
      ...rows,
    ];
  };

  const handleExport = () => {
    const reportData = generateReport();
    const filename = `${selectedReport}-report.csv`;
    exportToCSV(reportData as any, filename);
  };

  const reportTypes = [
    { id: 'occupancy' as ReportType, name: 'Occupancy Summary' },
    { id: 'availability' as ReportType, name: 'Berth Availability' },
    { id: 'pier' as ReportType, name: 'Pier Occupancy' },
    { id: 'ownership' as ReportType, name: 'Ownership Summary' },
    { id: 'berthType' as ReportType, name: 'Berth Type Analysis' },
    { id: 'futureStatus' as ReportType, name: 'Future Booking & Rental' },
    { id: 'customerAge' as ReportType, name: 'Customer Age Statistics' },
  ];

  const reportData = generateReport();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data Last Updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="btn btn-primary"
          >
            Export Report
          </button>
          <button
            onClick={onRefresh}
            className="btn btn-secondary"
          >
            Refresh Data
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Select Report Type</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedReport === type.id
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-medium text-gray-900">{type.name}</h4>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{reportTypes.find(r => r.id === selectedReport)?.name}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(reportData[0] || {}).map((key) => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index}>
                  {Object.entries(row).map(([key, value]: [string, any], cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof value === 'number'
                        ? /percentage/i.test(key)
                          ? `${value.toFixed(1)}%`
                          : value % 1 !== 0
                            ? value.toFixed(1)
                            : value
                        : value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
