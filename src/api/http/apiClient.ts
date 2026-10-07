import {
  buildApiUrl,
  getApiDefaultHeaders,
  type SolarApiConfig,
} from "../config";

export class ApiError extends Error {
  status: number;
  responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

export async function apiRequest<TResponse>(
  path: `/${string}`,
  options: ApiRequestOptions = {},
  config: SolarApiConfig = {},
): Promise<TResponse> {
  const { params, headers: requestHeaders, ...init } = options;
  const headers = getApiDefaultHeaders(config.headers);

  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value);
  });

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(buildApiUrl(path, params, config.baseUrl), {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json() as Promise<TResponse>;
}
