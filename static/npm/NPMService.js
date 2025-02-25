// /static/npm/NPMService.js
export async function makeRequest(
  apiBase,
  endpoint,
  method = "GET",
  body = null,
  retryAttempts = 3,
) {
  const url = `${apiBase}${endpoint}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Request error (attempt ${attempt + 1}):`, error);
      if (attempt < retryAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
}
