import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { ProtectedResource } from './ui/ProtectedResource';
import { Plus, Users, Edit2, Trash, AlertCircle, ChevronLeft, ChevronRight, Save, History, Clock, MapPin, Monitor, Smartphone, Globe } from 'lucide-react';

export function UserList() {
  const intl = useIntl();
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Pagination and filtering state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Create User modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [legalEntities, setLegalEntities] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [businessPartnerTypes, setBusinessPartnerTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [createFormData, setCreateFormData] = useState({
    business_partner_name: '',
    user_ad: '',
    region: 'North',
    business_partner_type: 'customer',
    customer_channel: 'distributor',
    legal_entity_key: '',
    profil_id: '',
  });

  // Edit User modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    business_partner_key: '',
    business_partner_name: '',
    user_ad: '',
    region: 'North',
    business_partner_type: 'customer',
    customer_channel: 'distributor',
    legal_entity_key: '',
    profil_id: '',
    business_partner_status: 'active',
  });

  // Tracking logs modal state
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, search, region, type, status]);

  const fetchMetadata = async () => {
    try {
      setMetadataLoading(true);
      const metadata = await userService.getMetadata();
      setProfiles(metadata.profils || []);
      setLegalEntities(metadata.legalEntities || []);
      setRegions(metadata.regions || []);
      setBusinessPartnerTypes(metadata.businessPartnerTypes || []);
      setStatuses(metadata.statuses || []);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      setMetadataLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page,
        limit,
        search,
        region,
        type,
        status,
      });
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      toast.error(intl.formatMessage({ id: 'users.load_failed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditFormData({
      business_partner_key: user.business_partner_key.toString(),
      business_partner_name: user.business_partner_name || '',
      user_ad: user.user_ad || '',
      region: user.region || 'North',
      business_partner_type: user.business_partner_type || 'customer',
      customer_channel: user.customer_channel || 'distributor',
      legal_entity_key: user.legal_entity_key?.toString() || '',
      profil_id: user.profil_id?.toString() || '',
      business_partner_status: user.business_partner_status || 'active',
    });
    setShowEditModal(true);
  };

  const handleShowLogs = async (user: any) => {
    try {
      setSelectedUser(user);
      setLogsLoading(true);
      setShowLogsModal(true);
      const logs = await userService.getUserLogs(user.business_partner_key.toString());
      setUserLogs(logs);
    } catch (err) {
      console.error('Failed to load user logs:', err);
      toast.error(intl.formatMessage({ id: 'users.logs_failed' }));
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setPage(1);
    switch (filterType) {
      case 'region':
        setRegion(value);
        break;
      case 'type':
        setType(value);
        break;
      case 'status':
        setStatus(value);
        break;
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: intl.formatMessage({ id: 'users.delete_confirm_title' }),
      text: intl.formatMessage({ id: 'users.delete_confirm_text' }, { name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: intl.formatMessage({ id: 'users.yes_delete' }),
      cancelButtonText: intl.formatMessage({ id: 'users.cancel' })
    });

    if (result.isConfirmed) {
      try {
        setDeleting(true);
        await userService.deleteUser(id.toString());
        setUsers(users.filter(u => u.business_partner_key !== id));
        toast.success(intl.formatMessage({ id: 'users.delete_success' }, { name }));
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        toast.error(err.message || 'Failed to delete user');
      } finally {
        setDeleting(false);
      }
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRegion('');
    setType('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-full overflow-hidden space-y-6 min-w-0">
      
      {/* Users Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{intl.formatMessage({ id: 'users.title' })}</CardTitle>
            <ProtectedResource action="USER_CREATE_REGION">
              <Button
                onClick={() => {
                  setShowCreateModal(true);
                  if (regions.length && !createFormData.region) {
                    setCreateFormData(p => ({ ...p, region: regions[0] }));
                  }
                  if (businessPartnerTypes.length && !createFormData.business_partner_type) {
                    setCreateFormData(p => ({ ...p, business_partner_type: businessPartnerTypes[0] }));
                  }
                }}
                className="w-full sm:w-auto gap-2"
                style={{ backgroundColor: primaryColor }}
                title={intl.formatMessage({ id: 'users.add_new' })}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{intl.formatMessage({ id: 'users.add_new' })}</span>
              </Button>
            </ProtectedResource>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-1 w-full md:w-auto items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Input
                  placeholder={intl.formatMessage({ id: 'users.search_placeholder' })}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
                  className="pl-3"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary" size="sm">{intl.formatMessage({ id: 'users.search_btn' })}</Button>
              {(search || region || type || status) && (
                <Button onClick={clearFilters} variant="ghost" size="sm" className="text-slate-500">
                  {intl.formatMessage({ id: 'users.clear_btn' })}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={region} onValueChange={(val) => handleFilterChange('region', val === 'all' ? '' : val)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={intl.formatMessage({ id: 'users.all_regions' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'users.all_regions' })}</SelectItem>
                  {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={(val) => handleFilterChange('type', val === 'all' ? '' : val)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={intl.formatMessage({ id: 'users.all_types' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'users.all_types' })}</SelectItem>
                  {businessPartnerTypes.map(t => <SelectItem key={t} value={t}>{t && t.length > 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(val) => handleFilterChange('status', val === 'all' ? '' : val)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={intl.formatMessage({ id: 'users.all_status' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'users.all_status' })}</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24 hidden md:block" />
                    <Skeleton className="h-4 w-16 hidden md:block" />
                    <Skeleton className="h-4 w-16 hidden md:block" />
                    <Skeleton className="h-4 w-20 hidden md:block" />
                    <Skeleton className="h-4 w-16 hidden md:block" />
                    <Skeleton className="h-4 w-16 hidden md:block" />
                  </div>
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4 border-b border-slate-100 last:border-0 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                      <div className="flex gap-3 items-center">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">Email:</span>
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">Region:</span>
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">Type:</span>
                        <Skeleton className="h-5 w-16 rounded" />
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">Login:</span>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden w-16">Status:</span>
                        <Skeleton className="h-5 w-16 rounded" />
                      </div>
                      <div className="flex gap-2 pt-2 md:pt-0 border-t md:border-0 border-slate-50">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">{intl.formatMessage({ id: 'users.none_found' })}</p>
              <p className="text-slate-500 text-sm">{intl.formatMessage({ id: 'users.none_found_desc' })}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.name' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.email' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.region' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.type' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.last_login' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.status' })}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{intl.formatMessage({ id: 'users.table.actions' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.business_partner_key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 text-slate-900 font-medium min-w-[200px]">{user.business_partner_name}</td>
                        <td className="py-3 px-4 text-slate-600">{user.user_ad}</td>
                        <td className="py-3 px-4 text-slate-600">{user.region || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
                            style={{ backgroundColor: user.business_partner_type === 'customer' ? '#dbeafe' : '#fef3c7', color: user.business_partner_type === 'customer' ? '#1e40af' : '#92400e' }}>
                            {user.business_partner_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {user.last_login_at ? (
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" />
                                {new Date(user.last_login_at).toLocaleDateString()}
                              </span>
                              <span className="text-slate-400 pl-4">
                                {new Date(user.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : intl.formatMessage({ id: 'users.last_login_never' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
                            style={{
                              backgroundColor: user.business_partner_status === 'active' ? '#dcfce7' : '#fecaca',
                              color: user.business_partner_status === 'active' ? '#166534' : '#991b1b'
                            }}>
                            {user.business_partner_status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleShowLogs(user)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                              title={intl.formatMessage({ id: 'users.tooltip.history' })}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <ProtectedResource action="USER_EDIT_REGION">
                              <button
                                onClick={() => handleEditClick(user)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                                title={intl.formatMessage({ id: 'users.tooltip.edit' })}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </ProtectedResource>
                            <ProtectedResource action="USER_DELETE_REGION">
                              <button
                                onClick={() => handleDelete(user.business_partner_key, user.business_partner_name)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                                title={intl.formatMessage({ id: 'users.tooltip.delete' })}
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </ProtectedResource>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Info and Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600 order-2 sm:order-1 text-center sm:text-left">
                  {intl.formatMessage({ id: 'inventory.showing_range' }, {
                    start: users.length === 0 ? 0 : (page - 1) * limit + 1,
                    end: Math.min(page * limit, pagination.total),
                    total: pagination.total
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
                  <div className="flex items-center gap-1 mr-2">
                    <Button onClick={() => setPage(1)} disabled={!pagination.hasPreviousPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.first' })}>≪</Button>
                    <Button onClick={() => setPage(page - 1)} disabled={!pagination.hasPreviousPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.prev' })}>‹</Button>
                    <div className="px-3 py-1 border border-slate-300 rounded-sm text-sm font-medium text-slate-700 bg-blue-50">{page}</div>
                    <Button onClick={() => setPage(page + 1)} disabled={!pagination.hasNextPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.next' })}>›</Button>
                    <Button onClick={() => setPage(pagination.totalPages)} disabled={!pagination.hasNextPage} variant="outline" size="sm" className="px-2" title={intl.formatMessage({ id: 'inventory.last' })}>≫</Button>
                  </div>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                    className="w-[80px] px-2 py-1.5 border border-slate-300 rounded-sm bg-white text-xs"
                  >
                    {intl.formatMessage({ id: 'inventory.per_page' }, { n: '' })}
                    {[5, 10, 15, 20, 50].map(n => <option key={n} value={n}>{n}/pg</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {intl.formatMessage({ id: 'users.create_title' })}
              </CardTitle>
              {/* <CardDescription>Register a new business partner in the system.</CardDescription> */}
            </CardHeader>
            <CardContent>
              {metadataLoading ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        setCreateLoading(true);
                        setCreatedPassword(null);
                        const result = await userService.createUser(createFormData as any);
                        
                        await fetchUsers();
                        setShowCreateModal(false);
                        
                        // Reset form
                        setCreateFormData({
                          business_partner_name: '',
                          user_ad: '',
                          region: 'North',
                          business_partner_type: 'customer',
                          customer_channel: 'distributor',
                          legal_entity_key: '',
                          profil_id: '',
                        });

                        toast.success('User created successfully', {
                          description: result?.password ? `${intl.formatMessage({ id: 'users.password_label' })}: ${result.password}` : '',
                          duration: 8000
                        });
                      } catch (err: any) {
                        console.error('Create User Error:', err);
                        toast.error(err.message || intl.formatMessage({ id: 'users.create_failed' }));
                      } finally {
                        setCreateLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                <div className="space-y-2">
                  <Label htmlFor="business_partner_name">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
                  <Input
                    id="business_partner_name"
                    value={createFormData.business_partner_name}
                    onChange={(e) => setCreateFormData((p) => ({ ...p, business_partner_name: e.target.value }))}
                    required
                    placeholder={intl.formatMessage({ id: 'users.form.name_placeholder' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_ad">{intl.formatMessage({ id: 'users.form.email_ad' })}</Label>
                  <Input
                    id="user_ad"
                    type="email"
                    value={createFormData.user_ad}
                    onChange={(e) => setCreateFormData((p) => ({ ...p, user_ad: e.target.value }))}
                    required
                    placeholder="user@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                    <Select
                      value={createFormData.region}
                      onValueChange={(val) => setCreateFormData((p) => ({ ...p, region: val }))}
                    >
                      <SelectTrigger id="region">
                        <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_region' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((reg) => (
                          <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_partner_type">{intl.formatMessage({ id: 'users.form.type' })}</Label>
                    <Select
                      value={createFormData.business_partner_type}
                      onValueChange={(val) => setCreateFormData((p) => ({ ...p, business_partner_type: val }))}
                    >
                      <SelectTrigger id="business_partner_type">
                        <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_type' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessPartnerTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type && type.length > 0 ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legal_entity_key">{intl.formatMessage({ id: 'users.form.legal_entity' })}</Label>
                    <Select
                      value={createFormData.legal_entity_key}
                      onValueChange={(val) => setCreateFormData((p) => ({ ...p, legal_entity_key: val }))}
                    >
                      <SelectTrigger id="legal_entity_key">
                        <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_legal_entity' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {legalEntities.map((le) => (
                          <SelectItem key={le.legal_entity_key} value={le.legal_entity_key?.toString?.() || String(le.legal_entity_key)}>
                            {le.legal_entity_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profil_id">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                    <Select
                      value={createFormData.profil_id}
                      onValueChange={(val) => setCreateFormData((p) => ({ ...p, profil_id: val }))}
                    >
                      <SelectTrigger id="profil_id">
                        <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_profile' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.PROFIL_ID} value={p.PROFIL_ID?.toString?.() || String(p.PROFIL_ID)}>
                            {p.CODE_PROFIL}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {intl.formatMessage({ id: 'users.cancel' })}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 text-white"
                    style={{ backgroundColor: primaryColor, opacity: createLoading ? 0.7 : 1 }}
                  >
                    {createLoading ? intl.formatMessage({ id: 'users.creating' }) : (<><Save className="w-4 h-4 mr-2" /> {intl.formatMessage({ id: 'users.create_btn' })}</>)}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                {intl.formatMessage({ id: 'users.edit_title' })}
              </CardTitle>
              <CardDescription>{intl.formatMessage({ id: 'users.edit_desc' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {metadataLoading ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        setEditLoading(true);
                        await userService.updateUser(editFormData.business_partner_key, editFormData as any);
                        
                        await fetchUsers();
                        setShowEditModal(false);

                        toast.success(intl.formatMessage({ id: 'users.update_success' }));
                      } catch (err: any) {
                        console.error('Update User Error:', err);
                        toast.error(err.message || intl.formatMessage({ id: 'users.update_failed' }));
                      } finally {
                        setEditLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="edit_business_partner_name">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
                      <Input
                        id="edit_business_partner_name"
                        value={editFormData.business_partner_name}
                        onChange={(e) => setEditFormData((p) => ({ ...p, business_partner_name: e.target.value }))}
                        required
                        placeholder={intl.formatMessage({ id: 'users.form.name_placeholder' })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit_user_ad">{intl.formatMessage({ id: 'users.form.email_read_only' })}</Label>
                      <Input
                        id="edit_user_ad"
                        type="email"
                        value={editFormData.user_ad}
                        disabled
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_region">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                        <Select
                          value={editFormData.region}
                          onValueChange={(val) => setEditFormData((p) => ({ ...p, region: val }))}
                        >
                          <SelectTrigger id="edit_region">
                            <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_region' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((reg) => (
                              <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit_business_partner_type">{intl.formatMessage({ id: 'users.form.type' })}</Label>
                        <Select
                          value={editFormData.business_partner_type}
                          onValueChange={(val) => setEditFormData((p) => ({ ...p, business_partner_type: val }))}
                        >
                          <SelectTrigger id="edit_business_partner_type">
                            <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_type' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {businessPartnerTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type && type.length > 0 ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_legal_entity_key">{intl.formatMessage({ id: 'users.form.legal_entity' })}</Label>
                        <Select
                          value={editFormData.legal_entity_key}
                          onValueChange={(val) => setEditFormData((p) => ({ ...p, legal_entity_key: val }))}
                        >
                          <SelectTrigger id="edit_legal_entity_key">
                            <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_legal_entity' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {legalEntities.map((le) => (
                              <SelectItem key={le.legal_entity_key} value={le.legal_entity_key?.toString?.() || String(le.legal_entity_key)}>
                                {le.legal_entity_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit_profil_id">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                        <Select
                          value={editFormData.profil_id}
                          onValueChange={(val) => setEditFormData((p) => ({ ...p, profil_id: val }))}
                        >
                          <SelectTrigger id="edit_profil_id">
                            <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_profile' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((p) => (
                              <SelectItem key={p.PROFIL_ID} value={p.PROFIL_ID?.toString?.() || String(p.PROFIL_ID)}>
                                {p.CODE_PROFIL}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit_status">Status</Label>
                      <Select
                        value={editFormData.business_partner_status}
                        onValueChange={(val) => setEditFormData((p) => ({ ...p, business_partner_status: val }))}
                      >
                        <SelectTrigger id="edit_status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status && status.length > 0 ? status.charAt(0).toUpperCase() + status.slice(1) : status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={editLoading}
                        className="flex-1 text-white"
                        style={{ backgroundColor: primaryColor, opacity: editLoading ? 0.7 : 1 }}
                      >
                        {editLoading ? 'Updating...' : (<><Save className="w-4 h-4 mr-2" /> Update User</>)}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* Tracking Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-0">
            <CardHeader className="border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Login Activity History</CardTitle>
                    <CardDescription>
                      {selectedUser?.business_partner_name} ({selectedUser?.user_ad})
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowLogsModal(false)}
                  className="rounded-full hover:bg-slate-200"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {logsLoading ? (
                <div className="p-8 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : userLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No activity logs found</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-1">
                    This user hasn't logged in recently or tracking data is not available.
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {userLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                              <Globe className="w-3.5 h-3.5" />
                              {log.ip_address}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="font-medium">{log.location || 'Unknown location'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Monitor className="w-4 h-4 text-slate-400" />
                              <span>{log.os_name} • {log.browser_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              {log.device_type === 'mobile' ? (
                                <Smartphone className="w-4 h-4 text-slate-400" />
                              ) : (
                                <Monitor className="w-4 h-4 text-slate-400" />
                              )}
                              <span>{log.device_type || 'Desktop'} device</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {log.is_active ? 'Active Session' : 'Expired'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <Button 
                onClick={() => setShowLogsModal(false)}
                className="w-full sm:w-auto px-8"
                style={{ backgroundColor: primaryColor }}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
