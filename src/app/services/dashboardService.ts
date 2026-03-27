import { apiRequest } from './api';

export interface InventoryData {
  name: string;
  physical: number;
  loaned: number;
  borrowed: number;
}

export interface ActivityData {
  date: string;
  transactions: number;
}

export interface GanttLoanData {
  id: string;
  name: string;
  start: number;
  end: number;
  color: string;
  custom: {
    status: string;
    region: string;
    feedback: string;
    type: 'inbound' | 'outbound';
    elapsedHours: number;
  };
}

export const dashboardService = {
  async getDashboardStats(params?: string | { partnerKey?: string, region?: string }): Promise<any> {
    try {
      const partnerKey = typeof params === 'string' ? params : params?.partnerKey;
      const region = typeof params === 'object' ? params?.region : undefined;

      const searchParams = new URLSearchParams();
      if (partnerKey) searchParams.append('partnerKey', partnerKey);
      else if (region) searchParams.append('region', region);
      else searchParams.append('global', 'true');

      const response = await apiRequest(`/dashboard/stats?${searchParams.toString()}`);
      return response.result;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },

  async getMaterialMetrics(params?: string | { partnerKey?: string, region?: string, availablePartnerIds?: string[] }): Promise<any[]> {
    try {
      const partnerKey = typeof params === 'string' ? params : params?.partnerKey;
      const region = typeof params === 'object' ? params?.region : undefined;
      const availablePartnerIds = typeof params === 'object' ? params?.availablePartnerIds : undefined;

      const searchParams = new URLSearchParams();
      if (partnerKey) searchParams.append('partnerKey', partnerKey);
      else if (region) searchParams.append('region', region);
      else searchParams.append('global', 'true');

      const [inventoryResponse, materialsResponse] = await Promise.all([
        apiRequest(`/inventory?${searchParams.toString()}`),
        apiRequest('/inventory/materials')
      ]);

      let inventory = inventoryResponse.result || [];
      const allMaterials = materialsResponse.result || [];

      // Only filter manually if we have a list of available partners AND the data isn't already aggregated
      const isAggregated = !!inventoryResponse.label || (inventory.length > 0 && inventory[0].partnerName?.includes('DASHBOARD'));
      
      if (!partnerKey && availablePartnerIds && availablePartnerIds.length > 0 && !isAggregated) {
        const idSet = new Set(availablePartnerIds.map(id => String(id).trim()));
        inventory = inventory.filter((r: any) => {
          const bpKey = r.businessPartnerKey || r.partnerKey || r.partner_key || r.partner_id || r.id || r.customer_id || r.material?.businessPartnerKey;
          return bpKey !== undefined && idSet.has(String(bpKey).trim());
        });
      }

      // Group by material with robust key checking
      const inventoryMap: { [key: string]: number } = {};
      inventory.forEach((record: any) => {
        const mKey = record.materialKey || record.material_key || record.material_id || record.id || record.material?.id;
        if (mKey === undefined || mKey === null) return;

        const key = String(mKey);
        if (!inventoryMap[key]) {
          inventoryMap[key] = 0;
        }

        const qty = record.physicalQty || record.physical_qty || record.stock || record.quantity || 0;
        inventoryMap[key] += Number(qty);
      });

      const colors = ['#168c17', '#1e40af', '#7c3aed', '#0891b2', '#db2777', '#ea580c', '#059669', '#14b8a6', '#15803d', '#0369a1', '#6d28d9', '#ec4899'];

      const finalMaterials = allMaterials.map((material: any, index: number) => {
        const key = String(material.material_key || material.materialKey);
        const value = inventoryMap[key] || 0;
        return {
          code: material.material_name2 || material.material_description || material.global_material_id || `MAT${key}`,
          materialKey: Number(key),
          description: material.material_description || `Material ${key}`,
          sku: material.global_material_id || '',
          value,
          trend: 0,
          color: colors[index % colors.length]
        };
      });

      return finalMaterials;
    } catch (error) {
      console.error('Failed to fetch material metrics:', error);
      throw error;
    }
  },

  async getInventoryData(params?: string | { partnerKey?: string, region?: string }): Promise<InventoryData[]> {
    try {
      const partnerKey = typeof params === 'string' ? params : params?.partnerKey;
      const region = typeof params === 'object' ? params?.region : undefined;

      const searchParams = new URLSearchParams();
      if (partnerKey) searchParams.append('partnerKey', partnerKey);
      else if (region) searchParams.append('region', region);
      else searchParams.append('global', 'true');

      const [inventoryResponse, materialsResponse] = await Promise.all([
        apiRequest(`/inventory?${searchParams.toString()}`),
        apiRequest('/inventory/materials')
      ]);

      let inventoryRecords = inventoryResponse.result || [];
      const materialsList = materialsResponse.result || [];

      // Strict Manual Filter (Safety Layer)
      if (partnerKey) {
        const pKeyStr = String(partnerKey).trim();
        inventoryRecords = inventoryRecords.filter((r: any) =>
          String(r.businessPartnerKey || r.partnerKey || r.partner_key || r.partner_id || r.id || r.customer_id || r.material?.businessPartnerKey).trim() === pKeyStr
        );
      }

      // Create material lookup map
      const materialLookup: { [key: number]: string } = {};
      materialsList.forEach((m: any) => {
        materialLookup[m.material_key] = m.material_description || m.global_material_id || `Material ${m.material_key}`;
      });

      // Group by material
      const materialMap: { [key: string]: InventoryData } = {};

      inventoryRecords.forEach((record: any) => {
        const name = materialLookup[record.materialKey] || record.material?.material_description || record.sku || `Material ${record.materialKey}`;
        if (!materialMap[name]) {
          materialMap[name] = {
            name,
            physical: 0,
            loaned: 0,
            borrowed: 0
          };
        }
        materialMap[name].physical += record.physicalQty;
        materialMap[name].loaned += (record.lentQty || 0);
        materialMap[name].borrowed += (record.borrowedQty || 0);
      });

      return Object.values(materialMap);
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
      throw error;
    }
  },

  async getActivityTrend(params?: string | { partnerKey?: string, region?: string }): Promise<ActivityData[]> {
    try {
      const partnerKey = typeof params === 'string' ? params : params?.partnerKey;
      const region = typeof params === 'object' ? params?.region : undefined;

      const searchParams = new URLSearchParams();
      if (partnerKey) searchParams.append('partnerKey', partnerKey);
      else if (region) searchParams.append('region', region);
      else searchParams.append('global', 'true');

      const response = await apiRequest(`/dashboard/activity?${searchParams.toString()}`);
      const transactions = response.result || [];

      // Group transactions by date for the last 14 days
      const last14Days: ActivityData[] = [];
      const dateMap: { [key: string]: number } = {};

      transactions.forEach((t: any) => {
        const dateStr = new Date(t.created_at).toISOString().split('T')[0];
        dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
      });

      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last14Days.push({
          date: dateStr,
          transactions: dateMap[dateStr] || 0
        });
      }

      return last14Days;
    } catch (error) {
      console.error('Failed to fetch activity trend:', error);
      throw error;
    }
  },

  async getLoanBalances(params?: string | { partnerKey?: string, region?: string }): Promise<any[]> {
    try {
      const partnerKey = typeof params === 'string' ? params : params?.partnerKey;
      const region = typeof params === 'object' ? params?.region : undefined;

      const searchParams = new URLSearchParams();
      if (partnerKey) searchParams.append('partnerKey', partnerKey);
      else if (region) searchParams.append('region', region);
      else searchParams.append('global', 'true');

      const [inventoryResponse, materialsResponse] = await Promise.all([
        apiRequest(`/inventory?${searchParams.toString()}`),
        apiRequest('/inventory/materials')
      ]);

      let inventory = inventoryResponse.result || [];
      const materialsList = materialsResponse.result || [];

      // Strict Manual Filter (Safety Layer)
      if (partnerKey) {
        const pKeyStr = String(partnerKey).trim();
        inventory = inventory.filter((r: any) =>
          String(r.businessPartnerKey || r.partnerKey || r.partner_key || r.partner_id || r.id || r.customer_id || r.material?.businessPartnerKey).trim() === pKeyStr
        );
      }

      // Create material lookup map
      const materialLookup: { [key: number]: string } = {};
      materialsList.forEach((m: any) => {
        materialLookup[m.material_key] = m.material_description || m.global_material_id || `Material ${m.material_key}`;
      });

      // Map materials as basis
      const materialMap: { [key: string]: any } = {};
      materialsList.forEach((m: any) => {
        const name = m.material_description || m.global_material_id || `Material ${m.material_key}`;
        materialMap[name] = {
          materialDescription: name,
          material_name2: m.material_name2,
          physicalQty: 0,
          lentQty: 0,
          borrowedQty: 0,
          netOwned: 0
        };
      });

      inventory.forEach((record: any) => {
        const name = materialLookup[record.materialKey] || record.material?.material_description || record.sku || `Material ${record.materialKey}`;
        if (!materialMap[name]) {
          materialMap[name] = {
            materialDescription: name,
            material_name2: record.material_name2 || record.material?.material_name2,
            physicalQty: 0,
            lentQty: 0,
            borrowedQty: 0,
            netOwned: 0
          };
        }
        materialMap[name].physicalQty += (record.physicalQty || 0);
        materialMap[name].lentQty += (record.lentQty || record.loaned || 0);
        materialMap[name].borrowedQty += (record.borrowedQty || 0);
        materialMap[name].netOwned = materialMap[name].physicalQty + materialMap[name].borrowedQty - materialMap[name].lentQty;
      });

      return Object.values(materialMap);
    } catch (error) {
      console.error('Failed to fetch loan balances:', error);
      throw error;
    }
  },

  async getDetailedLoans(currentUserId: string, partnerKey?: string): Promise<GanttLoanData[]> {
    try {
      const query = partnerKey ? `&partnerKey=${partnerKey}` : '';
      const [response, materialsResponse] = await Promise.all([
        apiRequest(`/loans/?limit=1000&offset=0${query}`),
        apiRequest('/inventory/materials')
      ]);

      const allLoans = Array.isArray(response.result) ? response.result : [];
      const materialsList = Array.isArray(materialsResponse.result) ? materialsResponse.result : [];

      // Build lookup map for full descriptions
      const materialLookup: { [key: number]: string } = {};
      materialsList.forEach((m: any) => {
        materialLookup[m.material_key] = m.material_description || m.global_material_id || m.sku || `Material ${m.material_key}`;
      });

      const today = new Date().getTime();

      // Ensure we have something to show. If no pending/denied, we'll show "Recent Activity"
      let filteredLoans = allLoans.filter((l: any) => {
        const status = (l.bp_loan_status || '').toUpperCase();
        return status === 'PENDING' || status === 'CANCELLED';
      });

      const isShowingActivity = filteredLoans.length === 0;
      if (isShowingActivity) {
        filteredLoans = allLoans.slice(0, 10);
      }

      const results: GanttLoanData[] = [];

      filteredLoans.forEach((loan: any, idx: number) => {
        const activeContextId = partnerKey || currentUserId;
        const isInbound = String(loan.bp_loaned_to_business_partner_key) === activeContextId;

        const partner = isInbound ? loan.lender : loan.borrower;
        const partnerName = partner?.business_partner_name || 'Business Partner';

        const materialName = materialLookup[loan.materialKey] ||
          loan.material?.material_description ||
          loan.material?.description ||
          loan.material?.global_material_id ||
          `Material ${loan.materialKey}`;

        const qty = loan.bp_loan_qty_in_base_uom || 0;
        const status = (loan.bp_loan_status || 'PENDING').toUpperCase();

        const rawDate = loan.created_at || loan.updated_at || new Date().toISOString();
        const createdAt = new Date(rawDate).getTime();
        const updatedAt = new Date(loan.updated_at || rawDate).getTime();

        const elapsedMs = status === 'CANCELLED' ? (updatedAt - createdAt) : (today - createdAt);
        const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
        const elapsedDays = Math.floor(elapsedHours / 24);

        let agingLabel = '';
        if (elapsedDays > 0) {
          agingLabel = status === 'CANCELLED' ? `Closed in ${elapsedDays}d` : `${elapsedDays}d Waiting`;
        } else if (elapsedHours > 0) {
          agingLabel = status === 'CANCELLED' ? `Closed in ${elapsedHours}h` : `${elapsedHours}h Waiting`;
        } else {
          const elapsedMins = Math.floor(elapsedMs / (1000 * 60));
          agingLabel = status === 'CANCELLED' ? `Closed in ${elapsedMins}m` : `${elapsedMins}m Waiting`;
        }

        results.push({
          id: `loan_${loan.id || idx}`,
          name: `${materialName} (${qty} CRT)`,
          start: createdAt,
          end: status === 'CANCELLED' ? updatedAt : today,
          color: status === 'CANCELLED' ? '#f43f5e' : (status === 'PENDING' ? '#fbbf24' : '#64748b'),
          custom: {
            status: isShowingActivity ? `HISTORY: ${status}` : status,
            region: agingLabel,
            feedback: partnerName,
            type: isInbound ? 'inbound' : 'outbound',
            elapsedHours: elapsedHours
          }
        });
      });

      return results;
    } catch (error) {
      console.error('Failed to fetch detailed loans:', error);
      return [];
    }
  },

  async getInventoryDistribution(params: { region?: string, partnerKey?: string } = {}): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params.partnerKey) searchParams.append('partnerKey', params.partnerKey);
      else if (params.region) searchParams.append('region', params.region);
      else searchParams.append('global', 'true');

      const data = await apiRequest(`/inventory/distribution?${searchParams.toString()}`);
      return data.result || [];
    } catch (error) {
      console.error('Failed to fetch inventory distribution:', error);
      return [];
    }
  },

  async getUsersList(params: { page?: number; limit?: number; search?: string; region?: string; status?: string } = {}): Promise<any> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.region) searchParams.append('region', params.region);
      if (params.status) searchParams.append('status', params.status);

      const data = await apiRequest(`/user/list?${searchParams.toString()}`);
      return data.result;
    } catch (error) {
      console.error('Failed to fetch users list:', error);
      throw error;
    }
  },

  async getRegions(): Promise<string[]> {
    try {
      const data = await apiRequest('/dashboard/regions');
      return data.result || [];
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      return [];
    }
  },

  async getInactiveUsers(region?: string): Promise<any> {
    try {
      const searchParams = new URLSearchParams();
      if (region) searchParams.append('region', region);
      
      const data = await apiRequest(`/user/inactive/24h${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
      return data.result || { users: [], total: 0, byRegion: {} };
    } catch (error) {
      console.error('Failed to fetch inactive users:', error);
      return { users: [], total: 0, byRegion: {} };
    }
  },

  async getUsersByRegion(): Promise<any[]> {
    try {
      const response = await apiRequest('/dashboard/users-by-region');
      return response.result || [];
    } catch (error) {
      console.error('Failed to fetch users by region:', error);
      return [];
    }
  },

  async getUsersByChannel(): Promise<any[]> {
    try {
      const response = await apiRequest('/dashboard/users-by-channel');
      return response.result || [];
    } catch (error) {
      console.error('Failed to fetch users by channel:', error);
      return [];
    }
  }
};

export default dashboardService;
