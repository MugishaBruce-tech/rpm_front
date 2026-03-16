const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082';

export const getAuthHeader = () => {
  const token = localStorage.getItem('rpm-tracker-auth-token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    headers['Authorization'] = authHeader.Authorization;
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Network error: Please check your connection.');
    }
    throw error;
  }
};
