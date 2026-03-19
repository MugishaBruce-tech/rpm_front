import { apiRequest } from './api';

export interface AuditLogItem {
  audit_id: number;
  business_partner_key: number | null;
  action: string;
  method: string;
  path: string;
  payload: string | null;
  ip_address: string;
  status_code: number;
  created_at: string;
  user?: {
    business_partner_name: string;
    user_ad: string;
    profil?: {
      CODE_PROFIL: string;
    };
    region?: string;
  };
}

export interface AuditLogsResponse {
  statusCode: number;
  httpStatus: string;
  result: {
    logs: AuditLogItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export const getAuditLogs = async (
  page: number = 1, 
  limit: number = 15, 
  filters?: { startDate?: string; endDate?: string; userKey?: string; region?: string }
): Promise<AuditLogsResponse> => {
  let query = `/audit/list?page=${page}&limit=${limit}`;
  if (filters) {
    if (filters.startDate) query += `&startDate=${filters.startDate}`;
    if (filters.endDate) query += `&endDate=${filters.endDate}`;
    if (filters.userKey) query += `&userKey=${filters.userKey}`;
    if (filters.region) query += `&region=${filters.region}`;
  }
  const response = await apiRequest(query);
  return response;
};
