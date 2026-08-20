import { useState, useEffect } from 'react';
import { BerthRecord, FilterState, DataQualityReport } from './types/berth';
import { excelService } from './services/excelService';
import { filterData } from './utils/dataUtils';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FutureAvailability from './pages/FutureAvailability';
import MonthlyOccupancy from './pages/MonthlyOccupancy';
import Berths from './pages/Berths';
import Ownership from './pages/Ownership';
import Reports from './pages/Reports';
import DataQuality from './pages/DataQuality';
import VesselComplianceReport from './pages/VesselComplianceReport';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

type Page = 'dashboard' | 'future' | 'monthly' | 'berths' | 'ownership' | 'reports' | 'quality' | 'compliance';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [data, setData] = useState<BerthRecord[]>([]);
  const [filteredData, setFilteredData] = useState<BerthRecord[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    date: null,
    year: null,
    month: null,
    marina: null,
    pier: null,
    berth: null,
    berthType: null,
    ownershipType: null,
    occupancyStatus: null,
    berthSize: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await excelService.loadData();
      setData(result.data);
      setFilteredData(result.data);
      setDataQuality(result.dataQuality);
      setLastUpdated(excelService.getLastLoaded());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    const filtered = filterData(data, newFilters);
    setFilteredData(filtered);
  };

  const handleRefresh = () => {
    excelService.clearCache();
    loadData();
  };

  const renderPage = () => {
    const commonProps = {
      data: filteredData,
      allData: data,
      filters,
      onFilterChange: handleFilterChange,
      lastUpdated,
      onRefresh: handleRefresh,
    };

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard allData={data} filters={filters} onFilterChange={handleFilterChange} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      case 'future':
        return <FutureAvailability allData={data} filters={filters} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      case 'monthly':
        return <MonthlyOccupancy data={filteredData} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      case 'berths':
        return <Berths data={filteredData} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      case 'ownership':
        return <Ownership data={filteredData} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      case 'reports':
        return <Reports data={filteredData} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      case 'quality':
        return <DataQuality dataQuality={dataQuality} />;
      case 'compliance':
        return <VesselComplianceReport data={data} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;