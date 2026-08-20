import { useState } from 'react';
import { BerthRecord } from '../types/berth';
import { calculateKPIMetrics, calculatePierOccupancy, calculateBerthTypeOccupancy, calculateOwnershipOccupancy, exportToCSV } from '../utils/dataUtils';

interface ReportsProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

type ReportType = 'occupancy' | 'availability' | 'pier' | 'ownership' | 'berthType';

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
                  {Object.values(row).map((value: any, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
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