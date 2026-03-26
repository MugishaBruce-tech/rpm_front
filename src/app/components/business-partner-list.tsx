import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Plus, Users, Edit2, Trash, Save, Mail, MapPin, Building2, Shield, Key, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
// @ts-ignore
import headerImageLogo from '../../assets/logo3.png';

export function BusinessPartnerList() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [canCreateUsers, setCanCreateUsers] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [legalEntities, setLegalEntities] = useState<any[]>([]);
  const [partnerTypes, setPartnerTypes] = useState<string[]>([]);
  const [customerChannels, setCustomerChannels] = useState<string[]>([]);
  
  const [createFormData, setCreateFormData] = useState({
    business_partner_name: '',
    user_ad: '',
    region: 'North',
    business_partner_type: 'customer',
    customer_channel: '',
    legal_entity_key: '',
    profil_id: '',
    is_internal: false
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    business_partner_key: '',
    business_partner_name: '',
    user_ad: '',
    region: 'North',
    business_partner_type: 'customer',
    customer_channel: '',
    legal_entity_key: '',
    profil_id: '',
    business_partner_status: 'active',
    is_internal: false
  });

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchMetadata();
    checkUserPermissions();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, search, regionFilter]);

  const fetchMetadata = async () => {
    try {
      setMetadataLoading(true);
      const metadata = await userService.getMetadata();
      // External profiles only (e.g. SUB_D)
      const externalProfiles = (metadata.profils || []).filter((p: any) => 
        !['MD_AGENT', 'OPCO_USER', 'DDM'].includes(p.CODE_PROFIL)
      );
      setProfiles(externalProfiles);
      setRegions(metadata.regions || []);
      setLegalEntities(metadata.legalEntities || []);
      setPartnerTypes(metadata.businessPartnerTypes || []);
      const channels = metadata.customerChannels || [];
      setCustomerChannels(channels);
      if (channels.length > 0 && !createFormData.customer_channel) {
        setCreateFormData(prev => ({ ...prev, customer_channel: channels[0] }));
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      setMetadataLoading(false);
    }
  };

  const checkUserPermissions = () => {
    const currentUser = authService.getCurrentUser();
    const hasCreatePermission = currentUser?.permissions?.includes('USER_CREATE_REGION') || 
                                currentUser?.permissions?.includes('USER_CREATE_ALL');
    setCanCreateUsers(!!hasCreatePermission);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page,
        limit,
        search,
        region: regionFilter || undefined,
        is_internal: false
      });
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Failed to fetch partners:', err);
      toast.error(intl.formatMessage({ id: 'users.load_failed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (partner: any) => {
    setEditFormData({
      business_partner_key: partner.business_partner_key.toString(),
      business_partner_name: partner.business_partner_name || '',
      user_ad: partner.user_ad || '',
      region: partner.region || 'North',
      business_partner_type: partner.business_partner_type || 'customer',
      customer_channel: partner.customer_channel || '',
      legal_entity_key: partner.legal_entity_key?.toString() || '',
      profil_id: partner.profil_id?.toString() || '',
      business_partner_status: partner.business_partner_status || 'active',
      is_internal: false
    });
    setShowEditModal(true);
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
        await userService.deleteUser(id.toString(), false);
        setUsers(users.filter(u => u.business_partner_key !== id));
        toast.success(intl.formatMessage({ id: 'users.delete_success' }, { name }));
      } catch (err: any) {
        toast.error(err.message || 'Error deleting partner');
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleResetClick = (partner: any) => {
    setSelectedUser(partner);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      setResetLoading(true);
      await userService.resetPassword(selectedUser.business_partner_key.toString(), newPassword, false);
      setShowResetModal(false);
      toast.success(intl.formatMessage({ id: 'users.reset_success' }, { name: selectedUser.business_partner_name }));
    } catch (err: any) {
      console.error('Failed to reset password:', err);
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const fullResponse = await userService.getUsers({
        limit: 2000,
        search,
        region: regionFilter === 'all' ? undefined : regionFilter,
        is_internal: false
      });
      
      const allPartners = fullResponse.users;
      if (allPartners.length === 0) {
        toast.error(intl.formatMessage({ id: 'export.no_data' }));
        return;
      }

      const regionCounts: Record<string, number> = {};
      allPartners.forEach((u: any) => {
        const r = u.region || 'Global';
        regionCounts[r] = (regionCounts[r] || 0) + 1;
      });
      const chartDataArr = Object.entries(regionCounts).map(([name, count]) => ({ name, count }));

      toast.promise(new Promise(async (resolve, reject) => {
        try {
          const ExcelJS = (await import('exceljs')).default;
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('BusinessPartners');

          worksheet.mergeCells('A1:F4');
          const titleCell = worksheet.getCell('A1');
          titleCell.value = 'BRARUDI RPM TRACKER - RÉPERTOIRE PARTENAIRES';
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008200' } };

          try {
            const logoRes = await fetch(headerImageLogo);
            const logoBlob = await logoRes.blob();
            const logoBuffer = await logoBlob.arrayBuffer();
            const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            worksheet.addImage(logoId, { tl: { col: 5.15, row: 0.3 }, ext: { width: 90, height: 75 } });
          } catch (e) { console.error(e); }

          const metaRow = 6;
          worksheet.mergeCells(`A${metaRow}:C${metaRow}`);
          worksheet.getCell(`A${metaRow}`).value = `Généré par: ${authService.getCurrentUser()?.name || 'Administrateur'}`;
          worksheet.getCell(`A${metaRow}`).font = { bold: true, size: 11 };
          
          worksheet.mergeCells(`D${metaRow}:F${metaRow}`);
          worksheet.getCell(`D${metaRow}`).value = `Date: ${new Date().toLocaleString()}`;
          worksheet.getCell(`D${metaRow}`).alignment = { horizontal: 'right' };

          // CHART
          const canvas = document.createElement('canvas');
          canvas.width = 1000;
          canvas.height = 500;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const maxVal = Math.max(...chartDataArr.map(d => d.count), 5);
          const barW = (canvas.width - 200) / chartDataArr.length;
          
          chartDataArr.forEach((d, i) => {
            const h = (d.count / maxVal) * 350;
            ctx.fillStyle = i % 2 === 0 ? '#1b7a00' : '#008200';
            ctx.fillRect(100 + i * barW + 20, 400 - h, barW - 40, h);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(d.name, 100 + i * barW + (barW/2), 430);
            ctx.fillText(String(d.count), 100 + i * barW + (barW/2), 400 - h - 10);
          });
          
          const chartId = workbook.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
          worksheet.addImage(chartId, { tl: { col: 0.2, row: 7 }, ext: { width: 600, height: 300 }});

          // TABLE
          const startRow = 25;
          const header = worksheet.getRow(startRow);
          header.values = ['NO', 'NOM PARTENAIRE', 'RÉGION', 'TYPE', 'CANAL', 'STATUT'];
          header.eachCell((c: any) => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
            c.alignment = { horizontal: 'center' };
          });

          allPartners.forEach((u: any, i: number) => {
            const r = worksheet.getRow(startRow + 1 + i);
            r.values = [i + 1, u.business_partner_name, u.region || 'Global', u.profil?.CODE_PROFIL || u.role || 'PARTNER', u.customer_channel || '-', u.business_partner_status.toUpperCase()];
            if (i % 2 === 1) r.eachCell((c: any) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } });
            r.eachCell((c: any) => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
          });

          worksheet.getColumn(1).width = 5;
          worksheet.getColumn(2).width = 40;
          worksheet.getColumn(3).width = 15;
          worksheet.getColumn(4).width = 20;
          worksheet.getColumn(5).width = 20;
          worksheet.getColumn(6).width = 12;

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blob, `partenaires-brarudi-${new Date().toISOString().slice(0,10)}.xlsx`);
          resolve(true);
        } catch (err) { reject(err); }
      }), {
        loading: 'Génération de l\'export...',
        success: 'Export réussi !',
        error: 'Échec de l\'export.'
      });
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-2.5">
          <div>
            <CardTitle className="flex items-center gap-2 font-normal text-base text-slate-800">
              <Users className="w-5 h-5" style={{ color: primaryColor }} />
              {intl.formatMessage({ id: 'sidebar.business_partners' })}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 border border-slate-200"
              title={intl.formatMessage({ id: 'dashboard.export_excel' })}
            >
              <Download className="w-4 h-4" />
            </button>
            {canCreateUsers && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="text-white font-normal h-8 px-4 text-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {intl.formatMessage({ id: 'users.add_new' })}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex gap-2.5 mb-3">
            <Input
              placeholder={intl.formatMessage({ id: 'users.search_placeholder' })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md h-8 font-normal text-xs"
            />
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[180px] h-8 font-normal text-xs">
                <SelectValue placeholder={intl.formatMessage({ id: 'users.all_regions' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{intl.formatMessage({ id: 'users.all_regions' })}</SelectItem>
                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-normal text-slate-500 uppercase tracking-widest text-[10px]">{intl.formatMessage({ id: 'users.table.name' })}</th>
                  <th className="text-left p-4 font-normal text-slate-500 uppercase tracking-widest text-[10px]">{intl.formatMessage({ id: 'users.table.region' })}</th>
                  <th className="text-left p-4 font-normal text-slate-500 uppercase tracking-widest text-[10px]">{intl.formatMessage({ id: 'users.table.type' })}</th>
                  <th className="text-left p-4 font-normal text-slate-500 uppercase tracking-widest text-[10px]">{intl.formatMessage({ id: 'users.table.status' })}</th>
                  <th className="text-right p-4 font-normal text-slate-500 uppercase tracking-widest text-[10px]">{intl.formatMessage({ id: 'inventory.actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-normal uppercase tracking-widest">
                      {intl.formatMessage({ id: 'users.none_found' })}
                    </td>
                  </tr>
                ) : (
                  users.map((partner) => (
                    <tr key={partner.business_partner_key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-normal border border-slate-200">
                            {partner.business_partner_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-normal text-slate-800">{partner.business_partner_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span className="text-[11px] text-slate-400 font-normal">{partner.user_ad}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] font-normal bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                               {partner.region || 'Global'}
                            </span>
                          </div>
                      </td>
                      <td className="p-4">
                         <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-normal uppercase tracking-tight border bg-amber-50 text-amber-600 border-amber-100 w-fit">
                              {partner.profil?.CODE_PROFIL || partner.role || 'PARTNER'}
                            </span>
                            <span className="text-[9px] font-normal text-slate-400 uppercase tracking-tighter ml-0.5">
                               {partner.customer_channel || 'GENERAL'}
                            </span>
                         </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-normal uppercase tracking-widest ${
                          partner.business_partner_status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {partner.business_partner_status === 'active' ? intl.formatMessage({ id: 'opco.active' }) : intl.formatMessage({ id: 'opco.inactive' })}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleResetClick(partner)} className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors" title={intl.formatMessage({ id: 'users.reset_password' })}>
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditClick(partner)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(partner.business_partner_key, partner.business_partner_name)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-50">
             <div className="text-xs font-normal text-slate-400 uppercase tracking-widest">
               {intl.formatMessage(
                 { id: 'inventory.showing_range' },
                 { 
                   start: users.length > 0 ? (page - 1) * limit + 1 : 0, 
                   end: Math.min(page * limit, pagination.total), 
                   total: pagination.total 
                 }
               )}
             </div>
             <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-50 rounded-md border border-slate-200 p-0.5">
                  <Button variant="ghost" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="h-8 w-8 p-0 text-slate-400 disabled:opacity-20 font-normal">≪</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="h-8 w-8 p-0 text-slate-400 font-normal">‹</Button>
                  <div className="px-3 h-8 flex items-center justify-center text-xs font-normal text-slate-700 bg-white shadow-sm border border-slate-100 rounded mx-1 min-w-[32px]">
                    {page} / {pagination.totalPages || 1}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page >= pagination.totalPages} className="h-8 w-8 p-0 text-slate-400 font-normal">›</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPage(pagination.totalPages)} disabled={page >= pagination.totalPages} className="h-8 w-8 p-0 text-slate-400 disabled:opacity-20 font-normal">≫</Button>
                </div>

                <Select value={String(limit)} onValueChange={v => { setLimit(Number(v)); setPage(1); }}>
                   <SelectTrigger className="h-9 w-[85px] bg-slate-50 border-slate-200 text-xs font-normal text-slate-600">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="5">5/{intl.formatMessage({ id: 'opco.pagination.items' }).substring(0, 2)}</SelectItem>
                      <SelectItem value="10">10/{intl.formatMessage({ id: 'opco.pagination.items' }).substring(0, 2)}</SelectItem>
                      <SelectItem value="20">20/{intl.formatMessage({ id: 'opco.pagination.items' }).substring(0, 2)}</SelectItem>
                      <SelectItem value="50">50/{intl.formatMessage({ id: 'opco.pagination.items' }).substring(0, 2)}</SelectItem>
                   </SelectContent>
                </Select>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 font-normal text-lg text-slate-800">
                <Plus className="w-5 h-5 text-emerald-500" />
                {intl.formatMessage({ id: 'users.create_title' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setCreateLoading(true);
                try {
                  const res = await userService.createUser(createFormData as any);
                  toast.success(intl.formatMessage({ id: 'users.create_success' }), {
                    description: res?.password ? `${intl.formatMessage({ id: 'users.password_label' })}: ${res.password}` : '',
                    duration: 10000
                  });
                  setShowCreateModal(false);
                  fetchUsers();
                } catch (err: any) {
                  toast.error(err.message || 'Error');
                } finally {
                  setCreateLoading(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
                    <Input 
                      value={createFormData.business_partner_name}
                      onChange={e => setCreateFormData(p => ({...p, business_partner_name: e.target.value}))}
                      required
                      className="h-11 font-normal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.email_ad' })}</Label>
                    <Input 
                      type="email"
                      value={createFormData.user_ad}
                      onChange={e => setCreateFormData(p => ({...p, user_ad: e.target.value}))}
                      required
                      className="h-11 font-normal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                    <Select value={createFormData.region} onValueChange={val => setCreateFormData(p => ({...p, region: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                    <Select value={createFormData.profil_id} onValueChange={val => setCreateFormData(p => ({...p, profil_id: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_profile' })} /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => <SelectItem key={p.PROFIL_ID} value={String(p.PROFIL_ID)}>{p.CODE_PROFIL}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'inventory.table.entity' })}</Label>
                    <Select value={createFormData.legal_entity_key} onValueChange={val => setCreateFormData(p => ({...p, legal_entity_key: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue placeholder={intl.formatMessage({ id: 'inventory.table.entity' })} /></SelectTrigger>
                      <SelectContent>
                        {legalEntities.map(le => <SelectItem key={le.legal_entity_key} value={String(le.legal_entity_key)}>{le.legal_entity_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'loans.table.channel' })}</Label>
                    <Select value={createFormData.customer_channel} onValueChange={val => setCreateFormData(p => ({...p, customer_channel: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {customerChannels.map(ch => (
                           <SelectItem key={ch} value={ch}>
                             {ch && ch.length > 0 ? ch.charAt(0).toUpperCase() + ch.slice(1) : ch}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 h-11 font-normal" onClick={() => setShowCreateModal(false)}>{intl.formatMessage({ id: 'users.cancel' })}</Button>
                  <Button type="submit" className="flex-1 h-11 text-white font-normal" style={{ backgroundColor: primaryColor }} disabled={createLoading}>
                    {createLoading ? intl.formatMessage({ id: 'users.creating' }) : intl.formatMessage({ id: 'users.create_btn' })}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 font-normal text-lg text-slate-800">
                <Edit2 className="w-5 h-5 text-blue-500" />
                {intl.formatMessage({ id: 'users.edit_title' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setEditLoading(true);
                try {
                  await userService.updateUser(editFormData.business_partner_key, editFormData as any, false);
                  toast.success(intl.formatMessage({ id: 'users.update_success' }));
                  setShowEditModal(false);
                  fetchUsers();
                } catch (err: any) {
                  toast.error(err.message || 'Error');
                } finally {
                  setEditLoading(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
                    <Input value={editFormData.business_partner_name} onChange={e => setEditFormData(p => ({...p, business_partner_name: e.target.value}))} required className="h-11 font-normal" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.email_ad' })}</Label>
                    <Input type="email" value={editFormData.user_ad} onChange={e => setEditFormData(p => ({...p, user_ad: e.target.value}))} required disabled className="h-11 font-normal bg-slate-50 cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                    <Select value={editFormData.region} onValueChange={val => setEditFormData(p => ({...p, region: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                    <Select value={editFormData.profil_id} onValueChange={val => setEditFormData(p => ({...p, profil_id: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => <SelectItem key={p.PROFIL_ID} value={String(p.PROFIL_ID)}>{p.CODE_PROFIL}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'users.table.status' })}</Label>
                    <Select value={editFormData.business_partner_status} onValueChange={val => setEditFormData(p => ({...p, business_partner_status: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{intl.formatMessage({ id: 'opco.active' })}</SelectItem>
                        <SelectItem value="inactive">{intl.formatMessage({ id: 'opco.inactive' })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-normal uppercase text-slate-400">{intl.formatMessage({ id: 'loans.table.channel' })}</Label>
                    <Select value={editFormData.customer_channel} onValueChange={val => setEditFormData(p => ({...p, customer_channel: val}))}>
                      <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {customerChannels.map(ch => (
                           <SelectItem key={ch} value={ch}>
                             {ch && ch.length > 0 ? ch.charAt(0).toUpperCase() + ch.slice(1) : ch}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 h-11 font-normal" onClick={() => setShowEditModal(false)}>{intl.formatMessage({ id: 'users.cancel' })}</Button>
                  <Button type="submit" className="flex-1 h-11 text-white font-normal" style={{ backgroundColor: primaryColor }} disabled={editLoading}>
                    {editLoading ? intl.formatMessage({ id: 'users.updating' }) : intl.formatMessage({ id: 'users.update_btn' })}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 font-normal text-lg text-slate-800">
                <Key className="w-5 h-5 text-amber-500" />
                {intl.formatMessage({ id: 'users.reset_password' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-normal uppercase text-slate-400">
                    {intl.formatMessage({ id: 'users.reset_password_desc' }, { name: selectedUser?.business_partner_name })}
                  </Label>
                  <Input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-11 font-normal"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 h-11 font-normal" onClick={() => setShowResetModal(false)}>{intl.formatMessage({ id: 'users.cancel' })}</Button>
                  <Button type="submit" className="flex-1 h-11 text-white font-normal" style={{ backgroundColor: primaryColor }} disabled={resetLoading}>
                    {resetLoading ? intl.formatMessage({ id: 'users.updating' }) : intl.formatMessage({ id: 'users.update_btn' })}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
