/**
 * RedirectionHostManager handles all API calls related to redirection hosts
 */

/**
 * Get all redirection hosts
 * 
 * @returns {Promise}
 */
export async function getRedirectionHosts() {
  try {
    const response = await fetch("/npm-api/nginx/redirection-hosts");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching redirection hosts:", error);
    throw error;
  }
}

/**
 * Get a specific redirection host by ID
 * 
 * @param {Number} hostId 
 * @returns {Promise}
 */
export async function getRedirectionHost(hostId) {
  try {
    const response = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching redirection host ${hostId}:`, error);
    throw error;
  }
}

/**
 * Create a new redirection host
 * 
 * @param {Object} data 
 * @returns {Promise}
 */
export async function createRedirectionHost(data) {
  try {
    const response = await fetch("/npm-api/nginx/redirection-hosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create redirection host: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating redirection host:", error);
    throw error;
  }
}

/**
 * Edit an existing redirection host
 * 
 * @param {Number} hostId 
 * @param {Object} data 
 * @returns {Promise}
 */
export async function editRedirectionHost(hostId, data) {
  try {
    // Using the correct HTTP method (PUT) for updates
    const response = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update redirection host: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating redirection host ${hostId}:`, error);
    throw error;
  }
}

/**
 * Delete a redirection host
 * 
 * @param {Number} hostId 
 * @returns {Promise}
 */
export async function deleteRedirectionHost(hostId) {
  try {
    const response = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete redirection host: ${errorText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting redirection host ${hostId}:`, error);
    throw error;
  }
}

/**
 * Enable a redirection host
 * 
 * @param {Number} hostId 
 * @returns {Promise}
 */
export async function enableRedirectionHost(hostId) {
  try {
    const response = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}/enable`, {
      method: "POST",
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to enable redirection host: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error enabling redirection host ${hostId}:`, error);
    throw error;
  }
}

/**
 * Disable a redirection host
 * 
 * @param {Number} hostId 
 * @returns {Promise}
 */
export async function disableRedirectionHost(hostId) {
  try {
    const response = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}/disable`, {
      method: "POST",
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to disable redirection host: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error disabling redirection host ${hostId}:`, error);
    throw error;
  }
}
