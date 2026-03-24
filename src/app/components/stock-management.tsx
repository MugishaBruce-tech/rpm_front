import { Plus, Minus, Search, Edit, Trash2, Package, Layers, TrendingDown, AlertTriangle, X, WifiOff, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { apiRequest } from '../services/api';
import { authService } from '../services/authService';
import { getPendingByEndpoint, addSyncListener, processQueue } from '../services/syncQueue';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { PartnerSelector } from './ui/PartnerSelector';
import { usePartnerContext } from '../contexts/PartnerContext';
import { RegionSelector } from './ui/RegionSelector';
import { ProtectedResource } from './ui/ProtectedResource';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// @ts-ignore
import headerImageLogo from '../../assets/logo3.png';

interface StockItem {
  id?: number;
  product: string;
  sku: string;
  status: string;
  physical: number;
  location: string;
  materialKey?: number;
  partnerName?: string;
  fullDescription?: string;
}

const stockData = [
  // {
  //   id: 1,
  //   product: 'AMSTEL Brand 88 Crate 12+50cl BI',
  //   sku: '528.21 × 594m',
  //   status: 'WARNING',
  //   physical: 488,
  //   location: 'Mini Dépôt Chez Juste'
  // },
  // {
  //   id: 2,
  //   product: 'AMSTEL Brand 88 Crate 20+50cl BI',
  //   sku: '528.21 × 841m',
  //   status: 'CRITICAL',
  //   physical: 0,
  //   location: 'Mini Dépôt Chez Juste'
  // },
  // {
  //   id: 3,
  //   product: 'AMSTEL Buck RB Crate 24+33cl BI',
  //   sku: '528.21 × 594m',
  //   status: 'CRITICAL',
  //   physical: 0,
  //   location: 'Mini Dépôt Chez Juste'
  // },
  // {
  //   id: 4,
  //   product: 'AMSTEL Royale RB Crate 20+50cl BI',
  //   sku: '528.21 × 841m',
  //   status: 'WARNING',
  //   physical: 500,
  //   location: 'Mini Dépôt Chez Juste'
  // },
  // {
  //   id: 5,
  //   product: 'PRIMUS BB Crate 12+72cl BI',
  //   sku: '594.21 × 594m',
  //   status: 'CRITICAL',
  //   physical: 0,
  //   location: 'Mini Dépôt Chez Juste'
  // },
  // {
  //   id: 6,
  //   product: 'PRIMUS BB Crate 20+50cl BI',
  //   sku: '594.21 × 841m',
  //   status: 'CRITICAL',
  //   physical: 0,
  //   location: 'Mini Dépôt Chez Juste'
  // }
];

export function StockManagement() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'REMOVE'>('ADD');
  const [selectedSku, setSelectedSku] = useState<string | undefined>();
  const [selectedMaterialKey, setSelectedMaterialKey] = useState<number | undefined>();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync listener
  useEffect(() => {
    const removeListener = addSyncListener((status, syncedCount) => {
      if (status === 'starting') {
        setIsSyncing(true);
      }
      if (status === 'finished') {
        setIsSyncing(false);
        if (syncedCount && syncedCount > 0) {
          toast.success("Synchronisation terminée", {
            description: `${syncedCount} ajustement(s) de stock ont été envoyés.`
          });
        }
      }
      if (status === 'error') {
        setIsSyncing(false);
        toast.error("Échec de la synchronisation", {
          description: "Impossible d'envoyer les ajustements en attente."
        });
      }
    });
    return removeListener;
  }, []);

  // Proactively refresh when sync state changes back to false
  useEffect(() => {
    if (!isSyncing) {
      fetchStock();
    }
  }, [isSyncing]);

  const handleManualSync = () => {
    if (!navigator.onLine) {
      toast.error("Impossible de synchroniser : Vous êtes hors-ligne.");
      return;
    }
    processQueue(apiRequest);
  };

  const { selectedPartner } = usePartnerContext();

  useEffect(() => {
    let isMounted = true;

    const loadStock = async () => {
      if (!isMounted) return;
      await fetchStock();
    };

    loadStock();

    return () => {
      isMounted = false;
    };
  }, [selectedPartner?.id]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      // If a partner is explicitly selected from the dropdown, append their ID to filter the query
      const partnerQuery = selectedPartner ? `&partnerKey=${selectedPartner.id}` : '&global=true';
      const response = await apiRequest(`/inventory?limit=1000&offset=0${partnerQuery}`);
      console.log('Inventory response:', response);

      const inventoryData = response.result || [];

      // Transform API data to StockItem format
      const formattedStock: StockItem[] = inventoryData.map((item: any, index: number) => {
        // Determine status based on quantity
        let status = 'NORMAL';
        if (item.physicalQty === 0) {
          status = 'CRITICAL';
        } else if (item.physicalQty < 100) {
          status = 'WARNING';
        }

        return {
          id: index + 1,
          product: item.material_name2 || item.materialDescription || `Material ${item.materialKey}`,
          sku: item.sku || item.globalMaterialId || `MAT${item.materialKey}`,
          status: status,
          physical: item.physicalQty || 0,
          location: item.partnerName || 'Unknown',
          materialKey: item.materialKey,
          partnerName: item.partnerName,
          fullDescription: item.materialDescription
        };
      });

      // Merge pending adjustments from SyncQueue
      const pendingAdjustments = getPendingByEndpoint('/inventory/adjust');
      const updatedStock = formattedStock.map((item: StockItem) => {
        const pending = pendingAdjustments.find(r => {
          const body = typeof r.options.body === 'string' ? JSON.parse(r.options.body) : r.options.body;
          return body.adjustments?.some((a: any) => a.material_key === item.materialKey);
        });

        if (pending) {
          const body = typeof pending.options.body === 'string' ? JSON.parse(pending.options.body) : pending.options.body;
          const adj = body.adjustments.find((a: any) => a.material_key === item.materialKey);
          return {
            ...item,
            product: body._metadata?.productName || item.product,
            sku: body._metadata?.sku || item.sku,
            physical: adj.quantity, // Show the new intended quantity
            status: 'PENDING_SYNC'
          };
        }
        return item;
      });

      setStock(updatedStock);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtering is done in the render
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
  };

  // Filter stock based on search and status
  const filteredStock = stock.filter(item => {
    const searchMatch = !searchInput ||
      item.product.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchInput.toLowerCase()) ||
      item.location.toLowerCase().includes(searchInput.toLowerCase());

    const statusMatch = !statusFilter || item.status === statusFilter;

    return searchMatch && statusMatch;
  });

  // Pagination derived values
  const paginationTotal = filteredStock.length;
  const totalPages = Math.max(1, Math.ceil(paginationTotal / limit));

  const handleExportExcel = async () => {
    try {
      if (filteredStock.length === 0) {
        toast.error(intl.formatMessage({ id: 'export.no_data' }) || 'No data to export');
        return;
      }

      toast.promise(new Promise(async (resolve, reject) => {
        try {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Inventory');

          worksheet.mergeCells('A1:E4');
          const titleCell = worksheet.getCell('A1');
          titleCell.value = 'BRARUDI RPM TRACKER - GESTION DES STOCKS';
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008200' } };

          try {
            const logoRes = await fetch(headerImageLogo);
            const logoBlob = await logoRes.blob();
            const logoId = workbook.addImage({
              buffer: await logoBlob.arrayBuffer(),
              extension: 'png',
            });
            worksheet.addImage(logoId, { tl: { col: 4.2, row: 0.3 }, ext: { width: 90, height: 75 } });
          } catch (e) { console.error(e); }

          const metaRow = 6;
          worksheet.getCell(`A${metaRow}`).value = `Généré par: ${authService.getCurrentUser()?.name || 'Utilisateur'} - ${new Date().toLocaleString()}`;
          worksheet.getCell(`A${metaRow}`).font = { bold: true };

          const startRow = 8;
          const headerRow = worksheet.getRow(startRow);
          headerRow.values = ['NO', 'SKU', 'PRODUIT', 'STOCK PHYSIQUE', 'STATUT'];
          headerRow.height = 25;
          headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center' };
          });

          filteredStock.forEach((item, idx) => {
            const row = worksheet.getRow(startRow + 1 + idx);
            row.values = [
              idx + 1,
              item.sku,
              item.product,
              item.physical,
              item.status
            ];
            if (idx % 2 === 1) {
              row.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } });
            }
          });

          worksheet.getColumn(1).width = 5;
          worksheet.getColumn(2).width = 15;
          worksheet.getColumn(3).width = 50;
          worksheet.getColumn(4).width = 15;
          worksheet.getColumn(5).width = 15;

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blob, `rpm-stock-${new Date().toISOString().split('T')[0]}.xlsx`);
          resolve(true);
        } catch (e) { reject(e); }
      }), {
        loading: 'Génération Excel...',
        success: 'Succès !',
        error: 'Échec.'
      });
    } catch (e) { console.error(e); }
  };

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const startIndex = paginationTotal === 0 ? 0 : (page - 1) * limit;
  const endIndex = paginationTotal === 0 ? 0 : Math.min(startIndex + limit, paginationTotal);
  const paginatedStock = filteredStock.slice(startIndex, endIndex);

  // Keep page within bounds when filters or page size change
  useEffect(() => {
    const newTotalPages = Math.max(1, Math.ceil(filteredStock.length / limit));
    if (page > newTotalPages) {
      setPage(newTotalPages);
    }
  }, [filteredStock.length, limit]);

  const handleOpenModal = (mode: 'ADD' | 'REMOVE', sku?: string) => {
    setModalMode(mode);
    setSelectedSku(sku);
    const match = stock.find((s) => s.sku === sku);
    setSelectedMaterialKey(match?.materialKey);
    setQuantity('');
    setReason('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSku(undefined);
    setSelectedMaterialKey(undefined);
    setQuantity('');
    setReason('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!selectedMaterialKey) {
      toast.warning('Selection Required', {
        description: 'Please select a product'
      });
      return;
    }
    if (!qty || qty <= 0) {
      toast.warning('Invalid Quantity', {
        description: 'Please enter a valid quantity'
      });
      return;
    }

    try {
      const current = stock.find((s) => s.materialKey === selectedMaterialKey)?.physical || 0;
      const newAbsolute = modalMode === 'ADD' ? current + qty : Math.max(0, current - qty);
      const isAdding = modalMode === 'ADD';

      const confirm = await Swal.fire({
        title: isAdding ? intl.formatMessage({ id: 'inventory.confirm_add_title' }) : intl.formatMessage({ id: 'inventory.confirm_reduce_title' }),
        html: `
          <div style="text-align:left;font-size:14px;line-height:2">
            <b>${intl.formatMessage({ id: 'loans.distributor' })}:</b> ${selectedSku}<br/>
            <b>${intl.formatMessage({ id: 'loans.status_label' })}:</b> ${isAdding ? `+ Add ${qty} CRT` : `− Reduce ${qty} CRT`}<br/>
            <b>${intl.formatMessage({ id: 'inventory.on_hand_label' })}:</b> ${current} CRT<br/>
            <b>New:</b> ${newAbsolute} CRT
            ${reason ? `<br/><b>${intl.formatMessage({ id: 'loans.order_1_ext' })}:</b> ${reason}` : ''}
          </div>`,
        icon: isAdding ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonText: isAdding ? intl.formatMessage({ id: 'inventory.yes_add' }) : intl.formatMessage({ id: 'inventory.yes_reduce' }),
        cancelButtonText: intl.formatMessage({ id: 'sidebar.logout_cancel' }),
        confirmButtonColor: isAdding ? primaryColor : '#ef4444',
        cancelButtonColor: '#94a3b8',
        reverseButtons: true,
      });

      if (!confirm.isConfirmed) return;

      try {
        await apiRequest('/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({
            adjustments: [
              { material_key: selectedMaterialKey, quantity: newAbsolute }
            ],
            reason,
            CLIENT_ID: crypto.randomUUID(),
            _metadata: {
              productName: stock.find(s => s.materialKey === selectedMaterialKey)?.product || 'Produit',
              sku: selectedSku
            }
          })
        });

        toast.success(intl.formatMessage({ id: 'inventory.adjusted' }), {
          description: intl.formatMessage({ id: 'inventory.updated_success' })
        });
      } catch (err: any) {
        if (err.message.includes('offline')) {
          toast.warning(intl.formatMessage({ id: 'inventory.adjusted' }), {
            description: "Mode Hors-ligne : Ajustement enregistré localement. Il sera synchronisé dès le retour de la connexion."
          });
        } else {
          throw err;
        }
      }

      handleCloseModal();
      fetchStock();
    } catch (err: any) {
      console.error('Adjust stock failed:', err);
      toast.error(intl.formatMessage({ id: 'inventory.adj_failed' }), {
        description: err.message || 'Failed to adjust stock'
      });
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-full overflow-hidden space-y-6 min-w-0 min-h-[calc(100vh-120px)] flex flex-col">
      {/* Header Section */}
      {/* <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Stock Management
          </h1>
          <p className="text-slate-600 text-sm mt-1">View and manage inventory levels across all locations</p>
        </div>
      </div> */}



      {/* Stock Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle>{intl.formatMessage({ id: 'sidebar.regional_inventory' })}</CardTitle>
              {getPendingByEndpoint('/inventory').length > 0 && (
                <Button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                  className={`h-7 px-2 gap-1.5 text-[10px] font-bold ${isSyncing ? 'animate-pulse bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600'}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? intl.formatMessage({ id: 'common.syncing' }) : intl.formatMessage({ id: 'common.sync' })}
                </Button>
              )}
            </div>
            <div className="flex w-full sm:w-auto items-center gap-4">
              <RegionSelector />
              <PartnerSelector />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-green-700 hover:border-green-200 hover:bg-green-50 transition-all shadow-sm group"
                  title={intl.formatMessage({ id: 'dashboard.export_excel' })}
                >
                  <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <ProtectedResource action={['STOCK_ADJUST_GLOBAL', 'STOCK_EDIT_SELF']}>
                  <Button onClick={() => handleOpenModal('ADD')} className="flex-1 sm:flex-initial gap-2" style={{ backgroundColor: primaryColor }} title={intl.formatMessage({ id: 'inventory.add' })}>
                    <Plus className="w-4 h-4 ml-1" />
                    <span className="hidden sm:inline">{intl.formatMessage({ id: 'inventory.add' })}</span>
                  </Button>
                </ProtectedResource>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16 hidden md:block" />
                    <Skeleton className="h-4 w-20 hidden md:block" />
                    <Skeleton className="h-4 w-24 hidden md:block" />
                    <Skeleton className="h-4 w-20 hidden md:block" />
                  </div>
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4 border-b border-slate-100 last:border-0 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div className="flex gap-3 items-center">
                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">{intl.formatMessage({ id: 'dashboard.status' })}</span>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">{intl.formatMessage({ id: 'dashboard.quantity' })}</span>
                        <Skeleton className="h-6 w-12 rounded" />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">{intl.formatMessage({ id: 'inventory.location' })}</span>
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex gap-2 pt-2 md:pt-0 border-t md:border-0 border-slate-50">
                        <Skeleton className="h-9 flex-1 md:flex-none md:w-20 rounded-lg" />
                        <Skeleton className="h-9 flex-1 md:flex-none md:w-20 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">{intl.formatMessage({ id: 'inventory.no_items' })}</p>
              <p className="text-slate-500 text-sm">{intl.formatMessage({ id: 'inventory.try_filters' })}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'inventory.liquidity' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'dashboard.status' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'dashboard.quantity' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'inventory.location' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'inventory.actions' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStock.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 min-w-[200px]">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Layers className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 leading-tight">{item.product}</div>
                              {item.product !== item.fullDescription && (
                                <div className="text-[10px] text-slate-500 font-bold uppercase leading-none mt-1 tracking-tighter">{item.fullDescription}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.status === 'NORMAL' ? 'text-green-700' :
                            item.status === 'WARNING' ? 'text-amber-700' :
                              item.status === 'PENDING_SYNC' ? 'text-slate-500 animate-pulse' :
                                'text-red-700'
                            }`}>
                            {item.status === 'PENDING_SYNC' && <WifiOff className="w-3 h-3" />}
                            {item.status === 'PENDING_SYNC' ? intl.formatMessage({ id: 'common.syncing' }) : item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-medium">{item.physical}</td>
                        <td className="py-3 px-4 text-slate-600">{item.location}</td>
                        <td className="py-3 px-4">
                          <ProtectedResource action={['STOCK_ADJUST_GLOBAL', 'STOCK_EDIT_SELF']}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenModal('ADD', item.sku)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-sm transition-all duration-200"
                                title={intl.formatMessage({ id: 'inventory.confirm_add_title' })}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{intl.formatMessage({ id: 'inventory.add' })}</span>
                              </button>
                              <button
                                onClick={() => handleOpenModal('REMOVE', item.sku)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-sm transition-all duration-200"
                                title={intl.formatMessage({ id: 'inventory.confirm_reduce_title' })}
                              >
                                <Minus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{intl.formatMessage({ id: 'inventory.reduce' })}</span>
                              </button>
                            </div>
                          </ProtectedResource>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600 order-2 sm:order-1 text-center sm:text-left">
                  {intl.formatMessage({ id: 'inventory.showing_range' }, { start: startIndex + 1, end: endIndex, total: paginationTotal })}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
                  <div className="flex items-center gap-1 mr-2">
                    <Button onClick={() => setPage(1)} disabled={!hasPreviousPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.first' })}>≪</Button>
                    <Button onClick={() => setPage(page - 1)} disabled={!hasPreviousPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.prev' })}>‹</Button>
                    <div className="px-3 py-1 border border-slate-300 rounded-sm text-sm font-medium text-slate-700 bg-emerald-50">{page}</div>
                    <Button onClick={() => setPage(page + 1)} disabled={!hasNextPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.next' })}>›</Button>
                    <Button onClick={() => setPage(totalPages)} disabled={!hasNextPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.last' })}>≫</Button>
                  </div>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                    className="w-[100px] px-2 py-1.5 border border-slate-200 rounded-sm bg-white text-slate-900 text-xs"
                  >
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{intl.formatMessage({ id: 'inventory.per_page' }, { n })}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Adjust Stock Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center text-white rounded"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {modalMode === 'ADD' ? intl.formatMessage({ id: 'inventory.add_stock' }) : intl.formatMessage({ id: 'inventory.remove_stock' })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{selectedSku || intl.formatMessage({ id: 'loans.select_material_placeholder' })}</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!selectedSku && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900">{intl.formatMessage({ id: 'dashboard.material' })}</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm bg-white text-slate-900 text-sm"
                    value={selectedSku || ''}
                    onChange={(e) => {
                      const sku = e.target.value;
                      setSelectedSku(sku);
                      const match = stock.find((s) => s.sku === sku);
                      setSelectedMaterialKey(match?.materialKey);
                    }}
                  >
                    <option value="" disabled>{intl.formatMessage({ id: 'loans.select_material_placeholder' })}</option>
                    {stock.map((s) => (
                      <option key={s.materialKey || s.sku} value={s.sku}>
                        {s.sku} — {s.product}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">{intl.formatMessage({ id: 'dashboard.quantity' })}</label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-sm bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">{intl.formatMessage({ id: 'inventory.audit_reason_label' })}</label>
                <textarea
                  placeholder={intl.formatMessage({ id: 'inventory.audit_reason_placeholder' })}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 font-medium rounded hover:bg-slate-50 transition-colors"
                >
                  {intl.formatMessage({ id: 'sidebar.logout_cancel' })}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white font-medium rounded transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  {modalMode === 'ADD' ? intl.formatMessage({ id: 'inventory.add' }) : intl.formatMessage({ id: 'inventory.reduce' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* FOOTER */}
      <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mt-auto pt-10 opacity-40">
        <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
      </div>
    </div>
  );
}