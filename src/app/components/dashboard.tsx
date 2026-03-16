import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Clock } from 'lucide-react';
import { StatsOverview } from './stats-overview';
import { MaterialsInventory } from './materials-inventory';
import { LoanBalances } from './loan-balances';
import { MaterialMetrics } from './material-metrics';
import { authService } from '../services/authService';
import { OPCODashboard } from './opco-dashboard';

export function Dashboard() {
  const intl = useIntl();
  const [region, setRegion] = useState<string>('System Live');
  const [isOpco, setIsOpco] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      if (user.region) setRegion(user.region);
      
      // Determine if we should show the OPCO Command Center
      if (user.role === 'OPCO_USER' || user.role === 'DDM') {
        setIsOpco(true);
      }
    }
  }, []);

  if (isOpco) {
    // Both OPCO_USER and DDM use OPCODashboard.
    // OPCO_USER gets a region-switcher; DDM sees only their own region (locked).
    return <OPCODashboard />;
  }

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-[1600px] mx-auto min-h-screen bg-[#fafafa]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0f172a] tracking-tight truncate">
            {intl.formatMessage({ id: 'dashboard.region_overview' }, { region: region.toUpperCase() })}
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {intl.formatMessage({ id: 'dashboard.multi_depot_monitoring' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-black text-slate-600 uppercase tabular-nums">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div>
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4">
            {intl.formatMessage({ id: 'dashboard.core_metrics' })}
          </h3>
          <StatsOverview />
        </div>

        <div>
           <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4">
              {intl.formatMessage({ id: 'dashboard.stock_distribution' })}
           </h3>
           <MaterialMetrics />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MaterialsInventory />
          <LoanBalances />
        </div>
      </section>

    </div>
  );
}