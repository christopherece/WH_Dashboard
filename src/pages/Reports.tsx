import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BerthRecord } from '../types/berth';
import { calculateKPIMetrics, calculatePierOccupancy, calculateBerthTypeOccupancy, calculateOwnershipOccupancy, exportToCSV } from '../utils/dataUtils';

interface ReportsProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

type ReportType = 'masterSummary' | 'occupancy' | 'availability' | 'pier' | 'ownership' | 'berthType' | 'futureStatus' | 'customerAge';

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
  const [selectedReport, setSelectedReport] = useState<ReportType>('masterSummary');

  const generateMasterSummaryReport = () => {
    const metrics = calculateKPIMetrics(data);
    const pierData = calculatePierOccupancy(data);
    const ownershipData = calculateOwnershipOccupancy(data);
    const berthTypeData = calculateBerthTypeOccupancy(data);
    const futureRecords = data.filter(r => r.occupancyStatus === 'Future Booking' || r.occupancyStatus === 'Future Rental');
    const validAges = data
      .map(record => calculateCustomerAge(record.customerDateOfBirth))
      .filter((age): age is number => age !== null);

    const topPier = pierData.length > 0
      ? pierData.reduce((max, pier) => pier.occupancyPercentage > max.occupancyPercentage ? pier : max)
      : null;
    const topOwnership = ownershipData.length > 0
      ? ownershipData.reduce((max, ownership) => ownership.occupancyPercentage > max.occupancyPercentage ? ownership : max)
      : null;
    const topBerthType = berthTypeData.length > 0
      ? berthTypeData.reduce((max, berthType) => berthType.occupancyPercentage > max.occupancyPercentage ? berthType : max)
      : null;

    const futureBookings = futureRecords.filter(r => r.occupancyStatus === 'Future Booking').length;
    const futureRentals = futureRecords.filter(r => r.occupancyStatus === 'Future Rental').length;
    const averageAge = validAges.length > 0
      ? validAges.reduce((sum, age) => sum + age, 0) / validAges.length
      : null;

    return [
      { section: 'Occupancy', metric: 'Total Active Berths', value: metrics.totalActiveBerths, details: 'Current active inventory' },
      { section: 'Occupancy', metric: 'Occupied Berths', value: metrics.occupied, details: 'Status: Rented' },
      { section: 'Occupancy', metric: 'Booked Berths', value: metrics.booked, details: 'Status: Booked' },
      { section: 'Occupancy', metric: 'Available Berths', value: metrics.available, details: 'Status: Available' },
      { section: 'Occupancy', metric: 'Overall Occupancy', value: `${metrics.occupancyPercentage.toFixed(1)}%`, details: 'Occupied + booked share of active berths' },
      { section: 'Compliance', metric: 'Vessel Compliance Rate', value: `${metrics.vesselComplianceRate.toFixed(1)}%`, details: 'Rented vessels with no expired or near-expiry items' },
      { section: 'Future Pipeline', metric: 'Future Bookings', value: futureBookings, details: 'Upcoming bookings' },
      { section: 'Future Pipeline', metric: 'Future Rentals', value: futureRentals, details: 'Upcoming rentals' },
      { section: 'Future Pipeline', metric: 'Total Future Commitments', value: futureBookings + futureRentals, details: 'Bookings + rentals' },
      {
        section: 'Pier',
        metric: 'Highest Occupancy Pier',
        value: topPier ? `Pier ${topPier.pier} (${topPier.occupancyPercentage.toFixed(1)}%)` : 'N/A',
        details: topPier ? `${topPier.occupied + topPier.booked}/${topPier.totalBerths} berths occupied or booked` : 'No pier data',
      },
      {
        section: 'Ownership',
        metric: 'Highest Occupancy Ownership',
        value: topOwnership ? `${topOwnership.ownershipType} (${topOwnership.occupancyPercentage.toFixed(1)}%)` : 'N/A',
        details: topOwnership ? `${topOwnership.occupied + topOwnership.booked}/${topOwnership.totalBerths} berths occupied or booked` : 'No ownership data',
      },
      {
        section: 'Berth Type',
        metric: 'Highest Occupancy Berth Type',
        value: topBerthType ? `${topBerthType.berthType} (${topBerthType.occupancyPercentage.toFixed(1)}%)` : 'N/A',
        details: topBerthType ? `${topBerthType.occupied + topBerthType.booked}/${topBerthType.totalBerths} berths occupied or booked` : 'No berth type data',
      },
      {
        section: 'Customers',
        metric: 'Customers With DOB',
        value: validAges.length,
        details: `${data.length > 0 ? ((validAges.length / data.length) * 100).toFixed(1) : '0.0'}% of all records`,
      },
      {
        section: 'Customers',
        metric: 'Average Age',
        value: averageAge !== null ? `${averageAge.toFixed(1)} years` : 'N/A',
        details: 'Based on valid date-of-birth records',
      },
      {
        section: 'Data Timestamp',
        metric: 'Last Updated',
        value: lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown',
        details: 'Based on most recent successful data load',
      },
    ];
  };

  const generateReport = () => {
    switch (selectedReport) {
      case 'masterSummary':
        return generateMasterSummaryReport();
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

  const exportMasterSummaryPDF = () => {
    const metrics = calculateKPIMetrics(data);
    const pierData = calculatePierOccupancy(data);
    const ownershipData = calculateOwnershipOccupancy(data);
    const berthTypeData = calculateBerthTypeOccupancy(data);
    const availableBerths = data.filter(r => r.occupancyStatus === 'Available');
    const futureRecords = data
      .filter(r => r.occupancyStatus === 'Future Booking' || r.occupancyStatus === 'Future Rental')
      .sort((a, b) => {
        const aTime = a.dateIn?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.dateIn?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    const customerAgeData = generateCustomerAgeReport();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const reportDate = new Date();
    const generatedLabel = reportDate.toLocaleString('en-NZ');
    const updatedLabel = lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown';

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Westhaven Dashboard', 14, 12);
    doc.setFontSize(13);
    doc.text('Master Summary Report', 14, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedLabel}`, 14, 27);
    doc.text(`Data Last Updated: ${updatedLabel}`, 14, 32);

    const kpiCards = [
      { label: 'Active Berths', value: String(metrics.totalActiveBerths) },
      { label: 'Occupancy', value: `${metrics.occupancyPercentage.toFixed(1)}%` },
      { label: 'Available', value: String(metrics.available) },
      { label: 'Compliance', value: `${metrics.vesselComplianceRate.toFixed(1)}%` },
    ];

    const cardWidth = (pageWidth - 34) / 4;
    const cardY = 41;
    kpiCards.forEach((card, index) => {
      const x = 14 + (index * (cardWidth + 2));
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, cardY, cardWidth, 20, 2, 2, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(card.label, x + 3, cardY + 7);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(card.value, x + 3, cardY + 15);
    });

    let cursorY = 68;

    const ensureSpace = (requiredHeight: number) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (cursorY + requiredHeight > pageHeight - 12) {
        doc.addPage();
        cursorY = 16;
      }
    };

    const addSectionTitle = (title: string) => {
      ensureSpace(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(title, 14, cursorY);
      cursorY += 3;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, cursorY, pageWidth - 14, cursorY);
      cursorY += 4;
    };

    const addTable = (head: string[], body: (string | number)[][]) => {
      autoTable(doc, {
        startY: cursorY,
        head: [head],
        body,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [51, 65, 85] },
        headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 6;
    };

    addSectionTitle('Executive Summary');
    addTable(
      ['Metric', 'Value', 'Notes'],
      [
        ['Total Active Berths', metrics.totalActiveBerths, 'Current active berth inventory'],
        ['Occupied Berths', metrics.occupied, 'Current rented berths'],
        ['Booked Berths', metrics.booked, 'Current booked berths'],
        ['Available Berths', metrics.available, 'Current available berths'],
        ['Overall Occupancy', `${metrics.occupancyPercentage.toFixed(1)}%`, 'Occupied + booked share'],
        ['Vessel Compliance', `${metrics.vesselComplianceRate.toFixed(1)}%`, 'No expired or near-expiry items'],
        ['Future Commitments', metrics.futureBookings + metrics.futureRentals, 'Future booking + rental records'],
      ]
    );

    addSectionTitle('Pier Occupancy');
    addTable(
      ['Pier', 'Total', 'Occupied', 'Booked', 'Available', 'Occupancy %'],
      pierData.map(pier => [pier.pier, pier.totalBerths, pier.occupied, pier.booked, pier.available, `${pier.occupancyPercentage.toFixed(1)}%`])
    );

    addSectionTitle('Ownership Summary');
    addTable(
      ['Ownership Type', 'Total', 'Occupied', 'Booked', 'Available', 'Occupancy %'],
      ownershipData.map(item => [item.ownershipType, item.totalBerths, item.occupied, item.booked, item.available, `${item.occupancyPercentage.toFixed(1)}%`])
    );

    addSectionTitle('Berth Type Analysis');
    addTable(
      ['Berth Type', 'Total', 'Occupied', 'Booked', 'Available', 'Occupancy %'],
      berthTypeData.map(item => [item.berthType, item.totalBerths, item.occupied, item.booked, item.available, `${item.occupancyPercentage.toFixed(1)}%`])
    );

    addSectionTitle('Available Berths Snapshot');
    addTable(
      ['Berth', 'Pier', 'Type', 'Length', 'Ownership'],
      availableBerths.slice(0, 30).map(item => [item.berth, item.pier, item.berthType, item.nominalLength, item.ownershipType])
    );

    addSectionTitle('Future Bookings and Rentals');
    addTable(
      ['Status', 'Berth', 'Pier', 'Customer', 'Date In', 'Date Out'],
      futureRecords.slice(0, 30).map(item => [
        item.occupancyStatus,
        item.berth,
        item.pier,
        item.customerName || '-',
        item.dateIn ? item.dateIn.toLocaleDateString('en-NZ') : '-',
        item.dateOut ? item.dateOut.toLocaleDateString('en-NZ') : '-',
      ])
    );

    addSectionTitle('Customer Age Statistics');
    addTable(
      ['Age Band', 'Customer Count', 'Share %'],
      customerAgeData.map(item => [item.ageBand, item.customerCount, `${item.percentage.toFixed(1)}%`])
    );

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - 34, doc.internal.pageSize.getHeight() - 6);
    }

    const fileDate = reportDate.toISOString().slice(0, 10);
    doc.save(`westhaven-master-summary-${fileDate}.pdf`);
  };

  const reportTypes = [
    { id: 'masterSummary' as ReportType, name: 'Master Export Summary' },
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
            onClick={exportMasterSummaryPDF}
            className="btn btn-primary"
          >
            Export Master PDF
          </button>
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
