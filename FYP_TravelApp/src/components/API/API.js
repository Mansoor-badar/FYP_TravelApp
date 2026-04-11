const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const API = {};

API.get = (endpoint) => callFetch(endpoint, 'GET');
API.post = (endpoint, data) => callFetch(endpoint, 'POST', data);
API.put = (endpoint, data) => callFetch(endpoint, 'PUT', data);
API.patch = (endpoint, data) => callFetch(endpoint, 'PATCH', data);
API.delete = (endpoint, data) => callFetch(endpoint, 'DELETE', data);

export default API;

const callFetch = async (endpoint, method, dataObj = null) => {
  // Build request object
  let requestObj = {
    method: method, // GET, POST, PUT or DELETE
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  if (dataObj) {
    requestObj = {
      ...requestObj,
      headers: {
        ...requestObj.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataObj),
    };
    // For POST requests to PostgREST (Supabase), ask the server to return
    // the created representation so the client receives the new row(s).
    if (method === 'POST') {
      requestObj.headers.Prefer = 'return=representation';
    }
  }

  // Call the fetch and process the return
  try {
    let result = null;
    const response = await fetch(`${BASE_URL}${endpoint}`, requestObj);

    // Read response body as text first to avoid json parse errors on empty bodies
    const text = await response.text();
    if (text) {
      try {
        result = JSON.parse(text);
      } catch (e) {
        // Not JSON — keep raw text as result
        result = text;
      }
    } else {
      result = null;
    }

    if (response.status >= 200 && response.status < 300) {
      return { isSuccess: true, result };
    }

    // Build a sensible error message if possible
    const message = (result && result.message) ? result.message : (typeof result === 'string' && result) ? result : response.statusText;
    return { isSuccess: false, message };
  } catch (error) {
    return { isSuccess: false, message: error.message };
  }
};
