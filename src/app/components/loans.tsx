import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { FileText, Plus, X, Package, AlertTriangle, CheckCircle, Bell, Check, Ban, Clock, XCircle, ThumbsUp, ThumbsDown, CheckCheck, SquareCheckBig, Layers, ArrowRightLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { apiRequest } from '../services/api';
import { authService } from '../services/authService';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { PartnerSelector } from './ui/PartnerSelector';
import { usePartnerContext } from '../contexts/PartnerContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoanItem {
  id: number | string;
  rawLoan: any;
  product: string;
  partner: string;
  quantity: number;
  status: string;
  date: string;
}

interface CartItem {
  material_key: string;
  materialLabel: string;
  quantity: number;
}

type TabKey = 'myRequests' | 'incoming' | 'approved' | 'denied';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const intl = useIntl();
  const map: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
    PENDING:   { bg: 'bg-amber-50 text-amber-700 border border-amber-200',  icon: <Clock     className="w-3 h-3" />, label: intl.formatMessage({ id: 'sidebar.pending_requests' })   },
    OPEN:      { bg: 'bg-blue-50  text-blue-700  border border-blue-200',   icon: <CheckCircle className="w-3 h-3" />, label: intl.formatMessage({ id: 'sidebar.approved_requests' })  },
    ACTIVE:    { bg: 'bg-blue-50  text-blue-700  border border-blue-200',   icon: <CheckCircle className="w-3 h-3" />, label: intl.formatMessage({ id: 'sidebar.approved_requests' })  },
    CANCELLED: { bg: 'bg-red-50   text-red-700   border border-red-200',    icon: <XCircle    className="w-3 h-3" />, label: intl.formatMessage({ id: 'sidebar.denied_requests' })    },
  };
  const cfg = map[status] ?? { bg: 'bg-green-50 text-green-700 border border-green-200', icon: <AlertTriangle className="w-3 h-3" />, label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Loans() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const currentUser = authService.getCurrentUser();
  const { selectedPartner } = usePartnerContext();
  const effectiveUserId = selectedPartner?.id || currentUser?.id;

  const [activeTab, setActiveTab]           = useState<TabKey>('myRequests');
  const [showModal, setShowModal]           = useState(false);
  const [transferType, setTransferType]     = useState<'internal' | 'external'>('internal');
  const [destinationType, setDestinationType] = useState<'distributor' | 'pdv'>('distributor');
  const [manualPartnerName, setManualPartnerName] = useState('');
  const [loadingLoans, setLoadingLoans]     = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | string | null>(null);

  // Raw loan buckets
  const [myRequests, setMyRequests]   = useState<LoanItem[]>([]);
  const [incomingPending, setIncomingPending] = useState<any[]>([]);
  const [approvedByMe, setApprovedByMe]       = useState<any[]>([]);
  const [deniedByMe, setDeniedByMe]           = useState<any[]>([]);

  // Transfer request form
  const [formData, setFormData] = useState({
    business_partner_key: '',
    material_key: '',
    bp_loan_qty_in_base_uom: '100'
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading]               = useState(false);
  const [materials, setMaterials]           = useState<Array<{ id: number; sku: string; description: string }>>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [partners, setPartners]             = useState<Array<{ id: number; name: string; type: string }>>([]);
  const [loadingPartners, setLoadingPartners]   = useState(false);

  // Pagination
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(10);

  // When effective user changes (impersonation), reset pagination and refetch
  useEffect(() => { 
    setPage(1);
    fetchLoans(); 
  }, [effectiveUserId]);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchLoans = async () => {
    setLoadingLoans(true);
    try {
      // If we have a selected partner, we're in impersonation/admin mode
      const partnerQuery = selectedPartner ? `&partnerId=${selectedPartner.id}` : '';
      const response = await apiRequest(`/loans/?limit=1000&offset=0${partnerQuery}`);
      const loanList: any[] = Array.isArray(response.result) ? response.result : [];

      const uid = String(effectiveUserId);
      const isIndivView = !!selectedPartner;

      // Helper to build a display LoanItem
      const toItem = (loan: any, index: number, perspective: 'outgoing' | 'incoming'): LoanItem => {
        const materialSku  = loan?.material?.global_material_id || loan?.material?.sku || '';
        const materialDesc = loan?.material?.material_description || '';
        const product      = materialSku ? `${materialSku}${materialDesc ? ' - ' + materialDesc : ''}` : 'Unknown Product';
        
        // Correctly identify the partner based on perspective
        // External transfers might have a manual name in external_partner_name
        const loan_partner_name = loan.external_partner_name || (perspective === 'outgoing'
          ? (loan?.lender?.business_partner_name || loan?.borrower?.business_partner_name)
          : (loan?.borrower?.business_partner_name || loan?.lender?.business_partner_name));

        const partner = loan_partner_name || (loan.is_external ? 'External Recipient' : 'Unknown Partner');
          
        const quantity     = parseFloat(loan.bp_loan_qty_in_base_uom || 0);
        const status       = String(loan.bp_loan_status || 'pending').toUpperCase();
        const date         = loan.created_at ? new Date(loan.created_at).toLocaleString() : new Date().toLocaleString();
        return { id: loan.business_partner_empties_loan_key || loan.id || index + 1, rawLoan: loan, product, partner, quantity, status, date };
      };

      // ① My Requests — loans initiated as borrower
      const myReqs = loanList
        .filter(l => !isIndivView || String(l.bp_loaned_to_business_partner_key) === uid)
        .map((l, i) => toItem(l, i, 'outgoing'));

      // ② Incoming Requests — others requested from me as lender (or any lender in Global View), still PENDING
      const incoming = loanList
        .filter(l => {
          const isMatch = !isIndivView || String(l.business_partner_key) === uid;
          return l.bp_loan_status === 'pending' && isMatch;
        })
        .map((l, i) => toItem(l, i, 'incoming'));

      // ③ Approved — OPEN/ACTIVE
      const approved = loanList
        .filter(l => {
          const isMatch = !isIndivView || String(l.business_partner_key) === uid;
          return (l.bp_loan_status === 'open' || l.bp_loan_status === 'active') && isMatch;
        })
        .map((l, i) => toItem(l, i, 'incoming'));

      // ④ Denied — CANCELLED
      const denied = loanList
        .filter(l => {
          const isMatch = !isIndivView || String(l.business_partner_key) === uid;
          return l.bp_loan_status === 'cancelled' && isMatch;
        })
        .map((l, i) => toItem(l, i, 'incoming'));

      setMyRequests(myReqs);
      setIncomingPending(incoming);
      setApprovedByMe(approved);
      setDeniedByMe(denied);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
    } finally {
      setLoadingLoans(false);
    }
  };

  // ── Status update (approve / deny) ─────────────────────────────────────────
  const handleUpdateStatus = async (loanId: number | string, status: string) => {
    const isApproving = status === 'open';

    const confirm = await Swal.fire({
      title: isApproving ? intl.formatMessage({ id: 'loans.approve_loan' }) : intl.formatMessage({ id: 'loans.deny_loan' }),
      text: isApproving
        ? intl.formatMessage({ id: 'loans.approve_desc' })
        : intl.formatMessage({ id: 'loans.deny_desc' }),
      icon: isApproving ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: isApproving ? intl.formatMessage({ id: 'loans.yes_approve' }) : intl.formatMessage({ id: 'loans.yes_deny' }),
      cancelButtonText: intl.formatMessage({ id: 'sidebar.logout_cancel' }),
      confirmButtonColor: isApproving ? primaryColor : '#ef4444',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setUpdatingStatus(loanId);
    try {
      await apiRequest(`/loans/${loanId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ STATUS: status })
      });
      toast.success(intl.formatMessage({ id: 'loans.updated' }), { description: isApproving ? intl.formatMessage({ id: 'loans.updated_approved' }) : intl.formatMessage({ id: 'loans.updated_denied' }) });
      fetchLoans();
    } catch (error: any) {
      toast.error(intl.formatMessage({ id: 'inventory.adj_failed' }), { description: error.message || 'Failed to update loan status' });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const handleOpenModal = (type: 'internal' | 'external' = 'internal') => { 
    setTransferType(type);
    setDestinationType('distributor');
    setManualPartnerName('');
    setShowModal(true); 
    fetchMaterials(); 
    fetchPartners(); 
  };

  const handleCloseModal = () => { 
    setShowModal(false); 
    setFormData({ business_partner_key: '', material_key: '', bp_loan_qty_in_base_uom: '100' }); 
    setCartItems([]);
    setManualPartnerName('');
  };

  const addToCart = () => {
    if (!formData.material_key || !formData.bp_loan_qty_in_base_uom) {
      toast.warning(intl.formatMessage({ id: 'loans.missing_info' }), { description: intl.formatMessage({ id: 'loans.select_mat_qty' }) });
      return;
    }

    const mat = materials.find(m => String(m.id) === formData.material_key);
    const label = mat ? `${mat.sku}${mat.description ? ' - ' + mat.description : ''}` : 'Unknown';
    
    setCartItems(prev => [
      ...prev,
      { material_key: formData.material_key, materialLabel: label, quantity: parseInt(formData.bp_loan_qty_in_base_uom) }
    ]);
    
    setFormData(prev => ({ ...prev, material_key: '', bp_loan_qty_in_base_uom: '100' }));
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const fetchPartners = async () => {
    setLoadingPartners(true);
    try {
      const res = await apiRequest('/user/list?limit=1000&offset=0');
      let list: any[] = res?.result?.users || res?.result?.rows || (Array.isArray(res?.result) ? res.result : []);
      setPartners(
        list
          .filter(p => p && String(p.business_partner_key || p.id) !== String(currentUser?.id))
          .map(p => ({ 
            id: p.business_partner_key || p.id, 
            name: p.business_partner_name || p.name || 'Unknown',
            type: p.customer_channel || p.business_partner_type || '' 
          }))
          .filter(p => p.id)
      );
    } catch { setPartners([]); } finally { setLoadingPartners(false); }
  };

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const res = await apiRequest('/inventory/materials?limit=1000&offset=0');
      const list: any[] = Array.isArray(res?.result) ? res.result : [];
      setMaterials(list.filter(m => m).map(m => ({ id: m.material_key, sku: m.global_material_id || `MAT${m.material_key}`, description: m.material_description || '' })).filter(m => m.id));
    } catch { } finally { setLoadingMaterials(false); }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      if (formData.material_key && formData.bp_loan_qty_in_base_uom) {
        addToCart();
        return;
      }
      Swal.fire({ title: intl.formatMessage({ id: 'loans.empty_request' }), text: intl.formatMessage({ id: 'loans.add_at_least_one_item' }), icon: 'warning', confirmButtonColor: primaryColor });
      return;
    }

    if (transferType === 'internal') {
      if (!formData.business_partner_key) {
        Swal.fire({ title: intl.formatMessage({ id: 'loans.missing_partner' }), text: intl.formatMessage({ id: 'loans.select_partner_req' }), icon: 'warning', confirmButtonColor: primaryColor });
        return;
      }
    } else {
      if (destinationType === 'distributor' && !formData.business_partner_key) {
        Swal.fire({ title: intl.formatMessage({ id: 'loans.missing_distributor' }), text: intl.formatMessage({ id: 'loans.select_distributor' }), icon: 'warning', confirmButtonColor: primaryColor });
        return;
      }
      if (destinationType === 'pdv' && !manualPartnerName.trim()) {
        Swal.fire({ title: intl.formatMessage({ id: 'loans.missing_name' }), text: intl.formatMessage({ id: 'loans.enter_pdv_name' }), icon: 'warning', confirmButtonColor: primaryColor });
        return;
      }
    }

    const selectedPartnerName = transferType === 'external' && destinationType === 'pdv' 
      ? manualPartnerName 
      : partners.find(p => String(p.id) === formData.business_partner_key)?.name || 'selected partner';

    const confirm = await Swal.fire({
      title: intl.formatMessage({ id: 'loans.submit_list_title' }),
      html: `
        <div class="text-left space-y-2 max-h-60 overflow-y-auto mt-4 p-2 border border-slate-100 rounded bg-slate-50">
          <p class="font-bold text-slate-800 mb-2">${intl.formatMessage({ id: 'loans.requesting_from' }, { partner: selectedPartnerName })}</p>
          <ul class="text-xs space-y-1 list-disc pl-4">
            ${cartItems.map(item => `<li><strong>${item.quantity} CRT</strong> of ${item.materialLabel}</li>`).join('')}
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: intl.formatMessage({ id: 'loans.yes_submit_all' }),
      cancelButtonText: intl.formatMessage({ id: 'sidebar.logout_cancel' }),
      confirmButtonColor: primaryColor,
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    let successCount = 0;
    try {
      for (const item of cartItems) {
        const payload: any = { 
          material_key: parseInt(item.material_key), 
          bp_loan_qty_in_base_uom: item.quantity,
          is_external: transferType === 'external'
        };

        if (transferType === 'external' && destinationType === 'pdv') {
          payload.external_partner_name = manualPartnerName;
        } else {
          payload.business_partner_key = parseInt(formData.business_partner_key);
        }

        await apiRequest('/loans', { 
          method: 'POST', 
          body: JSON.stringify(payload) 
        });
        successCount++;
      }
      handleCloseModal();
      toast.success(intl.formatMessage({ id: 'loans.updated' }), { description: intl.formatMessage({ id: 'loans.submitted_success' }, { n: successCount }) });
      fetchLoans();
    } catch (err: any) {
      toast.warning(intl.formatMessage({ id: 'loans.partial_success' }, { success: successCount, total: cartItems.length, err: err.message }));
    } finally { setLoading(false); }
  };

  // ── Tab config ──────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number; badgeColor: string }[] = [
    { key: 'myRequests', label: intl.formatMessage({ id: 'loans.my_requests' }),        icon: <FileText   className="w-4 h-4" />, count: myRequests.length,       badgeColor: 'bg-slate-500'  },
    { key: 'incoming',   label: intl.formatMessage({ id: 'loans.incoming_requests' }),  icon: <Bell       className="w-4 h-4" />, count: incomingPending.length,  badgeColor: 'bg-red-500'    }, 
    { key: 'approved',   label: intl.formatMessage({ id: 'sidebar.approved_requests' }),           icon: <CheckCheck className="w-4 h-4" />, count: approvedByMe.length,     badgeColor: 'bg-blue-500'   },
    { key: 'denied',     label: intl.formatMessage({ id: 'sidebar.denied_requests' }),             icon: <XCircle className="w-4 h-4" />, count: deniedByMe.length,       badgeColor: 'bg-red-400'    },
  ];

  // ── Pagination helper ───────────────────────────────────────────────────────
  const paginate = (items: any[]) => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage   = Math.min(page, totalPages);
    const start      = total === 0 ? 0 : (safePage - 1) * limit;
    const end        = Math.min(start + limit, total);
    return { items: items.slice(start, end), total, totalPages, safePage, start, end };
  };

  // ── Skeleton loader ─────────────────────────────────────────────────────────
  const TableSkeleton = () => (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center p-4 border-b border-slate-100">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
          <Skeleton className="h-4 w-16" /><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );

  // ── Generic Loan Table Component ──────────────────────────────────────────────
  const LoanTable = ({ items, emptyMsg, sub, type }: { items: LoanItem[]; emptyMsg: string; sub?: string; type: TabKey }) => {
    const pg = paginate(items);
    if (pg.total === 0) return <EmptyState message={emptyMsg} sub={sub || ""} />;

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'inventory.liquidity' })}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  {!selectedPartner ? intl.formatMessage({ id: 'loans.lender_borrower' }) : (type === 'myRequests' ? intl.formatMessage({ id: 'loans.requested_from' }) : intl.formatMessage({ id: 'loans.requested_by' }))}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'loans.wait_time' }).replace(':', '')}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'loans.status_label' }).replace(':', '')}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'loans.date' })}</th>
                {type === 'incoming' && <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'loans.clear_all' }).split(' ')[0] || 'Actions'}</th>}
              </tr>
            </thead>
            <tbody>
              {pg.items.map((item: LoanItem) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 min-w-[250px]">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 rounded">
                        <Layers className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">{item.product}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{item.partner}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.quantity}</td>
                  <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="text-[11px] uppercase text-slate-400 mb-0.5">{intl.formatMessage({ id: 'loans.requested' })}</div>
                    {item.date}
                  </td>
                  {type === 'incoming' && (
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={updatingStatus !== null}
                          onClick={() => handleUpdateStatus(item.id, 'cancelled')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-sm transition-colors"
                          title={intl.formatMessage({ id: 'sidebar.logout_cancel' })}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{intl.formatMessage({ id: 'sidebar.logout_cancel' })}</span>
                        </button>
                        <button
                          disabled={updatingStatus !== null}
                          onClick={() => handleUpdateStatus(item.id, 'open')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white rounded-sm shadow-sm transition-all hover:brightness-110"
                          style={{ backgroundColor: primaryColor }}
                          title={intl.formatMessage({ id: 'sidebar.approved_requests' })}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{intl.formatMessage({ id: 'sidebar.approved_requests' })}</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar pg={pg} />
      </>
    );
  };

  // ── Shared sub-components ───────────────────────────────────────────────────
  const EmptyState = ({ message, sub }: { message: string; sub: string }) => (
    <div className="flex flex-col items-center justify-center py-14">
      <FileText className="w-12 h-12 text-slate-200 mb-4" />
      <p className="text-slate-600 font-medium">{message}</p>
      {sub && <p className="text-slate-400 text-sm mt-1">{sub}</p>}
    </div>
  );

  const PaginationBar = ({ pg }: { pg: ReturnType<typeof paginate> }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
      <div className="text-sm text-slate-600 order-2 sm:order-1">{intl.formatMessage({ id: 'inventory.showing_range' }, { start: pg.total === 0 ? 0 : pg.start + 1, end: pg.end, total: pg.total })}</div>
      <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
        <div className="flex items-center gap-1 mr-2">
          <Button onClick={() => setPage(1)}              disabled={pg.safePage <= 1}             variant="outline" size="sm">{intl.formatMessage({ id: 'inventory.first' })}</Button>
          <Button onClick={() => setPage(pg.safePage - 1)} disabled={pg.safePage <= 1}             variant="outline" size="sm">{intl.formatMessage({ id: 'inventory.prev' })}</Button>
          <Button onClick={() => setPage(pg.safePage + 1)} disabled={pg.safePage >= pg.totalPages} variant="outline" size="sm">{intl.formatMessage({ id: 'inventory.next' })}</Button>
          <Button onClick={() => setPage(pg.totalPages)}  disabled={pg.safePage >= pg.totalPages} variant="outline" size="sm">{intl.formatMessage({ id: 'inventory.last' })}</Button>
        </div>
        <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className="w-[100px] px-2 py-1.5 border border-slate-200 rounded-sm bg-white text-slate-900 text-xs">
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{intl.formatMessage({ id: 'inventory.per_page' }, { n })}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 w-full max-w-full overflow-hidden space-y-6 min-w-0">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{intl.formatMessage({ id: 'loans.transfer_requests' })}</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <PartnerSelector />
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => handleOpenModal('external')} variant="outline" className="gap-2 border-dashed border-2" style={{ color: primaryColor, borderColor: primaryColor }} title={intl.formatMessage({ id: 'loans.external_request' })}>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{intl.formatMessage({ id: 'loans.external_request' })}</span>
                </Button>
                <Button onClick={() => handleOpenModal('internal')} className="gap-2" style={{ backgroundColor: primaryColor }} title={intl.formatMessage({ id: 'loans.loan_request' })}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{intl.formatMessage({ id: 'loans.loan_request' })}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex overflow-x-auto pb-1 gap-1 border-b border-slate-200 hide-scrollbar scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-current text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                style={activeTab === tab.key ? { borderColor: primaryColor, color: primaryColor } : {}}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className={`${tab.badgeColor} text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {loadingLoans ? (
            <TableSkeleton />
          ) : (
            <>
              {activeTab === 'myRequests' && <LoanTable items={myRequests} emptyMsg={intl.formatMessage({ id: selectedPartner ? 'loans.my_req_empty_user' : 'loans.my_req_empty_sys' })} sub={selectedPartner ? intl.formatMessage({ id: 'loans.my_req_get_started' }) : ""} type="myRequests" />}
              {activeTab === 'incoming'   && <LoanTable items={incomingPending} emptyMsg={intl.formatMessage({ id: selectedPartner ? 'loans.incoming_empty_user' : 'loans.incoming_empty_sys' })} sub={selectedPartner ? intl.formatMessage({ id: 'loans.incoming_no_approval' }) : ""} type="incoming" />}
              {activeTab === 'approved'   && <LoanTable items={approvedByMe}   emptyMsg={intl.formatMessage({ id: 'loans.approved_empty' })} type="approved" />}
              {activeTab === 'denied'     && <LoanTable items={deniedByMe}     emptyMsg={intl.formatMessage({ id: 'loans.denied_empty' })}   type="denied"   />}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Request Transfer Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center text-white rounded" style={{ backgroundColor: primaryColor }}>
                  {transferType === 'external' ? <ArrowRightLeft className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {transferType === 'external' ? intl.formatMessage({ id: 'loans.external_request' }) : intl.formatMessage({ id: 'loans.loan_request' })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                    {transferType === 'external' ? intl.formatMessage({ id: 'loans.ext_req_desc' }) : intl.formatMessage({ id: 'loans.int_loan_desc' })}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* External Type Selection */}
              {transferType === 'external' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <label className="text-sm font-semibold text-slate-900 block">{intl.formatMessage({ id: 'loans.ext_source_type' })}</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="destinationType" 
                        value="distributor" 
                        checked={destinationType === 'distributor'} 
                        onChange={() => { setDestinationType('distributor'); setFormData(p => ({ ...p, business_partner_key: '' })); }}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`text-sm ${destinationType === 'distributor' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{intl.formatMessage({ id: 'loans.distributor' })}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="destinationType" 
                        value="pdv" 
                        checked={destinationType === 'pdv'} 
                        onChange={() => { setDestinationType('pdv'); setManualPartnerName(''); }}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`text-sm ${destinationType === 'pdv' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{intl.formatMessage({ id: 'loans.pdv' })}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Partner Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">
                  {transferType === 'internal' ? intl.formatMessage({ id: 'loans.order_1_partner' }) : intl.formatMessage({ id: 'loans.order_1_ext' })}
                </label>
                
                {transferType === 'external' && destinationType === 'pdv' ? (
                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder={intl.formatMessage({ id: 'loans.enter_pdv_placeholder' })}
                      value={manualPartnerName}
                      onChange={(e) => setManualPartnerName(e.target.value)}
                      disabled={cartItems.length > 0}
                      className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-400 disabled:bg-slate-50"
                    />
                    <p className="text-[10px] text-slate-400 italic">{intl.formatMessage({ id: 'loans.enter_pdv_manual' })}</p>
                  </div>
                ) : (
                  <select 
                    name="business_partner_key" 
                    value={formData.business_partner_key} 
                    onChange={handleFormChange} 
                    disabled={loadingPartners || partners.length === 0 || cartItems.length > 0} 
                    className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-50 text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:opacity-60"
                  >
                    <option value="">
                      {loadingPartners 
                        ? intl.formatMessage({ id: 'loans.loading_partners' }) 
                        : destinationType === 'distributor' && transferType === 'external'
                          ? intl.formatMessage({ id: 'loans.select_distributor' })
                          : intl.formatMessage({ id: 'loans.select_partner_req' })}
                    </option>
                    {partners
                      .filter(p => {
                        if (transferType === 'external' && destinationType === 'distributor') {
                          // Only include exact 'distributor' matches
                          return p.type.toLowerCase() === 'distributor';
                        }
                        return true;
                      })
                      .map(p => <option key={`partner-${p.id}`} value={String(p.id)}>{p.name} {p.type && `(${p.type})`}</option>)}
                  </select>
                )}
                {cartItems.length > 0 && <p className="text-[10px] text-slate-400 italic">{intl.formatMessage({ id: 'loans.recipient_locked' })}</p>}
              </div>

              <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50 space-y-4">
                <p className="text-sm font-semibold text-slate-700">{intl.formatMessage({ id: 'loans.add_products_section' })}</p>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Material</label>
                    <select 
                      name="material_key" 
                      value={formData.material_key} 
                      onChange={handleFormChange} 
                      disabled={loadingMaterials || materials.length === 0} 
                      className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                    >
                      <option value="">{intl.formatMessage({ id: 'loans.select_material_placeholder' })}</option>
                      {materials.map(m => <option key={`material-${m.id}`} value={String(m.id)}>{m.sku}{m.description ? ` - ${m.description}` : ''}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{intl.formatMessage({ id: 'loans.wait_time' }).replace(':', '')}</label>
                      <input 
                        type="number" 
                        name="bp_loan_qty_in_base_uom" 
                        value={formData.bp_loan_qty_in_base_uom} 
                        onChange={handleFormChange} 
                        min="1" 
                        className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-400" 
                      />
                    </div>
                    <Button 
                      onClick={addToCart} 
                      type="button" 
                      variant="outline" 
                      className="h-10 border-dashed border-2 hover:bg-slate-100"
                      style={{ color: primaryColor, borderColor: primaryColor }}
                    >
                      <Plus className="w-4 h-4 mr-1" />{intl.formatMessage({ id: 'inventory.add' })}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Cart List */}
              {cartItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{intl.formatMessage({ id: 'loans.request_list_title' }, { n: cartItems.length })}</p>
                    <button onClick={() => setCartItems([])} className="text-[10px] font-bold text-rose-500 hover:underline uppercase tracking-tighter">{intl.formatMessage({ id: 'loans.clear_all' })}</button>
                  </div>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100 overflow-hidden">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-semibold text-slate-900 truncate">{item.materialLabel}</p>
                          <p className="text-[10px] text-slate-500">Qty: <span className="font-bold text-slate-700">{item.quantity} CRT</span></p>
                        </div>
                        <button 
                          onClick={() => removeFromCart(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 font-medium rounded hover:bg-slate-50 transition-colors"
                >
                  {intl.formatMessage({ id: 'sidebar.logout_cancel' })}
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading || (cartItems.length === 0 && !formData.material_key)} 
                  className="flex-1 px-4 py-2 text-white font-bold rounded shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale" 
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? intl.formatMessage({ id: 'loans.submitting' }) : cartItems.length > 0 ? intl.formatMessage({ id: 'loans.submit_requests_btn' }, { n: cartItems.length }) : intl.formatMessage({ id: 'loans.submit_request_btn' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}