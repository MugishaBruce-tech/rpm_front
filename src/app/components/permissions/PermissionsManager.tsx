import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Layers, ShieldCheck, Save } from 'lucide-react';

// Simulated data based on your DB screenshot
const PROFILES = [
  { id: 1, code: 'OPCO_USER', label: 'OpCo User', status: 'active' },
  { id: 2, code: 'MD_AGENT', label: 'MD Agent', status: 'active' },
  { id: 3, code: 'SUB_D', label: 'Sub-Distributor', status: 'active' },
  { id: 4, code: 'DDM', label: 'District Manager', status: 'active' },
];

const ACTIONS = [
  { id: 'view_all_data', label: 'View All App Data' },
  { id: 'edit_all_data', label: 'Edit All App Data' },
  { id: 'manage_all_users', label: 'Manage Global Users' },
  { id: 'manage_region_users', label: 'Manage Regional Users' },
  { id: 'view_own_data', label: 'View Own Data' },
  { id: 'edit_own_data', label: 'Edit Own Data' },
];

export function PermissionsManager() {
  const intl = useIntl();
  const [permissionsMap, setPermissionsMap] = useState<Record<string, Record<number, boolean>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Mock initial check states 
    setPermissionsMap({
      view_all_data: { 1: true, 2: true, 3: false, 4: false },
      edit_all_data: { 1: false, 2: true, 3: false, 4: false },
      manage_all_users: { 1: false, 2: true, 3: false, 4: false },
      manage_region_users: { 1: false, 2: true, 3: false, 4: true },
      view_own_data: { 1: true, 2: true, 3: true, 4: true },
      edit_own_data: { 1: false, 2: true, 3: true, 4: true },
    });
  }, []);

  const handleToggle = (actionId: string, profileId: number) => {
    setPermissionsMap(prev => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        [profileId]: !prev[actionId]?.[profileId]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call to save junction table
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    alert(intl.formatMessage({ id: 'permissions.save_success' }));
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-6 max-w-5xl mx-auto my-10">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-md border border-indigo-100">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{intl.formatMessage({ id: 'permissions.title' })}</h2>
            <p className="text-xs text-slate-500 mt-1">{intl.formatMessage({ id: 'permissions.desc' })}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? intl.formatMessage({ id: 'permissions.saving' }) : intl.formatMessage({ id: 'permissions.save_btn' })}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-4 border-b border-r border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase w-1/3">
                {intl.formatMessage({ id: 'permissions.table.action' })}
              </th>
              {PROFILES.map(profile => (
                <th key={profile.id} className="p-4 border-b border-slate-200 bg-slate-50 text-center w-1/6">
                  <div className="text-[11px] font-black text-slate-800 tracking-wider">
                    {profile.code}
                  </div>
                  <span className="text-[9px] text-emerald-600 font-bold uppercase mt-1 inline-block border border-emerald-200 bg-emerald-50 px-1.5 rounded-sm">
                    {profile.status}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ACTIONS.map((action, rowIdx) => (
              <tr key={action.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 border-r border-slate-200">
                  <span className="text-sm font-medium text-slate-700">{intl.formatMessage({ id: `permissions.action.${action.id}` })}</span>
                  <div className="text-[10px] text-slate-400 font-medium font-mono mt-1 w-full truncate">
                    auth_policy.{action.id}
                  </div>
                </td>
                
                {PROFILES.map(profile => {
                  const isChecked = permissionsMap[action.id]?.[profile.id] || false;
                  
                  return (
                    <td key={profile.id} className="p-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={isChecked}
                          onChange={() => handleToggle(action.id, profile.id)}
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 group-hover:ring-4 ring-emerald-500/10 outline-none"></div>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
