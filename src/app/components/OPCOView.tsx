import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Package, FileText, Users, Search, ChevronRight, X, Layers, ArrowRightLeft, Clock, CheckCircle2, XCircle, Mail, MapPin, Shield, Activity, ChevronLeft, ChevronsRight, Globe } from 'lucide-react';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { usePartnerContext } from '../contexts/PartnerContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { dashboardService } from '../services/dashboardService';
import { userService } from '../services/userService';
import { apiRequest } from '../services/api';
import { Button } from './ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { Badge } from './ui/badge';

export function OPCORegionalInventory() {
  const intl = useIntl();
  return <OPCODirectory type="stock" title={intl.formatMessage({ id: 'opco.inventory_title' })} icon={Package} />;
}

export function OPCORegionalLoans() {
  const intl = useIntl();
  return <OPCODirectory type="loans" title={intl.formatMessage({ id: 'opco.loans_title' })} icon={FileText} />;
}

export function OPCOUserDirectory() {
    return <OPCOUsersList />;
}

function OPCOUsersList() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const { isOPCO, isMD, selectedRegion, setSelectedRegion, availableRegions } = usePartnerContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const limit = 4;

  const fetchMetadata = async () => {
    try {
      const metadata = await userService.getMetadata();
      setProfiles(metadata.profils || []);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getUsersList({ 
        page, 
        limit, 
        search: searchTerm,
        region: selectedRegion || undefined
      });
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, selectedRegion]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="p-4 md:p-6 w-full min-h-[calc(100vh-120px)] flex flex-col space-y-6">
      <Card className="overflow-hidden shadow-sm border-slate-200">
        <CardHeader className="space-y-4 pb-4 border-b border-slate-100">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">{intl.formatMessage({ id: 'opco.users_title' })}</CardTitle>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">
                    {intl.formatMessage({ id: 'opco.users_desc' })}
                  </p>
                </div>
              </div>
              {pagination && (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.total_population' })}</p>
                  <p className="text-xl font-black text-slate-900 leading-none">{pagination.total}</p>
                </div>
              )}
           </div>
          
          {/* Region filter tabs — for OPCO and MD/ADMIN */}
          {(isOPCO || isMD) && availableRegions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Region:</span>
              <button
                onClick={() => { setSelectedRegion(null); setPage(1); }}
                className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedRegion === null
                    ? 'bg-[#168c17] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >ALL</button>
              {availableRegions.map(r => (
                <button
                  key={r}
                  onClick={() => { setSelectedRegion(r); setPage(1); }}
                  className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                    selectedRegion === r
                      ? 'bg-[#168c17] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >{r}</button>
              ))}
            </div>
          )}

          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={intl.formatMessage({ id: 'opco.search_placeholder' })} 
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
            />
          </form>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.partner_identity' })}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'users.form.profile' })}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.region_channel' })}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.status' })}</TableHead>
                  <TableHead className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.activity' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-12 w-full rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length > 0 ? (
                  users.map((user: any) => (
                    <TableRow key={user.business_partner_key} className="hover:bg-slate-50/30 transition-all border-slate-100 group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-50">
                            {user.business_partner_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-[#004a99] group-hover:text-emerald-700 transition-colors">
                              {user.business_partner_name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span className="text-[11px] text-slate-400 font-medium">{user.user_ad}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                          {(() => {
                            const profileCode = user.profil?.CODE_PROFIL || 
                                              user.CODE_PROFIL || 
                                              user.PROFIL_CODE ||
                                              (profiles.length > 0 ? profiles.find(p => String(p.PROFIL_ID) === String(user.profil_id || user.PROFIL_ID || user.profil?.PROFIL_ID))?.CODE_PROFIL : null) || 
                                              user.profil_name || 
                                              user.role || 
                                              user.role_name;
                            
                            if (!profileCode || profileCode === '-') {
                              return <span className="text-slate-300">-</span>;
                            }

                            let badgeStyle = { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };
                            const upperCode = String(profileCode).toUpperCase();
                            
                            if (upperCode.includes('ADMIN') || upperCode.includes('MD_AGENT')) {
                              badgeStyle = { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' };
                            } else if (upperCode.includes('OPCO')) {
                              badgeStyle = { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
                            } else if (upperCode.includes('DDM')) {
                              badgeStyle = { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' };
                            } else if (upperCode.includes('SUB_D') || upperCode.includes('AGENT')) {
                              badgeStyle = { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
                            } else if (upperCode.includes('USER')) {
                              badgeStyle = { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' };
                            }

                            return (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                                {profileCode}
                              </span>
                            );
                          })()}
                       </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                               {user.region || intl.formatMessage({ id: 'opco.global' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-0.5">
                            <Shield className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                               {user.customer_channel || user.business_partner_type || 'PARTNER'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                         <Badge 
                           className={`text-[9px] font-bold uppercase tracking-widest ${
                             user.business_partner_status === 'active' 
                             ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                             : 'bg-rose-50 text-rose-600 border-rose-100'
                           }`}
                           variant="outline"
                         >
                           {user.business_partner_status === 'active' ? intl.formatMessage({ id: 'opco.active' }) : intl.formatMessage({ id: 'opco.inactive' })}
                         </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                         <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-900 uppercase">
                               <Activity className="w-3 h-3 text-emerald-500" />
                               <span>ID: {user.business_partner_key}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                               {intl.formatMessage({ id: 'opco.last' })}: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : intl.formatMessage({ id: 'users.last_login_never' })}
                            </p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <Users className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{intl.formatMessage({ id: 'opco.no_users' })}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {pagination && (
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                title={intl.formatMessage({ id: 'inventory.prev' })}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2">
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  if (pagination.totalPages > 5) {
                    if (pNum > 3 && pNum < pagination.totalPages) return null;
                    if (pNum === 4) return <span key="ellipsis" className="text-slate-300">...</span>;
                  }
                  const isActive = page === pNum;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive 
                        ? 'bg-[#ec4899] text-white shadow-sm shadow-pink-200' 
                        : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setPage((p: number) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                title={intl.formatMessage({ id: 'inventory.next' })}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setPage(pagination.totalPages)}
                disabled={page === pagination.totalPages}
                className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                title={intl.formatMessage({ id: 'inventory.last' })}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
              <span className="text-slate-900">{page}</span> {intl.formatMessage({ id: 'opco.pagination.of' })} {pagination.totalPages} {intl.formatMessage({ id: 'opco.pagination.pages' })} ({pagination.total} {intl.formatMessage({ id: 'opco.pagination.items' })})
            </p>
          </div>
        )}
      </Card>
      {/* FOOTER */}
      <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mt-6">
        <span>{intl.formatMessage({ id: 'opco.system_version' }, { type: isOPCO ? 'OPCO' : 'DDM' })}</span>
        <span className="text-[7px] opacity-40">{intl.formatMessage({ id: 'opco.copyright' })}</span>
        <span>{intl.formatMessage({ id: 'opco.standard_protocol' })}</span>
      </div>
    </div>
  );
}

function OPCODirectory({ type, title, icon: Icon }: { type: 'stock' | 'loans' | 'list', title: string, icon: React.ElementType }) {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const { availablePartners, loadingPartners, isOPCO, isMD, selectedRegion, setSelectedRegion, availableRegions } = usePartnerContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('incoming');
  const [modalPage, setModalPage] = useState(1);
  const modalLimit = 10;

  const [page, setPage] = useState(1);
  const limit = 4;

  const filteredPartners = availablePartners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.region && p.region.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPartners.length / limit);
  const paginatedPartners = filteredPartners.slice((page - 1) * limit, page * limit);

  const handleOpenDetails = async (partner: any) => {
    if (type === 'list') return; // Directory only for list

    setSelectedUser(partner);
    setModalOpen(true);
    setModalLoading(true);
    setModalPage(1); // Reset page on open
    
    try {
      if (type === 'stock') {
        const data = await dashboardService.getLoanBalances({ partnerKey: partner.id });
        setModalData(data);
      } else if (type === 'loans') {
        // Fetch specific loans for this user
        const response = await apiRequest(`/loans?partnerKey=${partner.id}&limit=1000&offset=0`);
        setModalData(response.result || []);
      }
    } catch (err) {
       console.error('Failed to load OPCO details', err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full space-y-6">
      <Card className="overflow-hidden shadow-sm border-slate-200">
        <CardHeader className="space-y-4 pb-4 border-b border-slate-100 bg-white">
           <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold uppercase tracking-tight">{title}</CardTitle>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide font-bold">
                  {type === 'list' ? intl.formatMessage({ id: 'opco.users_desc' }) : intl.formatMessage({ id: 'opco.select_partner_desc' }, { type })}
                </p>
              </div>
            </div>
          
          {/* Region filter tabs — for OPCO and MD/ADMIN */}
          {(isOPCO || isMD) && availableRegions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Region:</span>
              <button
                onClick={() => { setSelectedRegion(null); setPage(1); }}
                className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedRegion === null
                    ? 'bg-[#168c17] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >ALL</button>
              {availableRegions.map(r => (
                <button
                  key={r}
                  onClick={() => { setSelectedRegion(r); setPage(1); }}
                  className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                    selectedRegion === r
                      ? 'bg-[#168c17] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >{r}</button>
              ))}
            </div>
          )}

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={intl.formatMessage({ id: 'opco.search_partners_placeholder' })} 
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.partner_identity' })}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.region_channel' })}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.status' })}</TableHead>
                  <TableHead className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPartners ? (
                  [...Array(limit)].map((_, i) => (
                    <TableRow key={`skeleton-row-${i}`} className="border-slate-100">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-2">
                             <Skeleton className="h-4 w-32" />
                             <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-20" />
                         </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                         <Skeleton className="h-5 w-16 rounded" />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                         <Skeleton className="h-8 w-20 ml-auto rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedPartners.length > 0 ? (
                  paginatedPartners.map((partner, idx) => {
                    const uniqueKey = `opco-partner-${partner.id || 'no-id'}-${idx}`;
                    return (
                      <TableRow key={uniqueKey} className="hover:bg-slate-50/30 border-slate-100 group transition-all">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-50">
                              {partner.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <h4 className="text-[13px] font-bold text-[#004a99] group-hover:text-emerald-700 transition-colors">
                                 {partner.name}
                               </h4>
                               <div className="flex items-center gap-1.5">
                                 <Mail className="w-3 h-3 text-slate-300" />
                                 <span className="text-[10px] text-slate-400 font-bold">{partner.email || partner.id}</span>
                               </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                           <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-slate-100">
                                 {partner.region || 'GLOBAL'}
                              </span>
                           </div>
                           <div className="flex items-center gap-1.5 mt-1 pl-0.5">
                              <Shield className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                 {partner.channel || partner.role || 'PARTNER'}
                              </span>
                           </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                           <Badge 
                             className={`text-[9px] font-bold uppercase tracking-widest ${
                               (partner.status?.toLowerCase() === 'active')
                               ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                               : 'bg-rose-50 text-rose-600 border-rose-100'
                             }`}
                             variant="outline"
                           >
                             {partner.status?.toLowerCase() === 'active' ? intl.formatMessage({ id: 'opco.active' }) : intl.formatMessage({ id: 'opco.inactive' })}
                           </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                           <Button 
                             onClick={() => handleOpenDetails(partner)}
                             variant="ghost" 
                             size="sm"
                             className="h-8 px-2 sm:px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all gap-1.5"
                             title={intl.formatMessage({ id: 'opco.details_btn' })}
                           >
                             <span className="hidden sm:inline">{intl.formatMessage({ id: 'opco.details_btn' })}</span> <ChevronRight className="w-3 h-3" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                       <Package className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{intl.formatMessage({ id: 'opco.no_partners' })}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 0 && (
          <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  if (totalPages > 5) {
                    if (pNum > 3 && pNum < totalPages) return null;
                    if (pNum === 4) return <span key="ellipsis" className="text-slate-300">...</span>;
                  }
                  const isActive = page === pNum;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive 
                        ? 'bg-[#ec4899] text-white shadow-sm shadow-pink-200' 
                        : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
              <span className="text-slate-900">{page}</span> {intl.formatMessage({ id: 'opco.pagination.of' })} {totalPages} {intl.formatMessage({ id: 'opco.pagination.pages' })} ({filteredPartners.length} {intl.formatMessage({ id: 'opco.pagination.items' })})
            </p>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl uppercase shadow-sm">
                    {selectedUser?.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{selectedUser?.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedUser?.region || 'GLOBAL'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">{selectedUser?.channel || selectedUser?.type || selectedUser?.role || 'Partner'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

             <div className="p-0 max-h-[70vh] overflow-y-auto">
              {modalLoading ? (
                <div className="p-6 space-y-4">
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                </div>
              ) : type === 'stock' ? (
                <>
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.sku_desc' })}</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.physical_qty' })}</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{intl.formatMessage({ id: 'opco.table.net_balance' })}</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modalData && modalData.slice((modalPage - 1) * modalLimit, modalPage * modalLimit).map((item: any, idx: number) => (
                        <TableRow key={item.name || idx} className="hover:bg-slate-50/50 transition-all border-slate-100">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.physical > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                              <span className={`text-[11px] font-bold uppercase tracking-tight ${item.physical === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                                {item.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <span className={`text-sm font-black tabular-nums ${item.physical === 0 ? 'text-slate-200' : 'text-slate-900'}`}>
                              {item.physical.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                             <Badge variant="outline" className={`text-[9px] font-black ${item.loaned - item.borrowed >= 0 ? 'text-emerald-600 border-emerald-100 bg-emerald-50/30' : 'text-rose-600 border-rose-100 bg-rose-50/30'}`}>
                                {item.loaned - item.borrowed > 0 ? '+' : ''}{item.loaned - item.borrowed}
                             </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {modalData && modalData.length > modalLimit && (
                    <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setModalPage(p => Math.max(1, p - 1))}
                          disabled={modalPage === 1}
                          className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-2">
                          {[...Array(Math.ceil(modalData.length / modalLimit))].map((_, i) => {
                            const pNum = i + 1;
                            const isActive = modalPage === pNum;
                            return (
                              <button
                                key={pNum}
                                onClick={() => setModalPage(pNum)}
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                                  isActive 
                                  ? 'bg-[#ec4899] text-white shadow-sm shadow-pink-200' 
                                  : 'text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                {pNum}
                              </button>
                            );
                          })}
                        </div>

                        <button 
                          onClick={() => setModalPage(p => p + 1)}
                          disabled={modalPage * modalLimit >= modalData.length}
                          className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => setModalPage(Math.ceil(modalData.length / modalLimit))}
                          disabled={modalPage * modalLimit >= modalData.length}
                          className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                        <span className="text-slate-900">{modalPage}</span> {intl.formatMessage({ id: 'opco.pagination.of' })} {Math.ceil(modalData.length / modalLimit)} {intl.formatMessage({ id: 'opco.pagination.pages' })} ({modalData.length} {intl.formatMessage({ id: 'opco.pagination.items' })})
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['incoming', 'requested', 'approved', 'denied'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setModalPage(1); }}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all ${
                          activeTab === tab 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                        }`}
                       >
                        {intl.formatMessage({ id: `opco.modal.tab.${tab}` })}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-0">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 border-t border-slate-100">
                        <TableRow className="hover:bg-transparent text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-3 text-left">{intl.formatMessage({ id: 'opco.modal.asset_detail' })}</th>
                          <th className="px-6 py-3 text-left">{intl.formatMessage({ id: 'opco.modal.scope' })}</th>
                          <th className="px-6 py-3 text-right">{intl.formatMessage({ id: 'opco.modal.qty_crt' })}</th>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(modalData || [])
                          .filter((l: any) => {
                            if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                            if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                            return false;
                          })
                          .slice((modalPage - 1) * modalLimit, modalPage * modalLimit)
                          .map((loan: any, idx: number) => (
                            <TableRow key={loan.business_partner_empties_loan_key || idx} className="hover:bg-slate-50/50 border-slate-100 group transition-all">
                              <TableCell className="px-6 py-4">
                                <div>
                                   <p className="text-[11px] font-bold text-slate-700 uppercase leading-none mb-1 group-hover:text-emerald-800 transition-colors">
                                     {loan.material?.material_description || 'SKU'}
                                   </p>
                                   <div className="flex items-center gap-1.5">
                                     <div className={`w-1 h-1 rounded-full ${loan.bp_loan_status === 'pending' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                     <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(loan.created_at).toLocaleDateString()}</p>
                                   </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                 <p className="text-[9px] text-slate-500 font-bold uppercase whitespace-nowrap">
                                    {loan.business_partner_key === selectedUser?.id ? `→ ${loan.borrower?.business_partner_name?.split(' ')[0]}` : `← ${loan.lender?.business_partner_name?.split(' ')[0]}`}
                                 </p>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                 <span className="text-sm font-black text-slate-900 tabular-nums">
                                    {loan.bp_loan_qty_in_base_uom}
                                 </span>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {modalData && (modalData || []).filter((l: any) => {
                    if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                    if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                    if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                    if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                    return false;
                  }).length > modalLimit && (
                    <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setModalPage(p => Math.max(1, p - 1))}
                          disabled={modalPage === 1}
                          className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-2">
                          {[...Array(Math.ceil((modalData || []).filter((l: any) => {
                            if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                            if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                            return false;
                          }).length / modalLimit))].map((_, i) => {
                            const pNum = i + 1;
                            const isActive = modalPage === pNum;
                            return (
                              <button
                                key={pNum}
                                onClick={() => setModalPage(pNum)}
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                                  isActive 
                                  ? 'bg-[#ec4899] text-white shadow-sm shadow-pink-200' 
                                  : 'text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                {pNum}
                              </button>
                            );
                          })}
                        </div>

                        <button 
                          onClick={() => setModalPage(p => p + 1)}
                          disabled={modalPage * modalLimit >= (modalData || []).filter((l: any) => {
                            if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                            if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                            return false;
                          }).length}
                          className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => setModalPage(Math.ceil((modalData || []).filter((l: any) => {
                            if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                            if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                            return false;
                          }).length / modalLimit))}
                          disabled={modalPage * modalLimit >= (modalData || []).filter((l: any) => {
                            if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                            if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                            if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                            return false;
                          }).length}
                          className="text-slate-300 disabled:opacity-20 hover:text-slate-600 transition-colors"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>

                       <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                        <span className="text-slate-900">{modalPage}</span> {intl.formatMessage({ id: 'opco.pagination.of' })} {Math.ceil((modalData || []).filter((l: any) => {
                          if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                          if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                          if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                          if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                          return false;
                        }).length / modalLimit)} {intl.formatMessage({ id: 'opco.pagination.pages' })} 
                        ({(modalData || []).filter((l: any) => {
                          if (activeTab === 'incoming') return l.bp_loaned_to_business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                          if (activeTab === 'requested') return l.business_partner_key == selectedUser?.id && l.bp_loan_status === 'pending';
                          if (activeTab === 'approved') return l.bp_loan_status === 'open' || l.bp_loan_status === 'approved';
                          if (activeTab === 'denied') return l.bp_loan_status === 'rejected' || l.bp_loan_status === 'denied';
                          return false;
                        }).length} {intl.formatMessage({ id: 'opco.pagination.items' })})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={() => setModalOpen(false)}
                variant="outline"
                className="font-black text-[11px] uppercase tracking-widest border-slate-200 hover:bg-white"
              >
                {intl.formatMessage({ id: 'opco.modal.dismiss' })}
              </Button>
            </div>
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
