import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface PreciseError {
  title: string;
  description: string;
}

export function getPreciseApiError(
  error: any,
  fallbackDesc = 'An unexpected error occurred.',
  fallbackTitle = 'Error'
): PreciseError {
  if (!error) {
    return { title: fallbackTitle, description: fallbackDesc };
  }

  // Handle Network Errors (Server offline, connection refused, DNS/CORS error)
  if (
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    error.message === 'Failed to fetch' ||
    (!error.response && error.request)
  ) {
    return {
      title: 'Server Connection Failed',
      description: 'Unable to reach the backend server. Please verify the backend service is running on http://localhost:5000.',
    };
  }

  // Server responded with an HTTP status code
  if (error.response) {
    const status = error.response.status;
    const serverMessage =
      error.response.data?.error ||
      error.response.data?.message ||
      (typeof error.response.data === 'string' ? error.response.data : null);

    if (serverMessage && typeof serverMessage === 'string' && serverMessage.trim()) {
      return {
        title: status === 401 ? 'Authentication Failed' : status >= 500 ? 'Server Error' : fallbackTitle,
        description: serverMessage,
      };
    }

    switch (status) {
      case 400:
        return { title: 'Bad Request', description: 'The submitted request data is invalid.' };
      case 401:
        return { title: 'Login Failed', description: 'Invalid username or password.' };
      case 403:
        return { title: 'Access Denied', description: 'Account is inactive or lacks required permissions.' };
      case 404:
        return { title: 'Not Found', description: 'The requested record or endpoint was not found.' };
      case 409:
        return { title: 'Conflict Error', description: 'A record with this information already exists.' };
      case 500:
      case 502:
      case 503:
      case 504:
        return { title: 'Server Error', description: 'Backend server encountered an internal error.' };
      default:
        return { title: fallbackTitle, description: error.message || fallbackDesc };
    }
  }

  return {
    title: fallbackTitle,
    description: error.message || fallbackDesc,
  };
}
