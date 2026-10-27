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
      // only safe requests: repeating a POST could create a duplicate
      ['get', 'head'].includes(String(config.method ?? 'get').toLowerCase()) &&
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

// One submission at a time: a double click on Save waits for the first request
// instead of sending a second identical one.
const inFlight = new Map<string, Promise<unknown>>();
const keyFor = (m: string, url: string, data?: unknown) => {
  let body = '';
  if (data instanceof FormData) body = '[form]';
  else if (data !== undefined) { try { body = JSON.stringify(data); } catch { body = '?'; } }
  return `${m} ${url} ${body}`;
};
function once<T>(key: string, send: () => Promise<T>): Promise<T> {
  const hit = inFlight.get(key);
  if (hit) return hit as Promise<T>;
  const p = send().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}
const rawPost = api.post.bind(api);
const rawPut = api.put.bind(api);
const rawPatch = api.patch.bind(api);
const rawDelete = api.delete.bind(api);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.post = ((url: string, data?: any, config?: any) => once(keyFor('POST', url, data), () => rawPost(url, data, config))) as typeof api.post;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.put = ((url: string, data?: any, config?: any) => once(keyFor('PUT', url, data), () => rawPut(url, data, config))) as typeof api.put;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.patch = ((url: string, data?: any, config?: any) => once(keyFor('PATCH', url, data), () => rawPatch(url, data, config))) as typeof api.patch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
api.delete = ((url: string, config?: any) => once(keyFor('DELETE', url), () => rawDelete(url, config))) as typeof api.delete;

export default api;
