import { useState, useMemo } from 'react';
import { BerthRecord } from '../types/berth';
import { exportToCSV } from '../utils/dataUtils';

interface VesselComplianceReportProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export default function VesselComplianceReport({ data, lastUpdated, onRefresh }: VesselComplianceReportProps) {
  const [showAll, setShowAll] = useState(true);
  const [warningDays, setWarningDays] = useState(30); // Days before expiry to show as warning
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'compliant' | 'warning' | 'non-compliant'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'compatible' | 'over-size' | 'under-size'>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<'all' | 'valid' | 'expiring-soon' | 'expired'>('all');
  const [ewofFilter, setEwofFilter] = useState<'all' | 'valid' | 'expiring-soon' | 'expired'>('all');
  const [tntFilter, setTntFilter] = useState<'all' | 'valid' | 'expiring-soon' | 'expired'>('all');

  const complianceData = useMemo(() => {
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + warningDays);

    return data
      .filter(record => record.occupancyStatus === 'Rented' && record.vesselName) // Only occupied berths with vessels
      .map(record => {
        const ewofRequired = Boolean(record.ewofRequired);
        const tntRequired = Boolean(record.tntRequired);

        // Determine compliance status for each field
        const getComplianceStatus = (expiryDate: Date | null, isRequired: boolean) => {
          if (!isRequired) return 'Valid';
          if (!expiryDate) return 'Expired';
          
          if (expiryDate < today) return 'Expired';
          if (expiryDate <= warningDate) return 'Expiring Soon';
          return 'Valid';
        };

        const insuranceStatus = getComplianceStatus(record.insuranceExpiry, true);
        const ewofStatus = getComplianceStatus(record.ewofExpiry, ewofRequired);
        const tntStatus = getComplianceStatus(record.tntExpiry, tntRequired);

        // Determine overall compliance
        const hasExpired = insuranceStatus === 'Expired' || ewofStatus === 'Expired' || tntStatus === 'Expired';
        const hasWarning = insuranceStatus === 'Expiring Soon' || ewofStatus === 'Expiring Soon' || tntStatus === 'Expiring Soon';
        
        let overallCompliance: 'Compliant' | 'Warning' | 'Non-Compliant';
        if (hasExpired) overallCompliance = 'Non-Compliant';
        else if (hasWarning) overallCompliance = 'Warning';
        else overallCompliance = 'Compliant';

        // Size compatibility check
        // Compare the vessel dimensions against the berth's actual dimensions, with explicit fallbacks for missing data.
        const vesselLength = record.vesselLength && record.vesselLength > 0 ? record.vesselLength : (record.actualLength || record.nominalLength);
        const vesselWidth = record.vesselWidth && record.vesselWidth > 0 ? record.vesselWidth : (record.actualWidth || record.nominalWidth);
        const berthLength = record.berthActualLength && record.berthActualLength > 0 ? record.berthActualLength : (record.actualLength || record.nominalLength);
        const berthWidth = record.berthActualWidth && record.berthActualWidth > 0 ? record.berthActualWidth : (record.actualWidth || record.nominalWidth);

        // Allow a 2% overage only against the berth's Actual Length. Width has no tolerance.
        const berthLengthThreshold = record.berthActualLength && record.berthActualLength > 0
          ? record.berthActualLength * 1.02
          : berthLength;

        let sizeCompatibility: 'Compatible' | 'Over Size' | 'Under Size';
        if (vesselLength > berthLengthThreshold || vesselWidth > berthWidth) {
          sizeCompatibility = 'Over Size';
        } else if (vesselLength < berthLength * 0.7 || vesselWidth < berthWidth * 0.7) {
          sizeCompatibility = 'Under Size';
        } else {
          sizeCompatibility = 'Compatible';
        }

        return {
          vesselId: record.vesselId,
          vesselName: record.vesselName,
          berth: record.berth,
          pier: record.pier,
          customerName: record.customerName,
          powerConnectionType: record.powerConnectionType,
          ewofRequired,
          tntRequired,
          insuranceExpiry: record.insuranceExpiry,
          ewofExpiry: record.ewofExpiry,
          tntExpiry: record.tntExpiry,
          insuranceStatus,
          ewofStatus,
          tntStatus,
          overallCompliance,
          sizeCompatibility,
          vesselLength,
          vesselWidth,
          berthLength,
          berthWidth,
        };
      });
  }, [data, warningDays]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = complianceData.length;
    const compliant = complianceData.filter(c => c.overallCompliance === 'Compliant').length;
    const warning = complianceData.filter(c => c.overallCompliance === 'Warning').length;
    const nonCompliant = complianceData.filter(c => c.overallCompliance === 'Non-Compliant').length;
    
    const compatible = complianceData.filter(c => c.sizeCompatibility === 'Compatible').length;
    const overSize = complianceData.filter(c => c.sizeCompatibility === 'Over Size').length;
    const underSize = complianceData.filter(c => c.sizeCompatibility === 'Under Size').length;

    return { total, compliant, warning, nonCompliant, compatible, overSize, underSize };
  }, [complianceData]);

  // Filter data based on multiple criteria
  const displayData = useMemo(() => {
    let filtered = complianceData;

    // Apply show all vs issues only filter
    if (!showAll) {
      filtered = filtered.filter(c => c.overallCompliance !== 'Compliant');
    }

    // Apply compliance status filter
    if (complianceFilter !== 'all') {
      filtered = filtered.filter(c => {
        switch (complianceFilter) {
          case 'compliant': return c.overallCompliance === 'Compliant';
          case 'warning': return c.overallCompliance === 'Warning';
          case 'non-compliant': return c.overallCompliance === 'Non-Compliant';
          default: return true;
        }
      });
    }

    // Apply size compatibility filter
    if (sizeFilter !== 'all') {
      filtered = filtered.filter(c => {
        switch (sizeFilter) {
          case 'compatible': return c.sizeCompatibility === 'Compatible';
          case 'over-size': return c.sizeCompatibility === 'Over Size';
          case 'under-size': return c.sizeCompatibility === 'Under Size';
          default: return true;
        }
      });
    }

    // Apply insurance filter
    if (insuranceFilter !== 'all') {
      filtered = filtered.filter(c => {
        switch (insuranceFilter) {
          case 'valid': return c.insuranceStatus === 'Valid';
          case 'expiring-soon': return c.insuranceStatus === 'Expiring Soon';
          case 'expired': return c.insuranceStatus === 'Expired';
          default: return true;
        }
      });
    }

    // Apply EWOF filter
    if (ewofFilter !== 'all') {
      filtered = filtered.filter(c => {
        switch (ewofFilter) {
          case 'valid': return c.ewofStatus === 'Valid';
          case 'expiring-soon': return c.ewofStatus === 'Expiring Soon';
          case 'expired': return c.ewofStatus === 'Expired';
          default: return true;
        }
      });
    }

    // Apply TNT filter
    if (tntFilter !== 'all') {
      filtered = filtered.filter(c => {
        switch (tntFilter) {
          case 'valid': return c.tntStatus === 'Valid';
          case 'expiring-soon': return c.tntStatus === 'Expiring Soon';
          case 'expired': return c.tntStatus === 'Expired';
          default: return true;
        }
      });
    }

    return filtered;
  }, [complianceData, showAll, complianceFilter, sizeFilter, insuranceFilter, ewofFilter, tntFilter]);

  // Filtered statistics
  const filteredStats = useMemo(() => {
    const total = displayData.length;
    const compliant = displayData.filter(c => c.overallCompliance === 'Compliant').length;
    const warning = displayData.filter(c => c.overallCompliance === 'Warning').length;
    const nonCompliant = displayData.filter(c => c.overallCompliance === 'Non-Compliant').length;
    
    const compatible = displayData.filter(c => c.sizeCompatibility === 'Compatible').length;
    const overSize = displayData.filter(c => c.sizeCompatibility === 'Over Size').length;
    const underSize = displayData.filter(c => c.sizeCompatibility === 'Under Size').length;

    return { total, compliant, warning, nonCompliant, compatible, overSize, underSize };
  }, [displayData]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-NZ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Valid':
      case 'Compliant':
      case 'Compatible':
        return <span className="badge badge-success">{status}</span>;
      case 'Expiring Soon':
      case 'Warning':
      case 'Under Size':
        return <span className="badge badge-warning">{status}</span>;
      case 'Expired':
      case 'Non-Compliant':
      case 'Over Size':
        return <span className="badge badge-danger">{status}</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Unknown';
    return lastUpdated.toLocaleString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = () => {
    const exportRows = displayData.map((item) => ({
      'Vessel ID': item.vesselId || '',
      Vessel: item.vesselName,
      Berth: item.berth,
      Pier: item.pier,
      Customer: item.customerName || '',
      'Power Connection': item.powerConnectionType || '',
      'Insurance Expiry': formatDate(item.insuranceExpiry),
      'Insurance Status': item.insuranceStatus,
      'EWOF Required': item.ewofRequired ? 'Yes' : 'No',
      'EWOF Expiry': formatDate(item.ewofExpiry),
      'EWOF Status': item.ewofRequired ? item.ewofStatus : 'Not Required',
      'TNT Required': item.tntRequired ? 'Yes' : 'No',
      'TNT Expiry': formatDate(item.tntExpiry),
      'TNT Status': item.tntRequired ? item.tntStatus : 'Not Required',
      'Overall Compliance': item.overallCompliance,
      'Size Compatibility': item.sizeCompatibility,
      'Vessel Length (m)': item.vesselLength,
      'Vessel Width (m)': item.vesselWidth,
      'Berth Length (m)': item.berthLength,
      'Berth Width (m)': item.berthWidth,
    }));

    exportToCSV(exportRows, 'vessel-compliance-report.csv');
  };

  return (
    <div className="w-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vessel Compliance Report</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data Last Updated: {formatLastUpdated()}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={handleExport}
            className="btn btn-primary w-full sm:w-auto"
            disabled={!displayData.length}
          >
            Export Report
          </button>
          <button
            onClick={onRefresh}
            className="btn btn-secondary w-full sm:w-auto"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600">Total Vessels</p>
            <p className="text-2xl font-bold text-gray-900">{filteredStats.total}</p>
            <p className="text-xs text-gray-400">of {stats.total} total</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600">Compliant</p>
            <p className="text-2xl font-bold text-green-600">{filteredStats.compliant}</p>
            <p className="text-xs text-gray-400">of {stats.compliant} total</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600">Warning</p>
            <p className="text-2xl font-bold text-yellow-600">{filteredStats.warning}</p>
            <p className="text-xs text-gray-400">of {stats.warning} total</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <p className="text-sm text-gray-600">Non-Compliant</p>
            <p className="text-2xl font-bold text-red-600">{filteredStats.nonCompliant}</p>
            <p className="text-xs text-gray-400">of {stats.nonCompliant} total</p>
          </div>
        </div>
      </div>

      {/* Size Compatibility Statistics */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Size Compatibility Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Compatible</p>
            <p className="text-xl font-bold text-green-600">{filteredStats.compatible}</p>
            <p className="text-xs text-gray-400">of {stats.compatible} total</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Over Size</p>
            <p className="text-xl font-bold text-red-600">{filteredStats.overSize}</p>
            <p className="text-xs text-gray-400">of {stats.overSize} total</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Under Size</p>
            <p className="text-xl font-bold text-yellow-600">{filteredStats.underSize}</p>
            <p className="text-xs text-gray-400">of {stats.underSize} total</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="card-title">Filter Options</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-sm text-gray-700">Show All Vessels</span>
            </label>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Warning Period (days):</label>
              <input
                type="number"
                value={warningDays}
                onChange={(e) => setWarningDays(Number(e.target.value))}
                className="input w-24"
                min="1"
                max="365"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Overall Compliance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overall Compliance</label>
              <select
                value={complianceFilter}
                onChange={(e) => setComplianceFilter(e.target.value as any)}
                className="select"
              >
                <option value="all">All Status</option>
                <option value="compliant">Compliant</option>
                <option value="warning">Warning</option>
                <option value="non-compliant">Non-Compliant</option>
              </select>
            </div>

            {/* Size Compatibility Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size Compatibility</label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value as any)}
                className="select"
              >
                <option value="all">All Sizes</option>
                <option value="compatible">Compatible</option>
                <option value="over-size">Over Size</option>
                <option value="under-size">Under Size</option>
              </select>
            </div>

            {/* Insurance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Status</label>
              <select
                value={insuranceFilter}
                onChange={(e) => setInsuranceFilter(e.target.value as any)}
                className="select"
              >
                <option value="all">All Status</option>
                <option value="valid">Valid</option>
                <option value="expiring-soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* EWOF Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">EWOF Status</label>
              <select
                value={ewofFilter}
                onChange={(e) => setEwofFilter(e.target.value as any)}
                className="select"
              >
                <option value="all">All Status</option>
                <option value="valid">Valid</option>
                <option value="expiring-soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* TNT Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TNT Status</label>
              <select
                value={tntFilter}
                onChange={(e) => setTntFilter(e.target.value as any)}
                className="select"
              >
                <option value="all">All Status</option>
                <option value="valid">Valid</option>
                <option value="expiring-soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setComplianceFilter('all');
                  setSizeFilter('all');
                  setInsuranceFilter('all');
                  setEwofFilter('all');
                  setTntFilter('all');
                }}
                className="btn btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="card w-full">
        <div className="card-header">
          <h3 className="card-title">
            Vessel Compliance Details
            {(!showAll || complianceFilter !== 'all' || sizeFilter !== 'all' || 
              insuranceFilter !== 'all' || ewofFilter !== 'all' || tntFilter !== 'all') && 
              ' (Filtered)'}
          </h3>
          <p className="text-sm text-gray-600">
            Showing {displayData.length} of {complianceData.length} vessels
          </p>
        </div>
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1100px] w-full table-fixed divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Vessel</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Berth</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Customer</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Power</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Insurance</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">EWOF</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">TNT</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Overall</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 sm:px-4">Size Fit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {displayData.map((item, index) => (
                <tr key={index} className="align-top transition-colors hover:bg-slate-50">
                  <td className="px-3 py-4 text-sm font-semibold text-slate-900 sm:px-4">{item.vesselName}</td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">{item.berth} (Pier {item.pier})</td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">{item.customerName || '-'}</td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">
                    <div className="font-semibold text-slate-900">{item.powerConnectionType || 'N/A'}</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {item.ewofRequired && item.tntRequired ? 'EWOF + TNT' : item.tntRequired ? 'TNT only' : 'None required'}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">
                    <div>{formatDate(item.insuranceExpiry)}</div>
                    <div className="mt-1">{getStatusBadge(item.insuranceStatus)}</div>
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">
                    <div>{formatDate(item.ewofExpiry)}</div>
                    <div className="mt-1">
                      {item.ewofRequired ? getStatusBadge(item.ewofStatus) : <span className="badge badge-info">Not Required</span>}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">
                    <div>{formatDate(item.tntExpiry)}</div>
                    <div className="mt-1">
                      {item.tntRequired ? getStatusBadge(item.tntStatus) : <span className="badge badge-info">Not Required</span>}
                    </div>
                  </td>
                  <td className="px-3 py-4 sm:px-4">{getStatusBadge(item.overallCompliance)}</td>
                  <td className="px-3 py-4 text-sm text-slate-600 sm:px-4">
                    <div>{getStatusBadge(item.sizeCompatibility)}</div>
                    <div className="mt-1 break-words text-[11px] text-slate-400">
                      V: {item.vesselLength}m × {item.vesselWidth}m | B: {item.berthLength}m × {item.berthWidth}m
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No vessels found matching the current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
