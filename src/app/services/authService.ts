import { apiRequest } from './api';

export const authService = {
  login: async (userAd: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ USER_AD: userAd, PASSWORD: password }),
    });
    
    if (data.result && data.result.TOKEN) {
      localStorage.setItem('rpm-tracker-auth-token', data.result.TOKEN);
      localStorage.setItem('rpm-tracker-auth-refresh', data.result.REFRESH_TOKEN);
      
      const permissions = data.result.profil?.permissions?.map((p: any) => p.code) || [];
      
      const mappedUser = {
        id: data.result.business_partner_key.toString(),
        name: data.result.business_partner_name,
        region: data.result.region,
        role: data.result.profil?.CODE_PROFIL || data.result.business_partner_type,
        permissions: permissions
      };
      
      localStorage.setItem('rpm-tracker-auth-user', JSON.stringify(mappedUser));
      return mappedUser;
    }
    
    // Return the full data result for MFA handling
    return data.result;
  },

  verifyOTP: async (otp: string, mfaToken: string) => {
    const data = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ token: otp, mfa_token: mfaToken }),
    });

    if (data.result && data.result.TOKEN) {
      localStorage.setItem('rpm-tracker-auth-token', data.result.TOKEN);
      localStorage.setItem('rpm-tracker-auth-refresh', data.result.REFRESH_TOKEN);
      
      const permissions = data.result.profil?.permissions?.map((p: any) => p.code) || [];
      
      const mappedUser = {
        id: data.result.business_partner_key.toString(),
        name: data.result.business_partner_name,
        region: data.result.region,
        role: data.result.profil?.CODE_PROFIL || data.result.business_partner_type,
        permissions: permissions
      };
      
      localStorage.setItem('rpm-tracker-auth-user', JSON.stringify(mappedUser));
      return mappedUser;
    }
    return null;
  },
  
  resendOTP: async (mfaToken: string) => {
    return await apiRequest('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ mfa_token: mfaToken }),
    });
  },
  
  logout: async () => {
    const refreshToken = localStorage.getItem('rpm-tracker-auth-refresh');
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ REFRESH_TOKEN: refreshToken }),
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('rpm-tracker-auth-token');
      localStorage.removeItem('rpm-tracker-auth-refresh');
      localStorage.removeItem('rpm-tracker-auth-user');
    }
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('rpm-tracker-auth-user');
    return user ? JSON.parse(user) : null;
  },

  getProfile: async () => {
    const data = await apiRequest('/auth/profile');
    if (data.result) {
       const permissions = data.result.profil?.permissions?.map((p: any) => p.code) || [];
       
       return {
        id: data.result.business_partner_key.toString(),
        name: data.result.business_partner_name,
        region: data.result.region,
        role: data.result.profil?.CODE_PROFIL || data.result.business_partner_type,
        permissions: permissions
      };
    }
  },

  getDistributors: async () => {
    const data = await apiRequest('/auth/distributors');
    return data.result.map((p: any) => ({
      id: (p.key || p.KEY || p.id || p.business_partner_key || p.ID || '').toString(),
      name: p.business_partner_name || p.NAME || p.name || 'Unknown Partner',
      region: p.region || p.REGION || 'GLOBAL',
      role: p.business_partner_type || p.BUSINESS_PARTNER_TYPE || p.role || p.ROLE || 'PARTNER',
      type: p.customer_channel || p.CUSTOMER_CHANNEL || p.business_partner_type || p.BUSINESS_PARTNER_TYPE || p.type || 'PARTNER',
      channel: p.customer_channel || p.CUSTOMER_CHANNEL || p.channel || p.CHANNEL,
      status: p.business_partner_status || p.BUSINESS_PARTNER_STATUS || p.status || p.STATUS || 'active'
    }));
  }
};
