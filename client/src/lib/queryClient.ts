import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Try to parse as JSON first for better error messages
      const json = await res.json();
      errorMessage = json.error || json.message || res.statusText;
    } catch {
      // If JSON parsing fails, use text
      try {
        errorMessage = await res.text() || res.statusText;
      } catch {
        errorMessage = res.statusText;
      }
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers || {}),
  };

  const res = await fetch(`/api${url}`, {
    method: 'GET',
    credentials: 'include',
    ...options,
    headers,
  });

  await throwIfResNotOk(res);
  
  // Handle responses that might be empty
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const text = await res.text();
    if (text) {
      try {
        return JSON.parse(text);
      } catch (error) {
        console.error('JSON parse error:', error, 'Response text:', text);
        throw new Error('Invalid JSON response from server');
      }
    } else {
      return {}; // Return empty object for empty responses
    }
  } else {
    return {}; // Return empty object for non-JSON responses
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
