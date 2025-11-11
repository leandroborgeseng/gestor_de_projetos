export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_URL || "http://localhost:4000";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function buildAssetUrl(path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = getApiBaseUrl();
  if (path.startsWith("/")) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}
