const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const API = {};

API.get = (endpoint) => callFetch(endpoint, 'GET');
API.post = (endpoint, data) => callFetch(endpoint, 'POST', data);
API.put = (endpoint, data) => callFetch(endpoint, 'PUT', data);
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
  }

  // Call the fetch and process the return
  try {
    let result = null;
    const response = await fetch(`${BASE_URL}${endpoint}`, requestObj);
    if (response.status !== 204) result = await response.json();
    return response.status >= 200 && response.status < 300
      ? { isSuccess: true, result }
      : { isSuccess: false, message: `${result.message}` };
  } catch (error) {
    return { isSuccess: false, message: error.message };
  }
};
