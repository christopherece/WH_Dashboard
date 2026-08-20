import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BerthRecord } from '../types/berth';
import { exportToCSV } from '../utils/dataUtils';

interface CustomerAgeReportProps {
  data: BerthRecord[];
  lastUpdated: Date | null;
  onRefresh: () => void;
}

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

export default function CustomerAgeReport({ data, lastUpdated, onRefresh }: CustomerAgeReportProps) {
  const ageSummary = useMemo(() => {
    const validAges = data
      .map((record) => calculateCustomerAge(record.customerDateOfBirth))
      .filter((age): age is number => age !== null && age >= 20);

    if (!validAges.length) {
      return {
        totalKnownAge: 0,
        averageAge: 0,
        oldestAge: 0,
        youngestAge: 0,
        ageBands: [{ label: 'No DOB data', count: 0, percentage: 0 }],
      };
    }

    const averageAge = validAges.reduce((sum, age) => sum + age, 0) / validAges.length;
    const oldestAge = Math.max(...validAges);
    const youngestAge = Math.min(...validAges);

    const ageBands = [
      { label: '20-24', min: 20, max: 24 },
      { label: '25-34', min: 25, max: 34 },
      { label: '35-44', min: 35, max: 44 },
      { label: '45-54', min: 45, max: 54 },
      { label: '55-64', min: 55, max: 64 },
      { label: '65+', min: 65, max: 200 },
    ].map((band) => {
      const count = validAges.filter((age) => age >= band.min && age <= band.max).length;
      return {
        label: band.label,
        count,
        percentage: Number(((count / validAges.length) * 100).toFixed(1)),
      };
    }).filter((band) => band.count > 0);

    return {
      totalKnownAge: validAges.length,
      averageAge: Number(averageAge.toFixed(1)),
      oldestAge,
      youngestAge,
      ageBands,
    };
  }, [data]);

  const handleExport = () => {
    const exportRows = ageSummary.ageBands.map((band) => ({
      ageBand: band.label,
      customerCount: band.count,
      percentage: band.percentage,
    }));

    exportToCSV(exportRows, 'customer-age-report.csv');
  };

  return (
    <div className="dashboard-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Age Report</h1>
          <p className="page-subtitle">
            Customer age distribution and demographic profile from the latest Excel data.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleExport} className="btn btn-primary" disabled={!ageSummary.totalKnownAge}>
            Export CSV
          </button>
          <button onClick={onRefresh} className="btn btn-secondary">
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-sm text-slate-500">Customers with DOB</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{ageSummary.totalKnownAge}</p>
        </div>

        <div className="metric-card">
          <p className="text-sm text-slate-500">Average age</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{ageSummary.totalKnownAge ? `${ageSummary.averageAge} yrs` : 'N/A'}</p>
        </div>

        <div className="metric-card">
          <p className="text-sm text-slate-500">Youngest</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{ageSummary.totalKnownAge ? `${ageSummary.youngestAge} yrs` : 'N/A'}</p>
        </div>

        <div className="metric-card">
          <p className="text-sm text-slate-500">Oldest</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{ageSummary.totalKnownAge ? `${ageSummary.oldestAge} yrs` : 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Age distribution</h3>
          </div>

          {ageSummary.totalKnownAge ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageSummary.ageBands} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} interval={0} angle={-12} textAnchor="end" height={52} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip formatter={(value: number) => [`${value} customers`, 'Customers']} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No customer birth dates are available in the current workbook.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="card-title">Age bracket summary</h3>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Last updated: {lastUpdated ? lastUpdated.toLocaleString('en-NZ') : 'Unknown'}
            </span>
          </div>

          {ageSummary.totalKnownAge ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Age band</th>
                    <th className="px-4 py-3 font-semibold text-right">Customers</th>
                    <th className="px-4 py-3 font-semibold text-right">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {ageSummary.ageBands.map((band) => (
                    <tr key={band.label} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-700">{band.label}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{band.count}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{band.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No age bracket data is available for the current dataset.</p>
          )}
        </div>
      </div>
    </div>
  );
}
