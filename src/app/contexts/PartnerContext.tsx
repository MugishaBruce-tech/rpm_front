import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { usePermissions } from './PermissionsContext';

interface Partner {
  id: string;
  name: string;
  region?: string;
  role?: string;
  type?: string;
  channel?: string;
  status?: string;
  email?: string;
}

interface PartnerContextType {
  selectedPartner: Partner | null;
  setSelectedPartner: (partner: Partner | null) => void;
  availablePartners: Partner[];
  loadingPartners: boolean;
  // Region control — only meaningful for OPCO_USER
  selectedRegion: string | null;
  setSelectedRegion: (region: string | null) => void;
  availableRegions: string[];
  isOPCO: boolean;
  isDDM: boolean;
  userRegion: string | null;
}

const PartnerContext = createContext<PartnerContextType>({
  selectedPartner: null,
  setSelectedPartner: () => {},
  availablePartners: [],
  loadingPartners: false,
  selectedRegion: null,
  setSelectedRegion: () => {},
  availableRegions: [],
  isOPCO: false,
  isDDM: false,
  userRegion: null,
});

export const PartnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // Region state — OPCO_USER can change this, DDM cannot
  const [selectedRegion, setSelectedRegionState] = useState<string | null>(null);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser?.role || '';
  const userRegion = currentUser?.region || null;
  const isOPCO = userRole === 'OPCO_USER';
  const isDDM = userRole === 'DDM';

  // When OPCO changes region, also clear partner selection
  const setSelectedRegion = useCallback((region: string | null) => {
    setSelectedRegionState(region);
    setSelectedPartner(null);
  }, []);

  // Load available regions (OPCO only)
  useEffect(() => {
    if (isOPCO && !permissionsLoading) {
      dashboardService.getRegions().then(regions => {
        setAvailableRegions(regions);
        // Default to first region if none selected
        if (!selectedRegion && regions.length > 0) {
          setSelectedRegionState(regions[0]);
        }
      });
    }
    // DDM is always locked to their own region — no region switcher
    if (isDDM && userRegion) {
      setSelectedRegionState(userRegion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOPCO, isDDM, permissionsLoading]);

  // Load partners filtered by the currently selected region
  useEffect(() => {
    if (permissionsLoading) return;

    const canSelectPartner = hasPermission('STOCK_VIEW_GLOBAL') || hasPermission('STOCK_VIEW_REGIONAL');

    if (canSelectPartner) {
      const loadPartners = async () => {
        setLoadingPartners(true);
        try {
          const activeRegion = selectedRegion || userRegion;
          const response = await dashboardService.getUsersList({ limit: 1000, region: activeRegion || undefined });
          const users = response.users || [];

          const distributors = users.map((u: any) => ({
            id: u.business_partner_key.toString(),
            name: u.business_partner_name,
            region: u.region,
            email: u.user_ad,
            status: (u.business_partner_status || 'active'),
            channel: u.customer_channel || u.business_partner_type,
            role: u.profil?.CODE_PROFIL || u.business_partner_type || 'PARTNER'
          }));

          // Apply region filter client-side as a safety layer
          let filtered = distributors;
          if (activeRegion) {
            filtered = distributors.filter((p: Partner) =>
              (p.region || '').toLowerCase() === activeRegion.toLowerCase()
            );
          }

          // If selected partner is not in the new filtered list, reset it
          if (selectedPartner && !filtered.find((p: Partner) => p.id === selectedPartner.id)) {
            setSelectedPartner(null);
          }

          setAvailablePartners(filtered);
        } catch (err) {
          console.error('Failed to load partners/distributors', err);
        } finally {
          setLoadingPartners(false);
        }
      };

      loadPartners();
    } else {
      const user = authService.getCurrentUser();
      if (user) {
        setSelectedPartner({ id: user.id, name: user.name, region: user.region });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, permissionsLoading, selectedRegion]);

  return (
    <PartnerContext.Provider value={{
      selectedPartner,
      setSelectedPartner,
      availablePartners,
      loadingPartners,
      selectedRegion,
      setSelectedRegion,
      availableRegions,
      isOPCO,
      isDDM,
      userRegion
    }}>
      {children}
    </PartnerContext.Provider>
  );
};

export const usePartnerContext = () => useContext(PartnerContext);
