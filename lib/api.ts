import axios from 'axios';

console.log('[API] Base URL:', process.env.NEXT_PUBLIC_API_URL);

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('nivasi_admin_token')
      : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;

    if (!config._retryCount) config._retryCount = 0;

    if (
      config._retryCount < 3 &&
      (error.response?.status === 502 ||
        error.response?.status === 503 ||
        error.code === 'ERR_NETWORK')
    ) {
      config._retryCount += 1;
      console.log(`[API] Retrying request (${config._retryCount}/3)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * config._retryCount));
      return api(config);
    }

    // A wrong PIN is also a 401. Only an expired session should bounce to /login.
    const isAuthCall = String(config?.url ?? '').includes('/auth/');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('nivasi_admin_token');
      localStorage.removeItem('nivasi_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
