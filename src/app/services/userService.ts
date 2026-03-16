import { apiRequest } from './api';

export const userService = {
  getMetadata: async () => {
    const data = await apiRequest('/user/metadata');
    return data.result;
  },

  getUsers: async (params?: { page?: number; limit?: number; search?: string; region?: string; type?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.region) queryParams.append('region', params.region);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);

    const url = `/user/list?${queryParams.toString()}`;
    const data = await apiRequest(url);
    return data.result || { users: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
  },

  createUser: async (userData: any) => {
    const data = await apiRequest('/user/create', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data.result;
  },

  updateUser: async (userId: string, userData: any) => {
    const data = await apiRequest(`/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return data.result;
  },

  deleteUser: async (userId: string) => {
    const data = await apiRequest(`/user/${userId}`, {
      method: 'DELETE',
    });
    return data.result;
  },

  getUserLogs: async (userId: string) => {
    const data = await apiRequest(`/user/${userId}/logs`);
    return data.result;
  },
};
