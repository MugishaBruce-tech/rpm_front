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
import { authService } from '../services/authService';
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
import PartnerDetailsModal from './partner-details-modal';

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
                <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'opco.users_title' })}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">
                  {intl.formatMessage({ id: 'opco.users_desc' })}
                </p>
              </div>
            </div>
            {pagination && (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-normal text-slate-500">{intl.formatMessage({ id: 'opco.total_population' })}</p>
                <p className="text-xl font-semibold text-slate-900 leading-none">{pagination.total}</p>
              </div>
            )}
          </div>

          {/* Region filter tabs — for OPCO and MD/ADMIN */}
          {(isOPCO || isMD) && availableRegions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-normal text-slate-500">Region:</span>
              <button
                onClick={() => { setSelectedRegion(null); setPage(1); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${selectedRegion === null
                    ? 'bg-[#168c17] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >All</button>
              {availableRegions.map(r => (
                <button
                  key={r}
                  onClick={() => { setSelectedRegion(r); setPage(1); }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${selectedRegion === r
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
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.partner_identity' })}</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'users.form.profile' })}</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.region_channel' })}</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.status' })}</TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.activity' })}</TableHead>
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
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-medium group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-50">
                            {user.business_partner_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-[#004a99] group-hover:text-emerald-700 transition-colors">
                              {user.business_partner_name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span className="text-xs text-slate-400 font-normal">{user.user_ad}</span>
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
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                              {profileCode}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {user.region || intl.formatMessage({ id: 'opco.global' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-0.5">
                            <Shield className="w-3 h-3 text-slate-300" />
                            <span className="text-xs text-slate-600 font-medium">
                              {user.customer_channel || user.business_partner_type || 'Partner'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          className={`text-xs font-medium ${user.business_partner_status === 'active'
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
                          <div className="flex items-center gap-1 text-xs font-medium text-slate-900">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            <span>ID: {user.business_partner_key}</span>
                          </div>
                          <p className="text-xs text-slate-400 font-normal mt-1">
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
                      <p className="text-xs font-normal text-slate-400">{intl.formatMessage({ id: 'opco.no_users' })}</p>
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
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all ${isActive
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
      <div className="flex justify-between items-center text-xs font-normal text-slate-400 px-1 mt-6">
        <span>{intl.formatMessage({ id: 'opco.system_version' }, { type: isOPCO ? 'OPCO' : 'DDM' })}</span>
        <span className="text-[7px] opacity-40">{intl.formatMessage({ id: 'opco.copyright' })}</span>
        <span>{intl.formatMessage({ id: 'opco.standard_protocol' })}</span>
      </div>
    </div>
  );
}

function OPCODirectory({ type, title, icon: Icon }: { type: 'stock' | 'loans', title: string, icon: React.ElementType }) {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const { availablePartners, loadingPartners, isOPCO, isMD, selectedRegion, setSelectedRegion, availableRegions } = usePartnerContext();
  const currentUser = authService.getCurrentUser();
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
    setSelectedUser(partner);
    setModalOpen(true);
    setModalLoading(true);
    setModalPage(1); // Reset page on open

    try {
      if (type === 'stock') {
        const response = await dashboardService.getLoanBalances({ partnerKey: partner.id });
        console.log('Stock response:', response);
        // Response is the array directly from dashboardService.getLoanBalances
        setModalData(response || []);
      } else if (type === 'loans') {
        // Fetch loans - get all loans and filter on modal side for this partner
        const response = await apiRequest(`/loans?limit=1000&offset=0`);
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
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-xs text-slate-500 mt-1 font-normal">
                {intl.formatMessage({ id: 'opco.select_partner_desc' }, { type })}
              </p>
            </div>
          </div>

          {/* Region filter tabs — for OPCO and MD/ADMIN */}
          {(isOPCO || isMD) && availableRegions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-normal text-slate-500">Region:</span>
              <button
                onClick={() => { setSelectedRegion(null); setPage(1); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${selectedRegion === null
                    ? 'bg-[#168c17] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >All</button>
              {availableRegions.map(r => (
                <button
                  key={r}
                  onClick={() => { setSelectedRegion(r); setPage(1); }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${selectedRegion === r
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
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.partner_identity' })}</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.region_channel' })}</TableHead>
                  <TableHead className="px-6 py-4 text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.status' })}</TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-medium text-slate-500">{intl.formatMessage({ id: 'opco.table.actions' })}</TableHead>
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
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-medium group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-50">
                              {partner.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-[#004a99] group-hover:text-emerald-700 transition-colors">
                                {partner.name}
                              </h4>
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-slate-300" />
                                <span className="text-xs text-slate-400 font-normal">{partner.email || partner.id}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">
                              {partner.region || 'GLOBAL'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 pl-0.5">
                            <Shield className="w-3 h-3 text-slate-300" />
                            <span className="text-xs text-slate-600 font-medium">
                              {partner.channel || partner.role || 'PARTNER'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            className={`text-xs font-medium ${(partner.status?.toLowerCase() === 'active')
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
                            className="h-8 px-2 sm:px-3 text-xs font-medium text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all gap-1.5"
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
                      <p className="text-xs font-normal text-slate-400">{intl.formatMessage({ id: 'opco.no_partners' })}</p>
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
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all ${isActive
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

      {/* Detail Modal - Using new component */}
      <PartnerDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        partner={selectedUser}
        data={modalData}
        loading={modalLoading}
        type={type}
        currentUserId={currentUser?.id || currentUser?.business_partner_key}
      />
      {/* FOOTER */}
      <div className="flex justify-center items-center text-xs font-normal text-slate-400 px-1 mt-auto pt-10 opacity-40">
        <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
      </div>
    </div>
  );
}
