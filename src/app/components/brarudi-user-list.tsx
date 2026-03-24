import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { ProtectedResource } from './ui/ProtectedResource';
import { Plus, Users, Edit2, Trash, History, Clock, Save, ShieldCheck, Mail, MapPin, Key, Download } from 'lucide-react';
import { authService } from '../services/authService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// @ts-ignore
import headerImageLogo from '../../assets/logo3.png';

export function BrarudiUserList() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Pagination and filtering state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create User modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  
  const [createFormData, setCreateFormData] = useState({
    business_partner_name: '',
    user_ad: '',
    region: '',
    profil_id: '',
    is_internal: true
  });

  // Edit User modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    business_partner_key: '',
    business_partner_name: '',
    user_ad: '',
    region: '',
    profil_id: '',
    business_partner_status: 'active',
    is_internal: true
  });

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, search, regionFilter, statusFilter]);

  const fetchMetadata = async () => {
    try {
      setMetadataLoading(true);
      const metadata = await userService.getMetadata();
      const internalProfiles = (metadata.profils || []).filter((p: any) => 
        ['MD_AGENT', 'OPCO_USER', 'DDM'].includes(p.CODE_PROFIL)
      );
      setProfiles(internalProfiles);
      setRegions(metadata.regions || []);
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
        region: regionFilter === 'all' ? undefined : regionFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        is_internal: true
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleEditClick = (user: any) => {
    setEditFormData({
      business_partner_key: user.business_partner_key.toString(),
      business_partner_name: user.business_partner_name || '',
      user_ad: user.user_ad || '',
      region: user.region || '',
      profil_id: user.profil_id?.toString() || '',
      business_partner_status: user.business_partner_status || 'active',
      is_internal: true
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
        await userService.deleteUser(id.toString(), true);
        setUsers(users.filter(u => u.business_partner_key !== id));
        toast.success(intl.formatMessage({ id: 'users.delete_success' }, { name }));
      } catch (err: any) {
        toast.error(err.message || 'Error');
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleResetClick = (user: any) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      setResetLoading(true);
      await userService.resetPassword(selectedUser.business_partner_key.toString(), newPassword, true);
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
        limit: 1000,
        search,
        region: regionFilter === 'all' ? undefined : regionFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        is_internal: true
      });
      
      const allUsers = fullResponse.users;
      if (allUsers.length === 0) {
        toast.error(intl.formatMessage({ id: 'export.no_data' }));
        return;
      }

      const regionCounts: Record<string, number> = {};
      allUsers.forEach((u: any) => {
        const r = u.region || 'Global';
        regionCounts[r] = (regionCounts[r] || 0) + 1;
      });
      const chartDataArr = Object.entries(regionCounts).map(([name, count]) => ({ name, count }));

      toast.promise(new Promise(async (resolve, reject) => {
        try {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Users');

          worksheet.mergeCells('A1:F4');
          const titleCell = worksheet.getCell('A1');
          titleCell.value = 'BRARUDI RPM TRACKER - RÉPERTOIRE UTILISATEURS BRARUDI';
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
            console.error('Failed to load logo:', e);
          }

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
            ctx.fillStyle = i % 2 === 0 ? '#008200' : '#D71921';
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
          header.values = ['NO', 'NOM COMPLET', 'EMAIL/AD', 'RÉGION', 'PROFIL', 'STATUT'];
          header.eachCell(c => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
            c.alignment = { horizontal: 'center' };
          });

          allUsers.forEach((u: any, i: number) => {
            const r = worksheet.getRow(startRow + 1 + i);
            r.values = [i + 1, u.business_partner_name, u.user_ad, u.region || 'Global', u.profil?.CODE_PROFIL || u.role, u.business_partner_status.toUpperCase()];
            if (i % 2 === 1) r.eachCell((c: any) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } });
            r.eachCell((c: any) => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
          });

          worksheet.getColumn(1).width = 5;
          worksheet.getColumn(2).width = 30;
          worksheet.getColumn(3).width = 30;
          worksheet.getColumn(4).width = 15;
          worksheet.getColumn(5).width = 15;
          worksheet.getColumn(6).width = 12;

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blob, `utilisateurs-brarudi-${new Date().toISOString().slice(0,10)}.xlsx`);
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

  const selectedProfileCode = (pid: string) => {
    return profiles.find(p => String(p.PROFIL_ID) === String(pid))?.CODE_PROFIL;
  };

  return (
    <div className="p-4 md:p-6 w-full space-y-4">
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-2.5">
          <CardTitle className="text-base font-normal text-slate-900 tracking-tight">
             {intl.formatMessage({ id: 'sidebar.brarudi_users' })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 border border-slate-200"
              title={intl.formatMessage({ id: 'dashboard.export_excel' })}
            >
              <Download className="w-4 h-4" />
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="text-white font-normal rounded-md px-4 h-8 text-xs"
              style={{ backgroundColor: '#10b981' }} // Match the green from image
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {intl.formatMessage({ id: 'users.add_new' })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex flex-col md:flex-row gap-2.5 mb-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-xl">
               <Input
                placeholder={intl.formatMessage({ id: 'users.search_placeholder' })}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-slate-50 border-slate-200 font-normal h-8 text-xs"
              />
              <Button type="submit" variant="secondary" className="px-4 h-8 text-xs font-normal bg-slate-100 border-slate-200 text-slate-700">
                {intl.formatMessage({ id: 'users.search_btn' })}
              </Button>
            </form>
            
            <div className="flex gap-2">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[130px] h-8 bg-slate-50 border-slate-200 text-slate-500 font-normal text-xs">
                  <SelectValue placeholder={intl.formatMessage({ id: 'users.all_regions' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'users.all_regions' })}</SelectItem>
                  {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 bg-slate-50 border-slate-200 text-slate-500 font-normal text-xs">
                  <SelectValue placeholder={intl.formatMessage({ id: 'users.all_status' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{intl.formatMessage({ id: 'users.all_status' })}</SelectItem>
                  <SelectItem value="active">{intl.formatMessage({ id: 'opco.active' })}</SelectItem>
                  <SelectItem value="inactive">{intl.formatMessage({ id: 'opco.inactive' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px]">{intl.formatMessage({ id: 'users.table.name' })}</th>
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px] text-center">{intl.formatMessage({ id: 'users.table.email' })}</th>
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px] text-center">{intl.formatMessage({ id: 'users.table.region' })}</th>
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px] text-center">{intl.formatMessage({ id: 'users.form.profile' })}</th>
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px] text-center">{intl.formatMessage({ id: 'users.table.last_login' })}</th>
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px] text-center">{intl.formatMessage({ id: 'users.table.status' })}</th>
                  <th className="pb-4 pt-2 font-normal text-slate-500 uppercase tracking-tight text-[10px] text-right">{intl.formatMessage({ id: 'users.table.actions' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="py-4"><Skeleton className="h-10 w-full" /></td></tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-normal uppercase tracking-widest text-xs">{intl.formatMessage({ id: 'users.none_found' })}</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.business_partner_key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                             <Users className="w-4 h-4" />
                          </div>
                          <span className="font-normal text-slate-900">{user.business_partner_name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center text-slate-600 font-normal">
                        {user.user_ad}
                      </td>
                      <td className="py-4 text-center text-slate-600 font-normal">
                        {user.region || '-'}
                      </td>
                      <td className="py-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-normal uppercase bg-rose-50 text-rose-600 border border-rose-100">
                          {user.profil?.CODE_PROFIL || user.role}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {user.last_login_at ? (
                          <div className="flex flex-col items-center leading-tight">
                             <div className="flex items-center gap-1 text-[11px] font-normal text-slate-700">
                               <Clock className="w-3 h-3 text-slate-400" />
                               {new Date(user.last_login_at).toLocaleDateString()}
                             </div>
                             <span className="text-[10px] text-slate-400 font-normal">{new Date(user.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                           <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-normal uppercase ${
                          user.business_partner_status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {user.business_partner_status === 'active' ? intl.formatMessage({ id: 'opco.active' }) : intl.formatMessage({ id: 'opco.inactive' })}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <button 
                             className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-600"
                             title={intl.formatMessage({ id: 'users.tooltip.history' })}
                           >
                             <History className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleResetClick(user)}
                             className="p-1.5 hover:bg-amber-50 rounded transition-colors text-amber-600"
                             title={intl.formatMessage({ id: 'users.reset_password' })}
                           >
                             <Key className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleEditClick(user)} 
                             className="p-1.5 hover:bg-blue-50 rounded transition-colors text-blue-600"
                             title={intl.formatMessage({ id: 'users.tooltip.edit' })}
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDelete(user.business_partner_key, user.business_partner_name)} 
                             className="p-1.5 hover:bg-rose-50 rounded transition-colors text-rose-600"
                             title={intl.formatMessage({ id: 'users.tooltip.delete' })}
                           >
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

      {/* Modals remain mostly the same but with style tweaks for consistency */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl gap-0">
            <CardHeader className="pt-4 pb-2 border-b border-slate-50">
              <CardTitle className="flex items-center gap-2 text-slate-800 font-normal text-lg">
                <Plus className="w-5 h-5 text-emerald-500" />
                {intl.formatMessage({ id: 'users.create_title' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setCreateLoading(true);
                try {
                  const res = await userService.createUser(createFormData as any);
                  toast.success(intl.formatMessage({ id: 'users.create_success' }), {
                    description: res?.password ? `${intl.formatMessage({ id: 'users.password_label' })}: ${res.password}` : '',
                    duration: 8000
                  });
                  setShowCreateModal(false);
                  fetchUsers();
                } catch (err: any) {
                  toast.error(err.message || 'Error');
                } finally {
                  setCreateLoading(false);
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
                  <Input 
                    value={createFormData.business_partner_name}
                    onChange={e => setCreateFormData(p => ({...p, business_partner_name: e.target.value}))}
                    required
                    className="h-11 font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.email_ad' })}</Label>
                  <Input 
                    type="email"
                    value={createFormData.user_ad}
                    onChange={e => setCreateFormData(p => ({...p, user_ad: e.target.value}))}
                    required
                    className="h-11 font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                  <Select 
                    value={createFormData.profil_id}
                    onValueChange={val => setCreateFormData(p => ({...p, profil_id: val}))}
                  >
                    <SelectTrigger className="h-11 font-normal"><SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_profile' })} /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.PROFIL_ID} value={String(p.PROFIL_ID)}>{p.CODE_PROFIL}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedProfileCode(createFormData.profil_id) === 'DDM' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                    <Select 
                      value={createFormData.region}
                      onValueChange={val => setCreateFormData(p => ({...p, region: val}))}
                    >
                      <SelectTrigger className="h-11 font-normal"><SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_region' })} /></SelectTrigger>
                      <SelectContent>
                        {regions.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
          <Card className="w-full max-w-md shadow-2xl gap-0">
            <CardHeader className="pt-4 pb-2 border-b border-slate-50">
              <CardTitle className="flex items-center gap-2 text-slate-800 font-normal text-lg">
                <Edit2 className="w-5 h-5 text-blue-500" />
                {intl.formatMessage({ id: 'users.edit_title' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setEditLoading(true);
                try {
                  await userService.updateUser(editFormData.business_partner_key, editFormData as any, true);
                  toast.success(intl.formatMessage({ id: 'users.update_success' }));
                  setShowEditModal(false);
                  fetchUsers();
                } catch (err: any) {
                  toast.error(err.message || 'Error');
                } finally {
                  setEditLoading(false);
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
                  <Input 
                    value={editFormData.business_partner_name}
                    onChange={e => setEditFormData(p => ({...p, business_partner_name: e.target.value}))}
                    required
                    className="h-11 font-normal"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.email_ad' })}</Label>
                  <Input 
                    type="email"
                    value={editFormData.user_ad}
                    onChange={e => setEditFormData(p => ({...p, user_ad: e.target.value}))}
                    required
                    disabled
                    className="h-11 font-normal bg-slate-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                  <Select 
                    value={editFormData.profil_id}
                    onValueChange={val => setEditFormData(p => ({...p, profil_id: val}))}
                  >
                    <SelectTrigger className="h-11 font-normal"><SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_profile' })} /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.PROFIL_ID} value={String(p.PROFIL_ID)}>{p.CODE_PROFIL}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProfileCode(editFormData.profil_id) === 'DDM' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                    <Select 
                      value={editFormData.region}
                      onValueChange={val => setEditFormData(p => ({...p, region: val}))}
                    >
                      <SelectTrigger className="h-11 font-normal"><SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_region' })} /></SelectTrigger>
                      <SelectContent>
                        {regions.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">{intl.formatMessage({ id: 'users.table.status' })}</Label>
                  <Select 
                    value={editFormData.business_partner_status}
                    onValueChange={val => setEditFormData(p => ({...p, business_partner_status: val}))}
                  >
                    <SelectTrigger className="h-11 font-normal"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{intl.formatMessage({ id: 'opco.active' })}</SelectItem>
                      <SelectItem value="inactive">{intl.formatMessage({ id: 'opco.inactive' })}</SelectItem>
                    </SelectContent>
                  </Select>
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

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl gap-0">
            <CardHeader className="pt-4 pb-2 border-b border-slate-50">
              <CardTitle className="flex items-center gap-2 text-slate-800 font-normal text-lg">
                <Key className="w-5 h-5 text-amber-500" />
                {intl.formatMessage({ id: 'users.reset_password' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-normal text-slate-500 uppercase">
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
