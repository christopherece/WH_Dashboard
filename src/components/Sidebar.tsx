import { cn } from '../utils/cn';

type Page = 'dashboard' | 'future' | 'future-bookings' | 'marina-map' | 'customer-heatmap' | 'customer-age' | 'monthly' | 'berths' | 'ownership' | 'reports' | 'quality' | 'compliance' | 'reversion';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const navigation = [
  { name: 'Dashboard', id: 'dashboard' as Page, icon: '📊' },
  { name: 'Future Bookings', id: 'future-bookings' as Page, icon: '📌' },
  { name: 'Marina Map', id: 'marina-map' as Page, icon: '🗺️' },
  { name: 'Customer Heat Map', id: 'customer-heatmap' as Page, icon: '🔥' },
  { name: 'Customer Age Report', id: 'customer-age' as Page, icon: '👥' },
  // { name: 'Monthly Occupancy', id: 'monthly' as Page, icon: '📈' }, // Hidden for now
  { name: 'Berths', id: 'berths' as Page, icon: '⚓' },
  { name: 'Ownership', id: 'ownership' as Page, icon: '🏢' },
  { name: 'Vessel Compliance', id: 'compliance' as Page, icon: '🛡️' },
  { name: 'Reports', id: 'reports' as Page, icon: '📋' },
  { name: 'Data Quality', id: 'quality' as Page, icon: '✅' },
  { name: 'Reversion Report', id: 'reversion' as Page, icon: 'R' },
].sort((a, b) => {
  const order = (page: Page) => page === 'dashboard' ? 0 : page === 'reversion' ? 1 : 2;
  return order(a.id) - order(b.id);
});

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <aside className="w-full shrink-0 bg-navy-900 text-white md:sticky md:top-0 md:h-screen md:w-64 md:flex md:flex-col">
      <div className="border-b border-navy-800 px-5 py-4 md:p-6">
        <img
          src="/getsitelogo.png"
          alt="Westhaven Marina"
          className="h-11 w-auto max-w-full rounded-md object-cover"
        />
        <p className="mt-1 text-xs text-navy-300 md:text-sm">Occupancy & Berth Dashboard</p>
      </div>
      
      <nav className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:block md:space-y-2 md:overflow-y-auto md:p-4">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              'flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:w-full md:px-4 md:py-3',
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
      
      <div className="hidden border-t border-navy-800 p-4 md:block">
        <div className="text-xs text-navy-400">
          <p>Internal Use Only</p>
          <p className="mt-1">© 2026 Westhaven Marina | Chris Ancheta</p>
        </div>
      </div>
    </aside>
  );
}
