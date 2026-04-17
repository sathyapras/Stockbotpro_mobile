function resolveApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  return "http://localhost:8080/api";
}

export const API_BASE = resolveApiBase();
export const PROXY_BASE = `${API_BASE}/proxy`;
