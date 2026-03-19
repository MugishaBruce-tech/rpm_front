import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  isMD: boolean;
  isDDM: boolean;
  userRegion: string | null;
}

const PartnerContext = createContext<PartnerContextType>({
  selectedPartner: null,
  setSelectedPartner: () => { },
  availablePartners: [],
  loadingPartners: false,
  selectedRegion: null,
  setSelectedRegion: () => { },
  availableRegions: [],
  isOPCO: false,
  isMD: false,
  isDDM: false,
  userRegion: null,
});

export const PartnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  // Initialize from localStorage
  const [selectedPartner, setSelectedPartnerState] = useState<Partner | null>(() => {
    const saved = localStorage.getItem('rpm-tracker-selected-partner');
    return saved ? JSON.parse(saved) : null;
  });

  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // Region state — OPCO_USER can change this, DDM cannot
  const [selectedRegion, setSelectedRegionState] = useState<string | null>(() => {
    return localStorage.getItem('rpm-tracker-selected-region');
  });
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser?.role || '';
  const userRegion = currentUser?.region || null;
  const isOPCO = userRole === 'OPCO_USER';
  const isMD = userRole === 'MD_AGENT' || userRole === 'ADMIN';
  const isDDM = userRole === 'DDM';

  const setSelectedPartner = useCallback((partner: Partner | null) => {
    setSelectedPartnerState(partner);
    if (partner) {
      localStorage.setItem('rpm-tracker-selected-partner', JSON.stringify(partner));
    } else {
      localStorage.removeItem('rpm-tracker-selected-partner');
    }
  }, []);

  // When region changes, also clear partner selection
  const setSelectedRegion = useCallback((region: string | null) => {
    setSelectedRegionState(region);
    setSelectedPartner(null);
    if (region) {
      localStorage.setItem('rpm-tracker-selected-region', region);
    } else {
      localStorage.removeItem('rpm-tracker-selected-region');
    }
  }, [setSelectedPartner]);

  // Load available regions (OPCO and MD/ADMIN)
  useEffect(() => {
    if ((isOPCO || isMD) && !permissionsLoading) {
      dashboardService.getRegions().then(regions => {
        setAvailableRegions(regions);
        // Only set default if nothing is selected or saved
        if (!selectedRegion && regions.length > 0 && isOPCO) {
          setSelectedRegion(regions[0]);
        }
      });
    }
    // DDM is always locked to their own region — no region switcher
    if (isDDM && userRegion && selectedRegion !== userRegion) {
      setSelectedRegion(userRegion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOPCO, isMD, isDDM, permissionsLoading, userRegion]);

  // Load partners filtered by the currently selected region
  useEffect(() => {
    if (permissionsLoading) return;

    const canSelectPartner = hasPermission('STOCK_VIEW_GLOBAL') || hasPermission('STOCK_VIEW_REGIONAL');

    if (canSelectPartner) {
      const loadPartners = async () => {
        setLoadingPartners(true);
        try {
          // Determine which region(s) to load:
          // - If Global/OPCO explicitly selected null (All Regions), load ALL partners (no region filter)
          // - If Global/OPCO selected a specific region, load that region
          // - If DDM, load their locked region
          const isLoadingAllRegions = (isOPCO || isMD) && selectedRegion === null;
          const activeRegion = selectedRegion || (isDDM ? userRegion : undefined);

          const response = await dashboardService.getUsersList({
            limit: 1000,
            region: isLoadingAllRegions ? undefined : activeRegion
          });
          const users = response.users || [];

          // Only include SUB_D or external partners, exclude internal roles
          const distributors = users
            .filter((u: any) => {
              const profileCode = u.profil?.CODE_PROFIL;
              return profileCode === 'SUB_D';
            })
            .map((u: any) => ({
              id: u.business_partner_key.toString(),
              name: u.business_partner_name,
              region: u.region,
              email: u.user_ad,
              status: (u.business_partner_status || 'active'),
              channel: u.customer_channel || u.business_partner_type,
              role: u.profil?.CODE_PROFIL || u.business_partner_type || 'PARTNER'
            }));

          // Apply region filter client-side as a safety layer ONLY if a specific region is selected
          let filtered = distributors;
          if (activeRegion && !isLoadingAllRegions) {
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

  const contextValue = useMemo(() => ({
    selectedPartner,
    setSelectedPartner,
    availablePartners,
    loadingPartners,
    selectedRegion,
    setSelectedRegion,
    availableRegions,
    isOPCO,
    isMD,
    isDDM,
    userRegion
  }), [selectedPartner, setSelectedPartner, availablePartners, loadingPartners, selectedRegion, setSelectedRegion, availableRegions, isOPCO, isMD, isDDM, userRegion]);

  return (
    <PartnerContext.Provider value={contextValue}>
      {children}
    </PartnerContext.Provider>
  );
};

export const usePartnerContext = () => useContext(PartnerContext);
