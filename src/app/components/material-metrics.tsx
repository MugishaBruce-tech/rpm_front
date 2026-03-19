import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Package } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { authService } from '../services/authService';
import { Skeleton } from './ui/skeleton';
import { usePartnerContext } from '../contexts/PartnerContext';

export function MaterialMetrics() {
  const intl = useIntl();
  const { selectedPartner, availablePartners, selectedRegion, isOPCO, userRegion } = usePartnerContext();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      // Always show loading when params change to avoid stale data
      setLoading(true);

      try {
        const isGlobal = isOPCO && selectedRegion === null;
        const params: any = {
          availablePartnerIds: availablePartners.map(p => p.id)
        };

        if (selectedPartner?.id) {
          params.partnerKey = selectedPartner.id;
        } else if (isGlobal) {
          params.global = true;
          // In global view, don't restrict by current partner IDs as they might still be loading
          delete params.availablePartnerIds;
        } else {
          params.region = selectedRegion || userRegion;
        }

        const data = await dashboardService.getMaterialMetrics(params);
        setMaterials(data || []);
      } catch (error) {
        console.error('Failed to load material metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [selectedPartner, availablePartners, selectedRegion, isOPCO, userRegion]);

  const minimumGridSpaces = 5;
  const placeholdersCount = Math.max(0, minimumGridSpaces - materials.length);

  return (
    <div className="bg-white border border-slate-200 rounded-sm">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          {intl.formatMessage({ id: 'opco.distribution_matrix' })}
        </h2>
        {loading && <span className="text-[8px] font-black text-[#168c17] uppercase tracking-tighter">{intl.formatMessage({ id: 'opco.live' })} {intl.formatMessage({ id: 'sidebar.main_dashboard' })}...</span>}
      </div>

      <div className="p-0">
        {loading && materials.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-slate-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-white p-6">
                <Skeleton className="h-3 w-12 opacity-20 mb-4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : materials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-slate-200 border-t border-slate-200">
            {materials.map((material) => (
              <div
                key={material.materialKey}
                className="bg-white px-6 py-6 border-b border-r border-slate-100 last:border-r-0"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                    {material.code?.split(' ')[0] || 'SKU'}
                  </span>
                  <div className="w-1 h-3 bg-[#168c17] opacity-20" />
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">
                    {material.value.toLocaleString()}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase leading-none truncate overflow-hidden whitespace-nowrap" title={material.code}>
                    {material.code}
                  </div>
                </div>
              </div>
            ))}
            {/* Fill empty slots with consistent grid style */}
            {[...Array(placeholdersCount)].map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-slate-50 border-r border-slate-100 last:border-r-0"></div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50">
            <Package className="w-6 h-6 text-slate-200 mb-2" />
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest text-center">
              {intl.formatMessage({ id: 'material_metrics.no_records' }, { defaultMessage: 'No inventory records found for this scope.' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}