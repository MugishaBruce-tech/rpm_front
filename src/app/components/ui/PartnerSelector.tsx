import React from 'react';
import { usePartnerContext } from '../../contexts/PartnerContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export function PartnerSelector() {
  const { hasPermission } = usePermissions();
  const { availablePartners, selectedPartner, setSelectedPartner, loadingPartners } = usePartnerContext();

  // If the user isn't allowed to view other users' data, don't render the selector
  const canSwitchContext = hasPermission('STOCK_VIEW_GLOBAL') || hasPermission('STOCK_VIEW_REGIONAL');
  
  if (!canSwitchContext) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        Viewing Data For:
      </span>
      <div className="w-[300px]">
        <Select
          value={selectedPartner?.id || 'all'}
          onValueChange={(val) => {
            if (val === 'all') {
              setSelectedPartner(null);
            } else {
              const partner = availablePartners.find(p => p.id === val);
              setSelectedPartner(partner || null);
            }
          }}
          disabled={loadingPartners}
        >
          <SelectTrigger className="h-9 w-full bg-white border-slate-200">
            <SelectValue placeholder={loadingPartners ? "Loading users..." : "Global View (All Partners)"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-semibold text-indigo-700">
              🌍 Global View (All Partners)
            </SelectItem>
            {availablePartners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.name} {partner.region ? `(${partner.region})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
