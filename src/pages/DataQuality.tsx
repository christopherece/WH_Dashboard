import { DataQualityReport } from '../types/berth';

interface DataQualityProps {
  dataQuality: DataQualityReport | null;
}

export default function DataQuality({ dataQuality }: DataQualityProps) {
  if (!dataQuality) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Quality</h1>
        <p className="text-sm text-gray-600 mt-4">No data quality information available.</p>
      </div>
    );
  }

  const hasIssues = dataQuality.issues.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Quality Report</h1>
        <p className="text-sm text-gray-600 mt-1">
          Last loaded: {new Date().toLocaleString('en-NZ')}
        </p>
      </div>

      {/* Overall Status */}
      <div className={`card ${hasIssues ? 'border-yellow-300' : 'border-green-300'}`}>
        <div className="card-header">
          <h3 className="card-title">Overall Status</h3>
        </div>
        <div className={`flex items-center ${hasIssues ? 'text-yellow-700' : 'text-green-700'}`}>
          <span className="text-3xl mr-3">{hasIssues ? '⚠️' : '✅'}</span>
          <div>
            <p className="font-semibold">{hasIssues ? 'Issues Detected' : 'Data Quality Good'}</p>
            <p className="text-sm">
              {dataQuality.rowsLoaded} rows loaded, {dataQuality.activeBerths} active berths
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Rows Loaded</p>
          <p className="text-2xl font-bold text-gray-900">{dataQuality.rowsLoaded}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Active Berths</p>
          <p className="text-2xl font-bold text-navy-700">{dataQuality.activeBerths}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Missing Berth Names</p>
          <p className={`text-2xl font-bold ${dataQuality.missingBerthNames > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dataQuality.missingBerthNames}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Missing Berth Types</p>
          <p className={`text-2xl font-bold ${dataQuality.missingBerthTypes > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dataQuality.missingBerthTypes}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Missing Ownership Types</p>
          <p className={`text-2xl font-bold ${dataQuality.missingOwnershipTypes > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dataQuality.missingOwnershipTypes}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Missing Dates</p>
          <p className={`text-2xl font-bold ${dataQuality.missingDates > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dataQuality.missingDates}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Invalid Date Ranges</p>
          <p className={`text-2xl font-bold ${dataQuality.invalidDateRanges > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {dataQuality.invalidDateRanges}
          </p>
        </div>
      </div>

      {/* Issues */}
      {hasIssues && (
        <div className="card border-yellow-300">
          <div className="card-header">
            <h3 className="card-title">Issues Found</h3>
          </div>
          <ul className="space-y-2">
            {dataQuality.issues.map((issue, index) => (
              <li key={index} className="flex items-start text-sm text-yellow-800">
                <span className="mr-2">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {hasIssues && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="card-header">
            <h3 className="card-title">Recommendations</h3>
          </div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Review the source data export to ensure all required fields are populated</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Validate date ranges in the source system before exporting</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Ensure consistent naming conventions for berth types and ownership types</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}