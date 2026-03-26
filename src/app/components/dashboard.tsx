import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Clock, Package, ArrowRightLeft, TrendingUp, AlertCircle, ShieldCheck, Download, Activity, Star, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { StatsOverview } from './stats-overview';
import { MaterialsInventory } from './materials-inventory';
import { LoanBalances } from './loan-balances';
import { MaterialMetrics } from './material-metrics';
import { authService } from '../services/authService';
import { OPCODashboard } from './opco-dashboard';
import { MDDashboard } from './md-dashboard';
import { dashboardService } from '../services/dashboardService';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
// @ts-ignore
import headerImageLogo from '../../assets/logo3.png';

export function Dashboard() {
  const intl = useIntl();
  const [region, setRegion] = useState<string>('System Live');
  const [isOpco, setIsOpco] = useState(false);
  const [isMdAgent, setIsMdAgent] = useState(false);
  const [isSubD, setIsSubD] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [materialData, setMaterialData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      if (user.region) setRegion(user.region);

      // Determine dashboard type based on user role
      if (user.role === 'DDM') {
        setIsOpco(true);
      } else if (user.role === 'MD_AGENT' || user.role === 'OPCO_USER') {
        setIsMdAgent(true);
      } else if (user.role === 'SUB_D') {
        setIsSubD(true);
      }
    }
  }, []);

  // Load SUB_D specific data - only runs once when SUB_D is detected
  useEffect(() => {
    if (!isSubD) return;

    let isMounted = true;

    const loadSubDData = async () => {
      try {
        setLoading(true);
        const user = authService.getCurrentUser();
        if (!user?.id) return;

        const params = { partnerKey: user.id };

        const [dashboardStats, materials] = await Promise.all([
          dashboardService.getDashboardStats(params).catch(() => ({ physicalStockUnits: 0, totalLoanItems: 0 })),
          dashboardService.getMaterialMetrics(params).catch(() => [])
        ]);

        if (isMounted) {
          setStats(dashboardStats);
          setMaterialData(materials);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch SUB_D dashboard:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadSubDData();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [isSubD]);

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
          // Main Title Bar (Restored Green Header)
          worksheet.mergeCells('A1:F4');
          const titleCell = worksheet.getCell('A1');
          titleCell.value = 'BRARUDI RPM TRACKER - RELEVÉ DE STOCK'; // Perfect centering
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008200' } };

          // Add Logo Image as a small icon in the top-right header
          try {
            const logoRes = await fetch(headerImageLogo);
            const logoBlob = await logoRes.blob();
            const logoBuffer = await logoBlob.arrayBuffer();
            const logoId = workbook.addImage({
              buffer: logoBuffer,
              extension: 'png',
            });

            // Place logo overlay in the top-right area of the green header
            worksheet.addImage(logoId, {
              tl: { col: 5.15, row: 0.3 },
              ext: { width: 90, height: 75 } // Enlarged logo for better visibility
            });
          } catch (e) {
            console.error('Failed to load excel logo overlay:', e);
          }

          // Metadata Info below image
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

          // Draw a clean background and chart
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Simple Bar Chart
          const totalItems = materialData.length;
          const maxValue = Math.max(...materialData.map(m => m.value || 0), 10);
          const barWidth = (canvas.width - 200) / totalItems;
          const chartHeight = 350;
          const startX = 100;
          const startY = 400;

          materialData.forEach((m, i) => {
            const h = ((m.value || 0) / maxValue) * chartHeight;
            ctx.fillStyle = m.color || '#008200';
            ctx.fillRect(startX + i * barWidth + 20, startY - h, barWidth - 40, h);

            // Labels
            ctx.fillStyle = '#64748B';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            const label = m.code.length > 15 ? m.code.substring(0, 12) + '...' : m.code;
            ctx.fillText(label, startX + i * barWidth + (barWidth / 2), startY + 40);

            // Values
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(String(m.value || 0), startX + i * barWidth + (barWidth / 2), startY - h - 15);
          });

          // Embed image in excel
          const imageBase64 = canvas.toDataURL('image/png');
          const imageId = workbook.addImage({
            base64: imageBase64,
            extension: 'png',
          });

          // Place chart after metadata
          worksheet.addImage(imageId, {
            tl: { col: 0.2, row: 7 },
            ext: { width: 700, height: 350 }
          });

          // 3. DATA TABLE
          const startRow = 28; // Leave space for chart
          const headerRow = worksheet.getRow(startRow);
          headerRow.values = ['NO', 'SKU', 'MATÉRIEL', 'STOCK ACTUEL', 'UNITÉS', 'STATUT'];
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });

          // Add rows
          materialData.forEach((m, idx) => {
            const rowNumber = startRow + 1 + idx;
            const r = worksheet.getRow(rowNumber);
            r.values = [
              idx + 1,
              m.description,
              m.code,
              m.value || 0,
              'CRT',
              (m.value || 0) > 10 ? 'OK' : 'STOCK BAS'
            ];
            r.height = 20;

            // Alternate banding
            if (idx % 2 === 1) {
              r.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
              });
            }

            // Cell styling
            r.eachCell((cell, colId) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              if (colId === 4) cell.font = { bold: true };
              if (colId === 6) {
                cell.font = { bold: true, color: { argb: (m.value || 0) > 10 ? 'FF008200' : 'FFD71921' } };
              }
            });
          });

          // Columns Width settings
          worksheet.getColumn(1).width = 5;
          worksheet.getColumn(2).width = 15;
          worksheet.getColumn(3).width = 50;
          worksheet.getColumn(4).width = 20;
          worksheet.getColumn(5).width = 12;
          worksheet.getColumn(6).width = 15;

          // Write and Save
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const now = new Date();
          const timestamp = `${now.toISOString().split('T')[0]}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
          const userName = (authService.getCurrentUser()?.name || 'utilisateur').replace(/\s+/g, '_');
          saveAs(blob, `inventaire-rpm-${userName}-${timestamp}.xlsx`);

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

  if (isMdAgent) {
    return <MDDashboard />;
  }

  if (isOpco) {
    // DDM uses OPCODashboard
    return <OPCODashboard />;
  }

  if (isSubD) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-green-100 relative overflow-hidden">
        {/* Brand Watermark Overlay */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
          <Star className="w-[900px] h-[900px] text-red-600/5 rotate-12 blur-[1px] drop-shadow-[0_0_30px_rgba(220,38,38,0.08)]" />
        </div>

        <header className="bg-white border-b border-slate-200 z-[100] relative">

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
                <div className="w-16 h-16 border-4 border-green-600/10 border-t-green-600 rounded-full animate-spin" />
                <span className="text-sm font-bold tracking-widest text-[#008200] uppercase">
                  {intl.formatMessage({ id: 'dashboard.loading' })}
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
                    { label: intl.formatMessage({ id: 'dashboard.physical_stock_units' }), value: stats?.physicalStockUnits || 0, icon: Layers, color: '#008200', trend: '+2.1%', type: intl.formatMessage({ id: 'dashboard.sku_total' }) },
                    { label: intl.formatMessage({ id: 'dashboard.active_loans' }), value: stats?.totalLoanItems || 0, icon: ArrowRightLeft, color: '#D71921', trend: intl.formatMessage({ id: 'dashboard.optimal' }), type: intl.formatMessage({ id: 'dashboard.in_transit' }) },
                    { label: intl.formatMessage({ id: 'dashboard.total_sales_transactions' }), value: stats?.totalSalesTransactions || 0, icon: TrendingUp, color: '#008200', trend: '+5.3%', type: intl.formatMessage({ id: 'dashboard.transactions' }) },
                    { label: intl.formatMessage({ id: 'dashboard.system_health' }), value: '100%', icon: ShieldCheck, color: '#D71921', trend: intl.formatMessage({ id: 'dashboard.verified' }), type: intl.formatMessage({ id: 'dashboard.kpi_status' }) }
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.trend === 'Optimal' || kpi.trend === 'Verified' || kpi.trend.includes('optimal') || kpi.trend.includes('Verified') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {kpi.trend}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Inventory Overview */}
                  <div className="lg:col-span-3 p-8 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{intl.formatMessage({ id: 'dashboard.all_materials' })}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-tighter">
                          {intl.formatMessage({ id: 'dashboard.total_materials' })} {materialData.length}
                        </p>
                      </div>
                      <div
                        className="p-3 rounded-lg bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700 transition-all cursor-pointer"
                        onClick={handleExportExcel}
                      >
                        <Download className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Mobile: clean minimal list */}
                    <div className="flex flex-col sm:hidden divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {materialData.length > 0 ? [
                        ...materialData.map((material, idx) => (
                          <div key={idx} className="flex items-center px-4 py-3 gap-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: material.color || '#008200' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-slate-400 font-medium truncate">{material.description}</p>
                              <p className="text-sm font-bold text-slate-800 truncate">{material.code}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-black text-slate-900 tabular-nums">{(material.value ?? 0).toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{intl.formatMessage({ id: 'dashboard.units' })}</p>
                            </div>
                          </div>
                        )),
                        <div key="total" className="flex items-center px-4 py-3 gap-3 bg-slate-50">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-800 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-400 font-medium">BRARUDI S.A.</p>
                            <p className="text-sm font-bold text-slate-800">Grand Total</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-black text-slate-900 tabular-nums">
                              {materialData.reduce((acc, curr) => acc + (curr.value || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">UNITÉS</p>
                          </div>
                        </div>
                      ] : (
                        <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-medium">
                          {intl.formatMessage({ id: 'inventory.no_data' })}
                        </div>
                      )}
                    </div>

                    {/* Desktop / Tablet grid (sm and above) */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      {materialData.length > 0 ? (
                        materialData.map((material, idx) => (
                          <motion.div
                            key={idx}
                            initial="initial"
                            whileHover="hover"
                            variants={{
                              initial: { borderRadius: '8px' },
                              hover: { borderRadius: '24px', scale: 1.02, y: -2 }
                            }}
                            className="bg-white p-5 transition-colors flex flex-col justify-between h-36 group relative overflow-hidden"
                          >
                            <motion.div
                              variants={{ hover: { x: ['-100%', '200%'] } }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 w-1/2 h-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-10"
                            />
                            <motion.div
                              variants={{ hover: { opacity: 0.08, scale: 1 } }}
                              initial={{ opacity: 0, scale: 0.8 }}
                              className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full blur-[40px] pointer-events-none z-0"
                              style={{ backgroundColor: material.color || '#008200' }}
                            />
                            <div className="flex justify-between items-start relative z-20">
                              <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight tracking-tight line-clamp-1 max-w-[80%]">{material.description}</span>
                              <span className="w-2.5 h-2.5 rounded-sm shadow-sm flex-shrink-0" style={{ backgroundColor: material.color || '#008200' }} />
                            </div>
                            <div className="mt-2 relative z-20">
                              <motion.h4
                                variants={{ hover: { x: 2, color: material.color || '#008200' } }}
                                className="text-[11px] font-black text-slate-700 leading-tight uppercase tracking-tight line-clamp-2 transition-colors duration-300"
                              >
                                {material.code}
                              </motion.h4>
                            </div>
                            <div className="mt-auto pt-3 flex items-end justify-between border-t border-slate-50 relative z-20">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 leading-none tabular-nums tracking-tighter">{material.value ?? 0}</span>
                                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">{intl.formatMessage({ id: 'dashboard.units' })}</span>
                              </div>
                              <motion.div
                                variants={{ hover: { opacity: 1, x: 0, scale: 1 } }}
                                initial={{ opacity: 0, x: -10, scale: 0.8 }}
                                className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
                              </motion.div>
                            </div>
                          </motion.div>
                        )).concat(
                          <motion.div
                            key="total-card"
                            initial="initial"
                            whileHover="hover"
                            variants={{
                              initial: { borderRadius: '8px' },
                              hover: { borderRadius: '24px', scale: 1.02, y: -2 }
                            }}
                            className="bg-gradient-to-br from-[#008200] to-green-900 border-none p-5 flex flex-col justify-between h-36 shadow-xl shadow-green-900/20"
                          >
                            <div className="relative z-20">
                              <span className="text-[10px] font-black text-green-100 uppercase tracking-[0.15em] block">GRAND TOTAL</span>
                              <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">BRARUDI S.A.</h4>
                            </div>
                            <div className="mt-auto pt-3 flex items-center justify-between border-t border-green-500/30 relative z-20 gap-2">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white leading-none tabular-nums tracking-tighter drop-shadow-md">
                                  {materialData.reduce((acc, curr) => acc + (curr.value || 0), 0)}
                                </span>
                                <span className="text-[9px] font-extrabold text-green-100 uppercase tracking-tighter shrink-0">UNITÉS</span>
                              </div>
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-white/20 flex items-center justify-center border border-white/20">
                                <Layers className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </motion.div>
                        )
                      ) : (
                        <div className="col-span-full h-40 bg-white flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                          {intl.formatMessage({ id: 'inventory.no_data' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className="lg:col-span-1 p-8 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 shadow-xl shadow-green-900/10 text-white flex flex-col justify-between relative overflow-hidden">
                    <Star className="absolute -top-10 -right-10 w-40 h-40 text-white/10 rotate-12" />
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-5 h-5 text-green-200" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">{intl.formatMessage({ id: 'dashboard.system_health' })}</span>
                      </div>
                      <h4 className="text-2xl font-black leading-tight">{intl.formatMessage({ id: 'dashboard.inventory_up_to_date' })}</h4>
                      <p className="text-sm mt-4 text-green-50/90 leading-relaxed font-medium">{intl.formatMessage({ id: 'dashboard.all_stocks_synchronized' })}</p>
                    </div>

                    {/* Mini Data Flow Animation inside green card */}
                    <div className="flex-1 flex items-center justify-center relative z-10 my-2">
                      {(() => {
                        const mats = materialData.slice(0, 5);
                        const n = Math.max(mats.length, 1);
                        const W = 300, hubX = 150, hubY = 100;
                        const topY = 28;
                        const nodes = mats.map((m, i) => ({
                          x: n === 1 ? hubX : 20 + (i * (W - 40) / (n - 1)),
                          color: m.color || '#fff',
                          label: (m.code || '').substring(0, 3),
                        }));
                        return (
                          <svg viewBox={`0 0 ${W} 175`} className="w-full" style={{ maxHeight: '160px' }}>
                            <defs>
                              {nodes.map((nd, i) => (
                                <path key={i} id={`stp-${i}`}
                                  d={`M ${nd.x} ${topY + 20} Q ${(nd.x + hubX) / 2} ${(topY + hubY) / 2} ${hubX} ${hubY - 18}`}
                                />
                              ))}
                            </defs>
                            <style>{`@keyframes sDash { to { stroke-dashoffset: -16; } }`}</style>

                            {/* Lines */}
                            {nodes.map((nd, i) => (
                              <path key={i}
                                d={`M ${nd.x} ${topY + 20} Q ${(nd.x + hubX) / 2} ${(topY + hubY) / 2} ${hubX} ${hubY - 18}`}
                                stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeDasharray="4 4" fill="none"
                                style={{ animation: 'sDash 1.4s linear infinite', animationDelay: `${i * -0.28}s` }}
                              />
                            ))}
                            {/* Flowing dots along lines */}
                            {nodes.map((_, i) => (
                              <circle key={i} r="3" fill="white" opacity="0.85">
                                <animateMotion dur="1.6s" repeatCount="indefinite" begin={`${i * 0.32}s`}>
                                  <mpath href={`#stp-${i}`} />
                                </animateMotion>
                              </circle>
                            ))}

                            {/* Material nodes (top) */}
                            {nodes.map((nd, i) => (
                              <g key={i}>
                                <rect x={nd.x - 18} y={topY - 20} width="36" height="40" rx="8"
                                  fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                                <circle cx={nd.x} cy={topY - 4} r="7" fill={nd.color} opacity="0.85" />
                                <text x={nd.x} y={topY + 12} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="6.5" fontWeight="700">{nd.label}</text>
                              </g>
                            ))}

                            {/* Hub */}
                            <g>
                              <circle cx={hubX} cy={hubY} r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                                <animate attributeName="r" values="22;30;22" dur="2.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
                              </circle>
                              <rect x={hubX - 28} y={hubY - 17} width="56" height="34" rx="9"
                                fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                              <text x={hubX} y={hubY - 2} textAnchor="middle" fill="white" fontSize="9" fontWeight="900">HUB</text>
                              <text x={hubX} y={hubY + 10} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="6.5">RPM TRACKER</text>
                            </g>
                          </svg>
                        );
                      })()}
                    </div>

                    <div className="mt-4 relative z-10">
                      <button className="w-full py-3 bg-white text-green-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-50 transition-all shadow-lg">
                        {intl.formatMessage({ id: 'dashboard.view_detailed_report' })}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Charts */}
                <div>
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4">
                    {intl.formatMessage({ id: 'dashboard.stock_distribution' })}
                  </h3>
                  <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-sm">
                    {materialData.length > 0 ? (
                      (() => {
                        const totalValue = materialData.reduce((acc, curr) => acc + (curr.value || 0), 0);
                        const chartData = [...materialData, { code: 'TOTAL', value: totalValue, isTotal: true }];

                        return (
                          <>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="code" tick={{ fontSize: 12, fill: '#64748B' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isTotal ? '#0F172A' : (index % 2 === 0 ? '#008200' : '#D71921')} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            {/* Total shown at the downside of the chart */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end items-center">
                              <span className="text-[10px] font-black text-slate-400 mr-3 uppercase tracking-widest">TOTAL INVENTORY:</span>
                              <span className="text-2xl font-black text-slate-800 tabular-nums">
                                {totalValue} <span className="text-sm text-slate-400 ml-1">UNITÉS</span>
                              </span>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-400">
                        {intl.formatMessage({ id: 'inventory.no_data' })}
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </main>


        {/* Footer */}
        <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 py-6 opacity-40">
          <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
        </div>
      </div>
    );
  }

  // Default fallback
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

      {/* FOOTER */}
      <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mt-auto pt-10 opacity-40">
        <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
      </div>
    </div>
  );
}