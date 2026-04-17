const REPLIT_API = "https://4e58d8e3-2d29-49fc-8c3c-d333cb57f972-00-2t8lgc3y8mh0o.riker.replit.dev/api";

function resolveApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  return REPLIT_API;
}

export const API_BASE = resolveApiBase();
export const PROXY_BASE = `${API_BASE}/proxy`;
