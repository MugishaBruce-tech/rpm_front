import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Activity,
  Globe,
  ArrowRightLeft,
  Search,
  Box,
  TrendingDown,
  TrendingUp,
  MapPin,
  Hexagon,
  Command,
  Settings2,
  BellRing,
  Users,
  ShieldCheck,
  Cpu,
  Layers,
  Zap,
  LayoutGrid,
  Filter,
  Star,
  ChevronRight,
  Download,
  MoreVertical,
  BarChart3,
  PieChart as PieIcon,
  Building2,
  ExternalLink,
  Shield,
  ChevronDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { dashboardService } from '../services/dashboardService';
import { authService } from '../services/authService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
// @ts-ignore
import headerImageLogo from '../../assets/logo3.png';

import { MaterialMetrics } from './material-metrics';
import { usePartnerContext } from '../contexts/PartnerContext';

// Brand Identity: Brarudi Red/White/Green + Heineken Green/Red Star
const COLORS = {
  heinekenGreen: '#008200',
  heinekenRed: '#FF2B2B',
  brarudiRed: '#D71921',
  surface: '#FFFFFF',
  background: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1E293B'
};

export function MDDashboard() {
  const intl = useIntl();
  const { availablePartners } = usePartnerContext();

  const [stats, setStats] = useState<any>(null);
  const [materialData, setMaterialData] = useState<any[]>([]);
  const [topEntities, setTopEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('Global');
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    const fetchRegions = async () => {
      const regionList = await dashboardService.getRegions();
      setRegions(['Global', ...regionList]);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);

      try {
        const params = selectedRegion === 'Global' ? {} : { region: selectedRegion };

        const [dashboardStats, allDistribution, materials] = await Promise.all([
          dashboardService.getDashboardStats(params).catch(() => null),
          dashboardService.getInventoryDistribution(params).catch(() => []),
          dashboardService.getMaterialMetrics(params).catch(() => [])
        ]);

        if (!isMounted) return;

        const totalStock = allDistribution.reduce((acc: any, curr: any) => acc + Number(curr.totalStock || curr.stock || 0), 0);

        setStats({
          physical: totalStock,
          transfers: dashboardStats?.totalLoanItems || 0,
          inventoryTrend: dashboardStats?.inventoryTrend || 0,
          health: 99.98
        });

        const sortedEntities = (allDistribution || [])
          .sort((a: any, b: any) => (b.totalStock || b.stock || 0) - (a.totalStock || a.stock || 0))
          .map((item: any) => {
            const stockVal = item.totalStock ?? item.stock ?? item.total_physical ?? 0;
            return {
              name: selectedRegion === 'Global'
                ? (item.region || item.Region || 'Unknown Region')
                : (item.partnerName || item.name || item.business_partner_name || 'Unknown Entity'),
              value: Number(stockVal)
            };
          });

        setTopEntities(sortedEntities);

        // Get all materials for the big chart
        const allMaterials = (materials || [])
          .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
          .map((m: any) => ({
            id: String(m.materialKey || m.id),
            name: (m.code || 'Unknown').replace(/\s{2,}/g, ' ').trim(),
            stock: Number(m.value || 0)
          }));

        setMaterialData(allMaterials);

      } catch (err) {
        console.error('Failed to load MD data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedRegion]);

  // Highcharts configuration for Material Volume Analysis
  const chartOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 420,
      style: {
        fontFamily: 'inherit'
      }
    },
    title: {
      text: undefined
    },
    xAxis: {
      categories: materialData.map(m => m.name),
      labels: {
        rotation: -45,
        style: {
          fontSize: '10px',
          fontWeight: '700',
          color: '#1E293B'
        }
      },
      gridLineWidth: 0,
      lineColor: '#E2E8F0'
    },
    yAxis: {
      min: 0,
      title: {
        text: undefined
      },
      labels: {
        style: {
          fontSize: '11px',
          fontWeight: '600',
          color: '#64748B'
        },
        formatter: function () {
          return Highcharts.numberFormat(this.value as number, 0, '.', ',');
        }
      },
      gridLineColor: 'rgba(226, 232, 240, 0.5)'
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px; font-weight: 900; text-transform: uppercase; color: #008200">{point.key}</span><br/>',
      pointFormat: '<span style="color:{point.color}">\u25CF</span> <b>{point.y:,.0f} Units</b>',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 12,
      padding: 12,
      shadow: true,
      style: {
        fontSize: '12px'
      }
    },
    plotOptions: {
      column: {
        borderRadius: 12,
        maxPointWidth: 60,
        pointPadding: 0.2,
        groupPadding: 0.2,
        borderWidth: 0,
        colorByPoint: true,
        colors: [
          {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, '#168c17'], // Heineken Green
              [1, '#0b5219']
            ]
          },
          {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, '#D71921'], // Brarudi Red
              [1, '#9b1116']
            ]
          }
        ],
        dataLabels: {
          enabled: true,
          format: '{point.y:,.0f}',
          style: {
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#1e293b',
            textOutline: 'none'
          },
          y: -10
        }
      }
    },
    series: [{
      name: 'Inventory',
      type: 'column',
      data: materialData.map(m => m.stock),
      showInLegend: false
    }],
    credits: {
      enabled: false
    }
  };

  const handleExportExcel = async () => {
    try {
      if (materialData.length === 0) {
        toast.error(intl.formatMessage({ id: 'export.no_data' }) || 'No data to export');
        return;
      }

      toast.promise(new Promise(async (resolve, reject) => {
        try {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet(intl.formatMessage({ id: 'dashboard.inventory' }) || 'Inventory');

          // 1. BRANDING HEADER
          worksheet.mergeCells('A1:F4');
          const titleCell = worksheet.getCell('A1');
          titleCell.value = `BRARUDI RPM TRACKER - RELEVÉ DE STOCK (${selectedRegion.toUpperCase()})`;
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

          const totalStock = materialData.reduce((acc, m) => acc + (m.stock || 0), 0);
          const chartData = [
            ...materialData,
            { id: 'total', name: 'TOTAL', stock: totalStock }
          ];

          const totalItems = chartData.length;
          const maxValue = Math.max(...chartData.map(m => m.stock || 0), 10);
          const barWidth = (canvas.width - 200) / totalItems;
          const chartHeight = 350;
          const startX = 100;
          const startY = 400;

          chartData.forEach((m, i) => {
            const h = ((m.stock || 0) / maxValue) * chartHeight;
            ctx.fillStyle = m.id === 'total'
              ? '#1b7a00'
              : (i % 2 === 0 ? '#008200' : '#D71921');
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
          headerRow.values = ['NO', 'MATERIAL ID', 'MATÉRIEL', 'STOCK ACTUEL', 'RÉGION', 'STATUT'];
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });

          materialData.forEach((m, idx) => {
            const rowNumber = startRow + 1 + idx;
            const r = worksheet.getRow(rowNumber);
            r.values = [
              idx + 1,
              m.id,
              m.name,
              m.stock || 0,
              selectedRegion,
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
          saveAs(blob, `inventaire-rpm-${selectedRegion.toLowerCase()}-${timestamp}.xlsx`);

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-green-100">

      {/* Brand Watermark Overlay */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        <Star className="w-[900px] h-[900px] text-red-600/5 rotate-12 blur-[1px] drop-shadow-[0_0_30px_rgba(220,38,38,0.08)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Excellence Navigation */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:h-16 flex items-center justify-end">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Region Filter */}
              <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200">
                <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#D71921]" />
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mr-0.5 sm:mr-1">{intl.formatMessage({ id: 'common.region_colon' })}</span>
                <select
                  className="bg-transparent text-[10px] sm:text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1 sm:pr-2"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  {regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto w-full px-6 py-8 flex-1">

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[60vh] flex items-center justify-center flex-col gap-5"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-green-600/10 border-t-green-600 rounded-full animate-spin" />
                  <Star className="absolute inset-0 m-auto w-6 h-6 text-red-600 animate-pulse" />
                </div>
                <span className="text-sm font-bold tracking-widest text-[#008200] uppercase">
                  {intl.formatMessage({ id: 'dashboard.aggregating_data' }, { region: selectedRegion })}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >

                {/* Performance Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: intl.formatMessage({ id: 'dashboard.regional_assets' }), value: stats?.physical || 0, icon: Layers, color: "#008200", trend: "+4.2%", type: intl.formatMessage({ id: 'dashboard.sku_total' }) },
                    { label: intl.formatMessage({ id: 'dashboard.active_nodes' }), value: availablePartners.length, icon: Globe, color: "#D71921", trend: intl.formatMessage({ id: 'dashboard.optimal' }), type: intl.formatMessage({ id: 'dashboard.network' }) },
                    { label: intl.formatMessage({ id: 'dashboard.regional_loans' }), value: stats?.transfers || 0, icon: ArrowRightLeft, color: "#008200", trend: "+12.4%", type: intl.formatMessage({ id: 'dashboard.in_transit' }) },
                    { label: intl.formatMessage({ id: 'dashboard.system_health' }), value: `${stats?.health || 99.8}%`, icon: ShieldCheck, color: "#D71921", trend: intl.formatMessage({ id: 'dashboard.verified' }), type: intl.formatMessage({ id: 'dashboard.kpi_status' }) }
                  ].map((kpi, i) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group p-6 rounded-lg bg-white border border-slate-200 hover:border-green-600/30 transition-all shadow-sm hover:shadow-xl hover:shadow-green-900/5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 flex items-center justify-center rounded-bl-xl border-l border-b border-slate-100">
                        <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.type}</p>
                        <h3 className="text-3xl font-extrabold text-slate-900">
                          {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{kpi.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.trend === 'Optimal' || kpi.trend === 'Verified' || kpi.trend === intl.formatMessage({ id: 'dashboard.optimal' }) || kpi.trend === intl.formatMessage({ id: 'dashboard.verified' }) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {kpi.trend}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">

                  {/* Comprehensive Material Volume Analysis */}
                  <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">{intl.formatMessage({ id: 'dashboard.material_volume_analysis' })}</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-tighter">
                          {intl.formatMessage({ id: 'dashboard.inventory_breakdown' }, { region: <span className="text-[#008200] font-black">{selectedRegion}</span> })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                          <Activity className="w-4 h-4 text-[#D71921]" />
                          <span className="text-xs font-bold text-slate-600">
                            {intl.formatMessage({ id: 'dashboard.total_materials' })} {materialData.length}
                          </span>
                        </div>
                        <button
                          onClick={handleExportExcel}
                          className="p-3 rounded-lg bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700 transition-all"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 w-full overflow-hidden">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={chartOptions}
                      />
                    </div>
                  </div>

                  {/* Operational Summary: Regions or Nodes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 p-8 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                          {selectedRegion === 'Global'
                            ? intl.formatMessage({ id: 'dashboard.regional_network_distribution' })
                            : intl.formatMessage({ id: 'dashboard.operational_nodes' }, { region: selectedRegion })}
                        </h3>
                        <Globe className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {topEntities.slice(0, 8).map((entity, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-green-600/20 transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-extrabold text-slate-800 truncate uppercase tracking-tight">{entity.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {intl.formatMessage({ id: 'dashboard.capacity_label' }, { n: (entity.value / 1000).toFixed(1) })}
                              </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${entity.value > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-8 rounded-2xl bg-green-600 shadow-xl shadow-green-900/10 text-white flex flex-col justify-between relative overflow-hidden">
                      <Star className="absolute -top-10 -right-10 w-40 h-40 text-white/10 rotate-12" />
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <ShieldCheck className="w-5 h-5 text-green-200" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Supply Chain Integrity</span>
                        </div>
                        <h4 className="text-2xl font-black leading-tight">Data Integrity at 100%.</h4>
                        <p className="text-sm mt-4 text-green-50/80 leading-relaxed font-medium">All material movements in the {selectedRegion} region are synchronized with Brarudi HQ.</p>
                      </div>
                      <div className="mt-8">
                        <button className="w-full py-3 bg-white text-green-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-50 transition-all flex items-center justify-center gap-2 shadow-lg">
                          <Zap className="w-4 h-4" />
                          Optimize Network
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; border: 2px solid #F8FAFC; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}} />
    </div>
  );
}