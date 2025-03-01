// /static/npm/managers/ProxyHostManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

/**
 * Creates a new proxy host
 * @param {Object} proxyData - The proxy host data
 */
export async function createProxyHost(proxyData) {
  try {
    await makeRequest(
      "/npm-api", 
      "/nginx/proxy-hosts", 
      "POST", proxyData
    );

    showSuccess("Proxy Host created successfully");
    await Views.loadProxyHosts();    
  } catch (error) {
    showError("Failed to create host");
    throw error;
  }
}

/**
 * Edits an existing proxy host
 * @param {string|number} hostId - The ID of the host to edit
 * @param {Object} updatedProxyData - The updated host data
 */
export async function editProxyHost(hostId, updatedProxyData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/proxy-hosts/${hostId}`,
      "PUT",
      updatedProxyData
    );
    showSuccess("Host updated successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to update host");
  }
}

/**
 * Deletes a proxy host
 * @param {string|number} hostId - The ID of the host to delete
 */
export async function deleteProxyHost(hostId) {
  if (!confirm("Are you sure you want to delete this host?")) 
    return;

  try {
    await makeRequest(
      "/npm-api", 
      `/nginx/proxy-hosts/${hostId}`, 
      "DELETE"
    );
    showSuccess("Host deleted successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to delete host");
  }
}

/**
 * Enables a proxy host
 * @param {string|number} hostId - The ID of the host to enable
 */
export async function enableProxyHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/proxy-hosts/${hostId}/enable`,
      "POST"
    );
    showSuccess("Proxy host enabled successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to enable proxy host");
  }
}

/**
 * Disables a proxy host
 * @param {string|number} hostId - The ID of the host to disable
 */
export async function disableProxyHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/proxy-hosts/${hostId}/disable`,
      "POST"
    );
    showSuccess("Proxy host disabled successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to disable proxy host");
  }
}

// Export all functions to be available globally if needed
window.ProxyHostManager = {
  createProxyHost,
  editProxyHost,
  deleteProxyHost,
  enableProxyHost,
  disableProxyHost,  
};
