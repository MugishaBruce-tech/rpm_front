import React, { useEffect, useState } from 'react';
import { getAuditLogs, AuditLogItem } from '../services/auditService';
import { format } from 'date-fns';
import { History, User as UserIcon, MapPin, Code, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Filter, RotateCcw, Calendar, Search } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { useIntl } from 'react-intl';

const AuditLogs: React.FC = () => {
  const intl = useIntl();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userKey: '',
    region: ''
  });

  const [partners, setPartners] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  const fetchLogs = async (page: number, currentFilters = filters) => {
    setLoading(true);
    try {
      const resp = await getAuditLogs(page, pagination.limit, currentFilters);
      setLogs(resp.result.logs);
      setPagination(resp.result.pagination);
    } catch (err) {
      console.error("Error fetching audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const regionList = await dashboardService.getRegions();
      // Ensure unique regions to avoid key warnings
      const uniqueRegions = Array.from(new Set(regionList));
      setRegions(uniqueRegions);
      
      const userResp = await dashboardService.getUsersList({ limit: 1000 });
      setPartners(userResp.users || []);
    };
    init();
    fetchLogs(1);
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs(1, filters);
  };

  const clearFilters = () => {
    const reset = { startDate: '', endDate: '', userKey: '', region: '' };
    setFilters(reset);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs(1, reset);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status >= 400 && status < 500) return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-rose-500" />;
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      POST: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      DELETE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[method] || 'bg-slate-500/10 text-slate-500'}`}>
        {method}
      </span>
    );
  };

  return (
    <div className="p-4 w-full h-full space-y-4 bg-slate-50/50">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Logs</h1>
              <p className="text-xs text-slate-500 font-medium">{intl.formatMessage({ id: 'dashboard.monitoring_desc' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Events</span>
              <p className="text-lg font-black text-slate-900 leading-none">{pagination.total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> From
            </label>
            <input 
              type="date" 
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> To
            </label>
            <input 
              type="date" 
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" /> User
            </label>
            <select 
              name="userKey"
              value={filters.userKey}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="">All Users</option>
              {partners.map((p, idx) => (
                <option key={`partner-${p.business_partner_key || idx}-${idx}`} value={p.business_partner_key}>
                  {p.business_partner_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Region
            </label>
            <select 
              name="region"
              value={filters.region}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="">All Regions</option>
              {regions.map((r, idx) => (
                <option key={`region-${r}-${idx}`} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={applyFilters}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-emerald-200"
            >
              <Search className="w-4 h-4" /> Filter
            </button>
            <button 
              onClick={clearFilters}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-all active:scale-95"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-5 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-widest">User Profile</th>
                <th className="px-5 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-widest">Activity Description</th>
                <th className="px-5 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-5 py-4 text-[11px] font-medium text-slate-400 uppercase tracking-widest">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-5 py-4">
                      <div className="h-4 bg-slate-50 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No activity records found in the database</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={`${log.audit_id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-600">
                          {format(new Date(log.created_at), 'dd MMM yyyy')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-light">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-white transition-colors">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-slate-700 line-clamp-1">{log.user?.business_partner_name || 'System'}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{log.user?.profil?.CODE_PROFIL || 'ROOT'}</p>
                             {log.user?.region && (
                               <>
                                 <span className="text-slate-300">•</span>
                                 <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-1 rounded">{log.user.region}</span>
                               </>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        {getMethodBadge(log.method)}
                        <code className="text-[10px] text-slate-300 font-normal">#{log.audit_id}</code>
                      </div>
                      <p className="text-[14px] font-normal text-slate-600 leading-snug">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-2 mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Code className="w-3 h-3 text-slate-400" />
                        <p className="text-[11px] font-normal text-slate-400 truncate max-w-[200px]" title={log.path}>
                          {log.path.split('?')[0]}
                        </p>
                        {log.payload && (
                          <span 
                            className="text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded cursor-help font-medium uppercase tracking-tight border border-slate-100"
                            title={log.payload}
                          >
                            Data
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-50/50 px-2.5 py-1 rounded border border-slate-100">
                        {getStatusIcon(log.status_code)}
                        <span className="text-xs font-medium text-slate-500">{log.status_code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-light">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        {log.ip_address}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">
            Page <span className="text-slate-900">{pagination.page}</span> of <span className="text-slate-900">{pagination.totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
