import React from 'react';
import { usePartnerContext } from '../../contexts/PartnerContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { MapPin } from 'lucide-react';

export function RegionSelector() {
  const { 
    isOPCO, 
    isMD, 
    availableRegions, 
    selectedRegion, 
    setSelectedRegion 
  } = usePartnerContext();

  // Region switcher is only for Global/OPCO users
  // DDM is locked to their region
  if (!isOPCO && !isMD) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
        <MapPin className="w-3.5 h-3.5 text-rose-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          Region:
        </span>
        <Select
          value={selectedRegion || 'all'}
          onValueChange={(val) => {
            setSelectedRegion(val === 'all' ? null : val);
          }}
        >
          <SelectTrigger className="h-6 min-w-[100px] bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:ring-0">
            <SelectValue placeholder="Global" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-bold">Global</SelectItem>
            {availableRegions.map((region) => (
              <SelectItem key={region} value={region} className="text-xs font-medium">
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
