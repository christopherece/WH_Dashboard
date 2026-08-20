import { cn } from '../utils/cn';

type Page = 'dashboard' | 'future' | 'future-bookings' | 'monthly' | 'berths' | 'ownership' | 'reports' | 'quality' | 'compliance';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const navigation = [
  { name: 'Dashboard', id: 'dashboard' as Page, icon: '📊' },
  { name: 'Future Availability', id: 'future' as Page, icon: '📅' },
  { name: 'Future Bookings', id: 'future-bookings' as Page, icon: '📌' },
  // { name: 'Monthly Occupancy', id: 'monthly' as Page, icon: '📈' }, // Hidden for now
  { name: 'Berths', id: 'berths' as Page, icon: '⚓' },
  { name: 'Ownership', id: 'ownership' as Page, icon: '🏢' },
  { name: 'Vessel Compliance', id: 'compliance' as Page, icon: '🛡️' },
  { name: 'Reports', id: 'reports' as Page, icon: '📋' },
  { name: 'Data Quality', id: 'quality' as Page, icon: '✅' },
];

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-navy-900 text-white flex flex-col">
      <div className="p-6 border-b border-navy-800">
        <h1 className="text-xl font-bold">Westhaven Marina</h1>
        <p className="text-sm text-navy-300 mt-1">Occupancy & Berth Dashboard</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              'w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
              currentPage === item.id
                ? 'bg-navy-700 text-white'
                : 'text-navy-300 hover:bg-navy-800 hover:text-white'
            )}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-navy-800">
        <div className="text-xs text-navy-400">
          <p>Internal Use Only</p>
          <p className="mt-1">© 2026 Westhaven Marina | Chris Ancheta</p>
        </div>
      </div>
    </aside>
  );
}