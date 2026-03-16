import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Package, ArrowRightLeft, Clock, TrendingUp, Layers } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { authService } from '../services/authService';
import { Skeleton } from './ui/skeleton';
import { usePartnerContext } from '../contexts/PartnerContext';

export function StatsOverview() {
  const intl = useIntl();
  const { selectedPartner, selectedRegion } = usePartnerContext();
  const [stats, setStats] = useState<any[]>([
    {
      label: intl.formatMessage({ id: 'stats.physical_stock' }),
      value: '0',
      description: intl.formatMessage({ id: 'stats.physical_desc' }),
      icon: Layers,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: intl.formatMessage({ id: 'stats.loaned_out' }),
      value: '0',
      description: intl.formatMessage({ id: 'stats.loaned_desc' }),
      icon: ArrowRightLeft,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Only show top-level loading if we have no valid data yet
      const isInitial = stats.every(s => s.value === '0');
      if (isInitial) setLoading(true);

      try {
        const user = authService.getCurrentUser();
        const activeRegion = selectedRegion || user?.region;
        const dashboardStats = await dashboardService.getDashboardStats(selectedPartner?.id || { region: activeRegion || undefined }).catch(err => {
          console.warn('Dashboard stats unavailable:', err);
          return { physicalStockUnits: 0, totalLoanItems: 0 };
        });

        setStats([
          {
            label: intl.formatMessage({ id: 'stats.physical_stock' }),
            value: (dashboardStats?.physicalStockUnits || 0).toLocaleString(),
            description: intl.formatMessage({ id: 'stats.physical_desc' }),
            icon: Layers,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
          },
          {
            label: intl.formatMessage({ id: 'stats.loaned_out' }),
            value: (dashboardStats?.totalLoanItems || 0).toLocaleString(),
            description: intl.formatMessage({ id: 'stats.loaned_desc' }),
            icon: ArrowRightLeft,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
          }
        ]);
      } catch (error) {
        console.error('Unexpected error in stats overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedPartner, selectedRegion]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {loading ? (
        [...Array(2)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <Skeleton className="h-3 w-20 mb-4 opacity-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        ))
      ) : (
        stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-300 transition-colors shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[32px] font-black text-[#0f172a] tracking-tight leading-none">
                      {stat.value}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium pt-3 uppercase">
                    {stat.description}
                  </p>
                </div>

                <div className="p-2">
                  <Icon className="w-5 h-5 text-slate-400" strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
