import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Package,
  ArrowRightLeft,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  Database,
  BarChart3,
  Globe,
  MapPin
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { authService } from '../services/authService';
import { Card, CardContent } from './ui/card';
import { MaterialMetrics } from './material-metrics';
import { usePartnerContext } from '../contexts/PartnerContext';

export function OPCODashboard() {
  const intl = useIntl();
  const {
    availablePartners,
    setSelectedPartner,
    selectedPartner,
    selectedRegion,
    setSelectedRegion,
    availableRegions,
    isOPCO,
    isDDM,
    userRegion
  } = usePartnerContext();

  const [stats, setStats] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [excPage, setExcPage] = useState(1);
  const excLimit = 4;

  // What region label to show in headline
  const displayRegion = selectedRegion || userRegion || 'Region';

  useEffect(() => {
    const loadOpcoSpecifics = async () => {
      try {
        const statsKey = selectedPartner?.id;
        const activeRegion = selectedRegion || userRegion;

        // Fetch distribution and stats scoped by region or partner
        const [dashboardStats, allDistribution] = await Promise.all([
          dashboardService.getDashboardStats(statsKey || { region: activeRegion || undefined }).catch(err => {
            console.warn('Dashboard stats endpoint unavailable, using fallbacks', err);
            return { physicalStockUnits: 0, totalLoanItems: 0, inventoryTrend: 0 };
          }),
          dashboardService.getInventoryDistribution(
            statsKey ? { partnerKey: statsKey } : { region: activeRegion || undefined }
          )
        ]);

        // Filter distribution to match current partner/region scope
        const regionalPartnerIds = new Set(availablePartners.map(p => String(p.id)));
        const filteredDistribution = selectedPartner
          ? allDistribution.filter((d: any) => String(d.partnerKey || d.partner_key || d.id) === String(selectedPartner.id))
          : allDistribution.filter((d: any) => regionalPartnerIds.has(String(d.partnerKey || d.partner_key || d.id)));

        const mappedDistribution = filteredDistribution.map((d: any) => ({
          id: String(d.partnerKey || d.partner_key || d.id),
          name: (d.partnerName || d.name || 'Unknown').split(' ')[0],
          stock: Number(d.totalStock || d.stock || 0)
        }));

        setPartnerData(mappedDistribution);

        const totalRegionalStock = mappedDistribution.reduce((acc, curr) => acc + curr.stock, 0);

        setStats({
          physicalStockUnits: totalRegionalStock,
          totalLoanItems: dashboardStats?.totalLoanItems || 0,
          inventoryTrend: dashboardStats?.inventoryTrend || 0
        });

        // Generate operational alerts
        const alerts = mappedDistribution
          .filter((d: any) => d.stock < 100)
          .sort((a: any, b: any) => a.stock - b.stock)
          .map((d: any) => {
            const isZero = d.stock === 0;
            return {
              partnerId: d.id,
              name: d.name,
              type: isZero ? 'OUT_OF_STOCK' : 'LOW_STOCK',
              label: isZero ? intl.formatMessage({ id: 'opco.alert_out_of_stock' }) : intl.formatMessage({ id: 'opco.alert_low_stock' }),
              desc: isZero ? intl.formatMessage({ id: 'opco.desc_out_of_stock' }) : intl.formatMessage({ id: 'opco.desc_low_stock' }, { n: d.stock }),
              color: isZero ? 'text-red-600' : 'text-amber-600'
            };
          });

        setExceptions(alerts);
      } catch (err) {
        console.error('Failed to load OPCO data', err);
      }
    };

    loadOpcoSpecifics();
  }, [availablePartners, selectedPartner, selectedRegion]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans">
      {/* CORPORATE BAR */}
      <div className="bg-[#168c17] text-white px-6 py-4 flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-4">
          <Database className="w-5 h-5 opacity-80" />
          <div>
            <h1 className="text-lg font-bold leading-none uppercase tracking-tight">
              {isOPCO ? intl.formatMessage({ id: 'opco.national_command' }) : intl.formatMessage({ id: 'opco.regional_management' })}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-3 h-3 opacity-70" />
              <p className="text-[10px] font-medium opacity-70 uppercase tracking-widest">
                {intl.formatMessage({ id: 'opco.region_oversight' }, { region: displayRegion })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* REGION SWITCHER — only for OPCO_USER */}
          {isOPCO && availableRegions.length > 0 && (
            <div className="flex items-center gap-2 bg-white/10 rounded px-3 py-2">
              <Globe className="w-3.5 h-3.5 opacity-70" />
              <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider mr-1">
                {intl.formatMessage({ id: 'opco.region_label' })}
              </span>
              <select
                value={selectedRegion || ''}
                onChange={e => setSelectedRegion(e.target.value || null)}
                className="bg-transparent text-white text-[11px] font-black uppercase outline-none cursor-pointer"
              >
                {availableRegions.map(r => (
                  <option key={r} value={r} className="text-slate-900 font-bold">{r}</option>
                ))}
              </select>
            </div>
          )}
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-bold opacity-60 uppercase">
              {intl.formatMessage({ id: 'opco.data_sync' })}
            </p>
            <p className="text-xs font-bold">
              {intl.formatMessage({ id: 'opco.live' })} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* KPI BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-slate-200 rounded-sm overflow-hidden bg-white">
          {[
            { label: intl.formatMessage({ id: 'opco.physical_assets' }), value: stats?.physicalStockUnits, icon: Package, border: 'border-r' },
            { label: intl.formatMessage({ id: 'opco.regional_partners' }), value: availablePartners.length, icon: Users, border: 'border-r' },
            { label: intl.formatMessage({ id: 'opco.pending_transfers' }), value: stats?.totalLoanItems, icon: ArrowRightLeft, border: 'border-r' },
            { label: intl.formatMessage({ id: 'opco.inventory_trend' }), value: stats?.inventoryTrend > 0 ? `+${stats.inventoryTrend}` : stats?.inventoryTrend || '0', icon: TrendingUp, border: '' }
          ].map((kpi, idx) => (
            <div key={idx} className={`p-6 ${kpi.border} border-slate-200 flex flex-col justify-between hover:bg-slate-50 transition-colors`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <kpi.icon className="w-4 h-4 text-slate-300" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
                {kpi.value?.toLocaleString() || '0'}
              </h3>
            </div>
          ))}
        </div>

        {/* MATERIAL DISTRIBUTION MATRIX */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              {intl.formatMessage({ id: 'opco.distribution_matrix' })}
            </h4>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <MaterialMetrics />
        </div>

        {/* DATA ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* REGIONAL ALLOCATION CHART */}
          <Card className="lg:col-span-2 rounded-sm border-slate-200 shadow-none">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#168c17]" />
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {intl.formatMessage({ id: 'opco.allocation_by_partner' })}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                 {intl.formatMessage({ id: 'opco.crates_base_uom' })}
              </span>
            </div>
            <CardContent className="h-[300px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnerData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '0px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="stock" fill="#168c17" radius={[2, 2, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CRITICAL ALERTS LIST */}
          <Card className="rounded-sm border-slate-200 shadow-none flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-700 uppercase">
                {intl.formatMessage({ id: 'opco.operations_exceptions' })}
              </span>
            </div>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {exceptions.slice((excPage - 1) * excLimit, excPage * excLimit).map((exc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const originalPartner = availablePartners.find(p => p.id === exc.partnerId);
                      if (originalPartner) setSelectedPartner(originalPartner);
                    }}
                    className="px-5 py-4 hover:bg-emerald-50/50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-6 text-[10px] font-bold text-slate-300">0{((excPage - 1) * excLimit) + i + 1}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800 uppercase leading-none">{exc.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wide mt-1 ${exc.color}`}>{exc.label}</p>
                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">{exc.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-all ${exc.type === 'OUT_OF_STOCK' ? 'text-red-300 group-hover:text-red-600' : 'text-slate-300 group-hover:text-[#168c17]'}`} />
                  </div>
                ))}
                {exceptions.length > 0 && (
                  <div className="p-4 bg-white border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button disabled={excPage === 1} onClick={() => setExcPage(p => Math.max(1, p - 1))} className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {[...Array(Math.ceil(exceptions.length / excLimit))].map((_, i) => {
                          const pNum = i + 1;
                          const isActive = excPage === pNum;
                          return (
                            <button key={pNum} onClick={() => setExcPage(pNum)}
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold transition-all ${isActive ? 'bg-[#ec4899] text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>
                              {pNum}
                            </button>
                          );
                        })}
                      </div>
                      <button disabled={excPage * excLimit >= exceptions.length} onClick={() => setExcPage(p => p + 1)} className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button disabled={excPage * excLimit >= exceptions.length} onClick={() => setExcPage(Math.ceil(exceptions.length / excLimit))} className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors">
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      {excPage} {intl.formatMessage({ id: 'opco.pagination.of' })} {Math.ceil(exceptions.length / excLimit)}
                    </p>
                  </div>
                )}
                {exceptions.length === 0 && availablePartners.length > 0 && (
                  <div className="p-12 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {intl.formatMessage({ id: 'opco.health_optimal' })}
                    </p>
                    <p className="text-[9px] text-emerald-500 font-black uppercase">
                      {intl.formatMessage({ id: 'opco.partners_above_threshold' })}
                    </p>
                  </div>
                )}
                {availablePartners.length === 0 && (
                  <div className="p-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {intl.formatMessage({ id: 'opco.no_partners' })}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setSelectedPartner(null)}
                className="w-full py-2 bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-[#168c17] hover:text-[#168c17] transition-all"
              >
                {intl.formatMessage({ id: 'opco.reset_view' })}
              </button>
            </div>
          </Card>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1">
          <span>{intl.formatMessage({ id: 'opco.system_version' }, { type: isOPCO ? 'OPCO' : 'DDM' })}</span>
          <span>{intl.formatMessage({ id: 'opco.standard_protocol' })}</span>
        </div>
      </div>
    </div>
  );
}
