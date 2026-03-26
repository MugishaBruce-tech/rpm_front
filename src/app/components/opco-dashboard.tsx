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
  MapPin,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Treemap,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { authService } from '../services/authService';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
// @ts-ignore
import headerImageLogo from '../../assets/logo3.png';
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
  const [materialData, setMaterialData] = useState<any[]>([]);
  const [inactiveUsersData, setInactiveUsersData] = useState<any[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [excPage, setExcPage] = useState(1);
  const excLimit = 4;

  // What region label to show in headline
  const displayRegion = selectedRegion || userRegion || 'Region';

  useEffect(() => {
    let isMounted = true;
    const loadOpcoSpecifics = async () => {

      try {
        const statsKey = selectedPartner?.id;

        // Build API params: 
        // - If "All Regions" explicitly selected (selectedRegion is null AND isOPCO), use global=true
        // - If specific region selected, use that region
        // - For DDM, use their locked region
        const useGlobalView = isOPCO && selectedRegion === null;
        const activeRegion = selectedRegion || (isDDM ? userRegion : undefined);

        const statsParams = statsKey
          ? { partnerKey: statsKey }
          : useGlobalView
            ? { global: true }
            : { region: activeRegion || undefined };

        const distParams = statsKey
          ? { partnerKey: statsKey }
          : useGlobalView
            ? { global: true }
            : { region: activeRegion || undefined };

        // Fetch distribution, stats, materials, and inactive users scoped by region or globally
        const [dashboardStats, allDistribution, materials, inactiveUsersResult] = await Promise.all([
          dashboardService.getDashboardStats(statsParams).catch(err => {
            console.warn('Dashboard stats endpoint unavailable, using fallbacks', err);
            return { physicalStockUnits: 0, totalLoanItems: 0, inventoryTrend: 0 };
          }),
          dashboardService.getInventoryDistribution(distParams),
          dashboardService.getMaterialMetrics({
            partnerKey: statsKey,
            region: activeRegion || undefined,
            availablePartnerIds: availablePartners.map(p => p.id)
          }).catch(err => {
            console.warn('Failed to load material metrics:', err);
            return [];
          }),
          dashboardService.getInactiveUsers(activeRegion || undefined).catch(err => {
            console.warn('Failed to load inactive users:', err);
            return { users: [], total: 0, byRegion: {} };
          })
        ]);

        if (!isMounted) return;

        // Filter distribution to match current partner/region scope
        // When using global view or viewing a specific partner, use the API data directly
        // Otherwise filter by available partners in the current region
        let filteredDistribution = allDistribution;

        if (!useGlobalView && !selectedPartner) {
          // Regional view without specific partner - filter by availablePartners
          const regionalPartnerIds = new Set(availablePartners.map(p => String(p.id)));
          filteredDistribution = allDistribution.filter((d: any) =>
            regionalPartnerIds.has(String(d.partnerKey || d.partner_key || d.id))
          );
        } else if (selectedPartner) {
          // Specific partner selected
          filteredDistribution = allDistribution.filter((d: any) =>
            String(d.partnerKey || d.partner_key || d.id) === String(selectedPartner.id)
          );
        }
        // For global view, use all distribution data as returned from API

        const mappedDistribution = filteredDistribution.map((d: any) => ({
          id: String(d.partnerKey || d.partner_key || d.id),
          name: (d.partnerName || d.name || 'Unknown').split(' ')[0],
          stock: Number(d.totalStock || d.stock || 0)
        }));

        if (!isMounted) return;
        setPartnerData(mappedDistribution);

        // Map material metrics for the allocation chart (show top 10 by quantity + total)
        const topMaterials = (materials || [])
          .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
          .slice(0, 10)
          .map((m: any) => ({
            id: String(m.materialKey || m.id),
            name: (m.code || 'Unknown').split(' ').slice(0, 2).join(' ').substring(0, 15),
            stock: Number(m.value || 0)
          }));

        // Calculate total stock and add it to the chart data
        const totalMaterialStock = topMaterials.reduce((sum, m) => sum + m.stock, 0);
        const chartData = [
          ...topMaterials,
          { id: 'total', name: 'TOTAL', stock: totalMaterialStock }
        ];

        // Heineken green color palette for visual interest
        const heinekeenGreens = [
          '#0b5219', // Dark green
          '#0f6438', // Dark-medium green
          '#168c17', // Primary Heineken green
          '#20c997', // Medium green
          '#25b900', // Bright green
          '#37b24d', // Light-medium green
          '#40c057', // Light green
          '#51cf66', // Lighter green
          '#69db7c', // Very light green
          '#a6e3a1', // Pale green
          '#1b7a00'  // Extra dark for total
        ];

        if (!isMounted) return;
        setMaterialData(chartData);

        // Process inactive users data by region
        const inactiveByRegion = inactiveUsersResult?.byRegion || {};
        const inactiveChartData = Object.keys(inactiveByRegion)
          .map(region => ({
            name: region || 'Unknown',
            inactive: inactiveByRegion[region] || 0
          }))
          .sort((a: any, b: any) => b.inactive - a.inactive);

        if (!isMounted) return;
        setInactiveUsersData(inactiveChartData);
        setInactiveUsers(inactiveUsersResult?.users || []);

        const totalRegionalStock = mappedDistribution.reduce((acc, curr) => acc + curr.stock, 0);

        if (!isMounted) return;
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

        if (!isMounted) return;
        setExceptions(alerts);
      } catch (err) {
        console.error('Failed to load OPCO data', err);
      }
    };

    loadOpcoSpecifics();

    return () => {
      isMounted = false;
    };
  }, [selectedPartner?.id, selectedRegion, isOPCO, isDDM, userRegion, availablePartners.length, intl]);

  // Initialize and update chart with inactive users data using Recharts
  useEffect(() => {
    // Data is shown in the table below, chart is optional visualization
    // This effect can be used for any additional processing
  }, [inactiveUsers]);

  const handleExportExcel = async () => {
    try {
      if (materialData.length === 0) {
        toast.error(intl.formatMessage({ id: 'export.no_data' }) || 'No data to export');
        return;
      }

      toast.promise(new Promise(async (resolve, reject) => {
        try {
          const ExcelJS = (await import('exceljs')).default;
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet(intl.formatMessage({ id: 'dashboard.inventory' }) || 'Inventory');

          // 1. BRANDING HEADER
          worksheet.mergeCells('A1:F4');
          const titleCell = worksheet.getCell('A1');
          titleCell.value = `BRARUDI RPM TRACKER - RELEVÉ DE STOCK (${displayRegion.toUpperCase()})`;
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008200' } };

          try {
            const logoRes = await fetch(headerImageLogo);
            const logoBlob = await logoRes.blob();
            const logoBuffer = await logoBlob.arrayBuffer();
            const logoId = workbook.addImage({
              buffer: logoBuffer,
              extension: 'png',
            });
            worksheet.addImage(logoId, {
              tl: { col: 5.15, row: 0.3 },
              ext: { width: 90, height: 75 }
            });
          } catch (e) {
            console.error('Failed to load excel logo overlay:', e);
          }

          const metaRow = 6;
          worksheet.mergeCells(`A${metaRow}:C${metaRow}`);
          worksheet.getCell(`A${metaRow}`).value = `Généré par: ${authService.getCurrentUser()?.name || 'Utilisateur'}`;
          worksheet.getCell(`A${metaRow}`).font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };

          worksheet.mergeCells(`D${metaRow}:F${metaRow}`);
          worksheet.getCell(`D${metaRow}`).value = `Date: ${new Date().toLocaleString()}`;
          worksheet.getCell(`D${metaRow}`).alignment = { horizontal: 'right' };
          worksheet.getCell(`D${metaRow}`).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

          // 2. DYNAMIC CHART (Canvas Render)
          const canvas = document.createElement('canvas');
          canvas.width = 1000;
          canvas.height = 500;
          const ctx = canvas.getContext('2d')!;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const chartMaterials = materialData; // Use all data including TOTAL
          const totalItems = chartMaterials.length;
          const maxValue = Math.max(...chartMaterials.map(m => m.stock || 0), 10);
          const barWidth = (canvas.width - 200) / totalItems;
          const chartHeight = 350;
          const startX = 100;
          const startY = 400;

          chartMaterials.forEach((m, i) => {
            const h = ((m.stock || 0) / maxValue) * chartHeight;
            // Use special color for TOTAL
            ctx.fillStyle = m.id === 'total'
              ? '#1b7a00'
              : ['#0b5219', '#0f6438', '#168c17', '#20c997', '#25b900', '#37b24d', '#40c057', '#51cf66', '#69db7c', '#a6e3a1'][i % 10];

            ctx.fillRect(startX + i * barWidth + 20, startY - h, barWidth - 40, h);

            ctx.fillStyle = '#64748B';
            ctx.font = 'bold ' + (totalItems > 8 ? '12px' : '16px') + ' Arial';
            ctx.textAlign = 'center';
            const label = m.name.length > 15 ? m.name.substring(0, 12) + '...' : m.name;
            ctx.fillText(label, startX + i * barWidth + (barWidth / 2), startY + 40);

            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold ' + (totalItems > 8 ? '14px' : '18px') + ' Arial';
            ctx.fillText(String(m.stock || 0), startX + i * barWidth + (barWidth / 2), startY - h - 15);
          });

          const imageBase64 = canvas.toDataURL('image/png');
          const imageId = workbook.addImage({
            base64: imageBase64,
            extension: 'png',
          });

          worksheet.addImage(imageId, {
            tl: { col: 0.2, row: 7 },
            ext: { width: 700, height: 350 }
          });

          // 3. DATA TABLE
          const startRow = 28;
          const headerRow = worksheet.getRow(startRow);
          headerRow.values = ['NO', 'SKU', 'MATÉRIEL', 'STOCK ACTUEL', 'RÉGION', 'STATUT'];
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });

          chartMaterials.forEach((m, idx) => {
            const rowNumber = startRow + 1 + idx;
            const r = worksheet.getRow(rowNumber);
            r.values = [
              idx + 1,
              m.id,
              m.name,
              m.stock || 0,
              displayRegion,
              (m.stock || 0) > 10 ? 'OK' : 'STOCK BAS'
            ];
            r.height = 20;

            if (idx % 2 === 1) {
              r.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
              });
            }

            r.eachCell((cell, colId) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              if (colId === 4) cell.font = { bold: true };
              if (colId === 6) {
                cell.font = { bold: true, color: { argb: (m.stock || 0) > 10 ? 'FF008200' : 'FFD71921' } };
              }
            });
          });

          worksheet.getColumn(1).width = 5;
          worksheet.getColumn(2).width = 15;
          worksheet.getColumn(3).width = 50;
          worksheet.getColumn(4).width = 20;
          worksheet.getColumn(5).width = 15;
          worksheet.getColumn(6).width = 15;

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const now = new Date();
          const timestamp = `${now.toISOString().split('T')[0]}_${now.getHours()}-${now.getMinutes()}`;
          saveAs(blob, `inventaire-rpm-${displayRegion.toLowerCase()}-${timestamp}.xlsx`);

          resolve(true);
        } catch (err) {
          reject(err);
        }
      }), {
        loading: intl.formatMessage({ id: 'export.generating' }) || 'Génération du rapport Excel...',
        success: intl.formatMessage({ id: 'export.success' }) || 'Rapport exporté avec succès !',
        error: intl.formatMessage({ id: 'export.failed' }) || 'Échec de l\'exportation Excel.'
      });
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans">
      {/* CORPORATE BAR */}
      <div className="bg-[#168c17] text-white px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border-b border-black/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <Database className="w-5 h-5 opacity-80 shrink-0" />
          <div>
            <h1 className="text-sm sm:text-lg font-bold leading-none uppercase tracking-tight">
              {isOPCO ? intl.formatMessage({ id: 'opco.national_command' }) : intl.formatMessage({ id: 'opco.regional_management' })}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
              <MapPin className="w-3 h-3 opacity-70" />
              <p className="text-[9px] sm:text-[10px] font-medium opacity-70 uppercase tracking-widest">
                {intl.formatMessage({ id: 'opco.region_oversight' }, { region: displayRegion })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          {/* REGION SWITCHER — only for OPCO_USER */}
          {isOPCO && availableRegions.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 rounded px-2.5 py-1.5 sm:px-3 sm:py-2">
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70" />
              <span className="text-[8px] sm:text-[9px] font-bold opacity-60 uppercase tracking-wider mr-0.5 sm:mr-1">
                {intl.formatMessage({ id: 'opco.region_label' })}
              </span>
              <select
                value={selectedRegion || ''}
                onChange={e => setSelectedRegion(e.target.value || null)}
                className="bg-transparent text-white text-[10px] sm:text-[11px] font-black uppercase outline-none cursor-pointer pr-1"
              >
                <option value="" className="text-slate-900 font-bold">{intl.formatMessage({ id: 'opco.all_regions' })}</option>
                {availableRegions.map(r => (
                  <option key={r} value={r} className="text-slate-900 font-bold">{r}</option>
                ))}
              </select>
            </div>
          )}
          <div className="text-right">
            <p className="text-[8px] sm:text-[10px] font-bold opacity-60 uppercase">
              {intl.formatMessage({ id: 'opco.data_sync' })}
            </p>
            <p className="text-[10px] sm:text-xs font-bold">
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
                  {intl.formatMessage({ id: 'opco.sku_distribution' }, { defaultMessage: 'SKU Distribution' })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {intl.formatMessage({ id: 'opco.crates_base_uom' })}
                </span>
                <button
                  onClick={handleExportExcel}
                  className="p-1.5 bg-white border border-slate-200 rounded hover:border-[#168c17] hover:text-[#168c17] transition-all"
                  title={intl.formatMessage({ id: 'dashboard.export_excel' })}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <CardContent className="h-[300px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                  <Bar dataKey="stock" radius={[2, 2, 0, 0]} barSize={40}>
                    {materialData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.id === 'total'
                            ? '#1b7a00'  // Extra dark green for total
                            : ['#0b5219', '#0f6438', '#168c17', '#20c997', '#25b900', '#37b24d', '#40c057', '#51cf66', '#69db7c', '#a6e3a1'][index % 10]
                        }
                      />
                    ))}
                  </Bar>
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

        {/* INACTIVE USERS CHART - ECharts 3D Bar */}
        <div className="space-y-4">
          <Card className="rounded-sm border-slate-200 shadow-none">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {intl.formatMessage({ id: 'opco.inactive_24h' }, { defaultMessage: 'Users Inactive 24H+' })}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {inactiveUsers.length || 0} Users
              </span>
            </div>

            <CardContent className="p-4">
              {inactiveUsers && inactiveUsers.length > 0 ? (
                <div className="space-y-3">
                  {/* Compact Chart - Minimal Style */}
                  <div className="w-full rounded-sm border border-slate-150 bg-white p-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={inactiveUsers.slice(0, 8).map((user: any) => {
                          const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
                          const hoursSinceLogin = lastLogin
                            ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60))
                            : 999999;

                          return {
                            name: (user.business_partner_name || user.user_ad || 'Unknown').substring(0, 8),
                            hours: hoursSinceLogin > 998000 ? 750 : hoursSinceLogin,
                            fullName: user.business_partner_name || user.user_ad,
                            region: user.region,
                            actualHours: hoursSinceLogin
                          };
                        }).sort((a: any, b: any) => b.actualHours - a.actualHours)}
                        margin={{ top: 10, right: 15, left: -20, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="3 2" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          strokeWidth={0}
                          width={30}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(251, 146, 60, 0.05)' }}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '5px',
                            fontSize: '11px'
                          }}
                          formatter={(value: any, name: string, props: any) => {
                            const hours = props.payload.actualHours;
                            if (hours > 998000) return 'Never logged in';
                            if (hours > 720) return `${Math.round(hours / 24)}d`;
                            return `${hours}h`;
                          }}
                        />
                        <Bar
                          dataKey="hours"
                          radius={[4, 4, 0, 0]}
                          fill="#f59e0b"
                          isAnimationActive={true}
                        >
                          {inactiveUsers.slice(0, 8).map((user: any, idx: number) => {
                            const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
                            const hoursSinceLogin = lastLogin
                              ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60))
                              : 999999;

                            let color = '#10b981';
                            if (hoursSinceLogin > 998000) color = '#992b1f';
                            else if (hoursSinceLogin > 720) color = '#c2410c';
                            else if (hoursSinceLogin > 24) color = '#d97706';

                            return <Cell key={idx} fill={color} opacity={0.8} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Compact Details List */}
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {inactiveUsers.slice(0, 8).map((user: any, idx: number) => {
                      const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
                      const hoursSinceLogin = lastLogin
                        ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60))
                        : 999999;

                      let timeDisplay = 'Never logged in';
                      let bgColor = 'bg-red-50';
                      let textColor = 'text-red-600';

                      if (hoursSinceLogin < 998999) {
                        if (hoursSinceLogin > 720) {
                          timeDisplay = `${Math.round(hoursSinceLogin / 24)} days ago`;
                          bgColor = 'bg-orange-50';
                          textColor = 'text-orange-600';
                        } else if (hoursSinceLogin > 24) {
                          timeDisplay = `${hoursSinceLogin}h ago`;
                          bgColor = 'bg-amber-50';
                          textColor = 'text-amber-600';
                        } else {
                          timeDisplay = `${hoursSinceLogin}h (today)`;
                          bgColor = 'bg-emerald-50';
                          textColor = 'text-emerald-600';
                        }
                      }

                      return (
                        <div key={idx} className={`flex items-center justify-between py-2 px-3 ${bgColor} rounded border border-slate-150 text-[9px]`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-700 truncate text-[10px]">{user.business_partner_name || user.user_ad}</p>
                            <p className="text-slate-500 text-[8px]">{user.region || ''}</p>
                          </div>
                          <p className={`${textColor} font-bold ml-2 text-[9px] whitespace-nowrap`}>{timeDisplay}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                  <p className="text-[10px] font-bold uppercase">✓ All users active</p>
                </div>
              )}
            </CardContent>
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
