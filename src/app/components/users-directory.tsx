import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router';
import { Users, Package, FileText, ChevronRight, Search, Globe } from 'lucide-react';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { usePartnerContext } from '../contexts/PartnerContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';

export function UsersStockDirectory() {
  const intl = useIntl();
  return <UsersDirectory targetRoute="/stock-management" title={intl.formatMessage({ id: 'directory.stock' })} icon={Package} />;
}

export function UsersLoansDirectory() {
  const intl = useIntl();
  return <UsersDirectory targetRoute="/loans" title={intl.formatMessage({ id: 'directory.loans' })} icon={FileText} />;
}

export function UsersDirectory({ targetRoute, title, icon: Icon }: { targetRoute: string, title: string, icon: React.ElementType }) {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const navigate = useNavigate();
  const { availablePartners, setSelectedPartner, loadingPartners } = usePartnerContext();
  const [searchTerm, setSearchTerm] = useState('');

  // When opening the directory, clear any actively impersonated user from the dropdown 
  // so we are choosing completely fresh. 
  // Optionally, we could keep it, but clearing it makes sense for a "directory" view.
  useEffect(() => {
    setSelectedPartner(null);
  }, []);

  const handleSelectUser = (partner: any) => {
    setSelectedPartner(partner);
    navigate(targetRoute);
  };

  const filteredPartners = availablePartners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.region && p.region.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 w-full max-w-4xl mx-auto space-y-6 min-h-[calc(100vh-120px)] flex flex-col">
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="space-y-4 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{intl.formatMessage({ id: 'directory.select_user' }, { title })}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {intl.formatMessage({ id: 'directory.select_user_desc' }, { title: title.toLowerCase() })}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={intl.formatMessage({ id: 'directory.search_placeholder' })} 
              className="pl-10 h-11 bg-slate-50 border-slate-200"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loadingPartners ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">{intl.formatMessage({ id: 'users.none_found' })}</h3>
              <p className="text-slate-500 mt-1">{intl.formatMessage({ id: 'users.none_found_desc' })}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              <button
                onClick={() => handleSelectUser(null)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {intl.formatMessage({ id: 'directory.global_view' })}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{intl.formatMessage({ id: 'directory.global_view_desc' })}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </button>

              {filteredPartners.map(partner => (
                <button
                  key={partner.id}
                  onClick={() => handleSelectUser(partner)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-bold text-lg">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {partner.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded">
                          {partner.region || intl.formatMessage({ id: 'directory.no_region' })}
                        </span>
                        {partner.role && (
                          <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                            partner.role.includes('OPCO') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            partner.role.includes('DDM') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            partner.role.includes('ADMIN') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {partner.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* FOOTER */}
      <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mt-auto pt-10 opacity-40">
        <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
      </div>
    </div>
  );
}
