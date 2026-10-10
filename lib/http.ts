import { API_URL } from './config';
import { getToken, setToken } from './session';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// Talks to the cloud as the signed-in person. A 401 means the session ran out: the phone signs out.
export async function api<T = unknown>(path: string, { method = 'GET', body, auth = true, timeout = 30000 }: { method?: string; body?: unknown; auth?: boolean; timeout?: number } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = getToken();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeout);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
  } catch (e) {
    throw new ApiError((e as Error).name === 'AbortError' ? 'The server took too long to answer.' : 'Could not reach the server. Check your connection.', 0);
  } finally { clearTimeout(timer); }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* an empty answer */ }
  if (res.status === 401 && auth && t) await setToken(null);
  if (!res.ok) throw new ApiError((data as { error?: string } | null)?.error || `The server answered ${res.status}.`, res.status);
  return data as T;
}
