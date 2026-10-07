export interface SolarApiConfig {
  baseUrl?: string;
  headers?: HeadersInit;
}

export function getApiBaseUrl(baseUrl: string | undefined) {
  console.log(baseUrl);
  const trimmedBaseUrl = baseUrl?.trim();
  if (!trimmedBaseUrl) {
    throw new Error("Missing solarApiBaseUrl");
  }

  return trimmedBaseUrl.replace(/\/+$/, "");
}

export function buildApiUrl(
  path: `/${string}`,
  params?: Record<string, string | number | boolean | null | undefined>,
  baseUrl?: string,
) {
  const url = new URL(`${getApiBaseUrl(baseUrl)}${path}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url;
}

export function getApiDefaultHeaders(headers?: HeadersInit) {
  return new Headers(headers);
}
