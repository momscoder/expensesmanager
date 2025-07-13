import { getApiUrl } from '../config/index.js';

export async function fetchWithToken(url, options = {}) {
  const token = localStorage.getItem('token');
  
  // If url is a relative path, prepend the API base URL
  const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
  
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/';
      throw new Error('Authentication failed');
    }

    return res;
  } catch (error) {
    // Re-throw the error to be handled by the calling code
    throw error;
  }
}
