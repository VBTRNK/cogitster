const CONFIG = window.COGITSTER_CONFIG ?? {};
const SESSION_KEY = 'cogitster-supabase-session-v1';

function configured() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey);
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function headers(session, extra = {}) {
  return {
    apikey: CONFIG.supabasePublishableKey,
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...extra,
  };
}

function sessionFromHash() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  const expiresIn = Number(hash.get('expires_in') ?? 3600);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return { access_token: accessToken, refresh_token: refreshToken, expires_at: Date.now() + expiresIn * 1000 };
}

async function refreshSession(session) {
  if (session.expires_at > Date.now() + 60_000) return session;
  const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(null, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) throw new Error('Your sign-in session expired. Please sign in again.');
  const data = await response.json();
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 };
}

async function currentSession() {
  if (!configured()) return null;
  const fromHash = sessionFromHash();
  const session = fromHash ?? readSession();
  if (!session) return null;
  try {
    const refreshed = await refreshSession(session);
    writeSession(refreshed);
    return refreshed;
  } catch {
    clearSession();
    return null;
  }
}

async function currentUser() {
  const session = await currentSession();
  if (!session) return null;
  const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/user`, { headers: headers(session) });
  if (!response.ok) { clearSession(); return null; }
  return response.json();
}

async function action(payload) {
  const session = await currentSession();
  if (!session) throw new Error('Please sign in to save this game.');
  const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/solo-game`, {
    method: 'POST',
    headers: headers(session, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'The game service is unavailable.');
  return data;
}

export const backend = {
  configured,
  currentUser,
  action,
  clearSession,
  async sendMagicLink(email) {
    if (!configured()) throw new Error('Supabase has not been configured yet.');
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: headers(null, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, create_user: true, redirect_to: `${window.location.origin}${window.location.pathname}` }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.msg ?? data.message ?? 'Could not send the sign-in email.');
    }
  },
};
