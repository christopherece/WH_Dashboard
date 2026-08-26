import { useState } from 'react';
import { BerthRecord } from '../types/berth';
import { formatDate } from '../utils/dataUtils';

interface BerthTableProps {
  data: BerthRecord[];
  onBerthClick: (berth: BerthRecord) => void;
  showTechnicalDetails: boolean;
}

export default function BerthTable({ data, onBerthClick, showTechnicalDetails }: BerthTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('berth');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredData = data.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const berthSearch = searchTerm.replace(/[\s-]+/g, '').toUpperCase();
    const berthCode = record.berth.replace(/[\s-]+/g, '').toUpperCase();
    return (
      berthCode.includes(berthSearch) ||
      record.pier.toString().toLowerCase().includes(searchLower) ||
      record.berthType.toLowerCase().includes(searchLower) ||
      (record.customerName && record.customerName.toLowerCase().includes(searchLower)) ||
      (record.vesselName && record.vesselName.toLowerCase().includes(searchLower)) ||
      (record.occupancyStatus && record.occupancyStatus.toLowerCase().includes(searchLower))
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortColumn) {
      case 'berth': aVal = a.berth; bVal = b.berth; break;
      case 'pier': aVal = a.pier; bVal = b.pier; break;
      case 'berthType': aVal = a.berthType; bVal = b.berthType; break;
      case 'length': aVal = a.nominalLength; bVal = b.nominalLength; break;
      case 'ownership': aVal = a.ownershipType; bVal = b.ownershipType; break;
      case 'status': aVal = a.occupancyStatus; bVal = b.occupancyStatus; break;
      case 'customer': aVal = a.customerName || ''; bVal = b.customerName || ''; break;
      case 'vessel': aVal = a.vesselName || ''; bVal = b.vesselName || ''; break;
      default: aVal = a.berth; bVal = b.berth;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available': return <span className="badge badge-success">Available</span>;
      case 'Rented': return <span className="badge badge-danger">Rented</span>;
      case 'Booked': return <span className="badge badge-warning">Booked</span>;
      default: return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <label htmlFor="berth-search" className="mb-1 block text-sm font-medium text-slate-700">
          Search berths
        </label>
        <input
          id="berth-search"
          type="text"
          placeholder="Enter a berth code, e.g. A01 or F-102"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">
          Berth codes ignore spaces and dashes. You can also search by pier, customer, vessel or status.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('berth')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Berth {sortColumn === 'berth' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('pier')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Pier {sortColumn === 'pier' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('berthType')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Type {sortColumn === 'berthType' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('length')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Length {sortColumn === 'length' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('ownership')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Ownership {sortColumn === 'ownership' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('customer')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Customer {sortColumn === 'customer' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('vessel')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Vessel {sortColumn === 'vessel' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Out
              </th>
              {showTechnicalDetails && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Berth ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rental ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((record) => (
              <tr
                key={record.berthId}
                onClick={() => onBerthClick(record)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.berth}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.pier}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.berthType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.nominalLength}m</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.ownershipType}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.occupancyStatus)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.customerName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.vesselName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.dateIn)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.dateOut)}</td>
                {showTechnicalDetails && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{record.berthId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{record.rentalAgreementId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{record.bookingId || '-'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} results
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
