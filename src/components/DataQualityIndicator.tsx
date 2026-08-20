import { BerthRecord } from '../types/berth';

interface DataQualityIndicatorProps {
  data: BerthRecord[];
}

export default function DataQualityIndicator({ data }: DataQualityIndicatorProps) {
  const activeBerths = data.filter(r => r.berthStatus === 'Active').length;
  const missingBerthNames = data.filter(r => !r.berth || r.berth === '').length;
  const missingBerthTypes = data.filter(r => !r.berthType).length;
  const missingOwnershipTypes = data.filter(r => !r.ownershipType).length;

  const hasIssues = missingBerthNames > 0 || missingBerthTypes > 0 || missingOwnershipTypes > 0;

  if (!hasIssues) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-green-600 mr-2">✓</span>
          <span className="text-sm text-green-800">
            Data quality good: {data.length} rows loaded, {activeBerths} active berths
          </span>
        </div>
      </div>
    );
  }

  const issues = [];
  if (missingBerthNames > 0) issues.push(`${missingBerthNames} missing berth names`);
  if (missingBerthTypes > 0) issues.push(`${missingBerthTypes} missing berth types`);
  if (missingOwnershipTypes > 0) issues.push(`${missingOwnershipTypes} missing ownership types`);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <span className="text-yellow-600 mr-2">⚠</span>
        <div>
          <p className="text-sm text-yellow-800 font-medium">Data quality issues detected</p>
          <p className="text-sm text-yellow-700 mt-1">
            {issues.join(', ')} ({data.length} rows loaded, {activeBerths} active berths)
          </p>
        </div>
      </div>
    </div>
  );
}