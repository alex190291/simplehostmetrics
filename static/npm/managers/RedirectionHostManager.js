import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

/**
 * Creates a new redirection host
 * @param {Object} redirData - The redirection host data
 */
export async function createRedirectionHost(redirData) {
  try {
    await makeRequest(
      "/npm-api",
      "/nginx/redirection-hosts",
      "POST",
      redirData
    );
    
    showSuccess("Redirection host created successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to create redirection host");
    throw error;
  }
}

/**
 * Edits an existing redirection host
 * @param {string|number} hostId - The ID of the host to edit
 * @param {Object} updatedRedirData - The updated host data
 */
export async function editRedirectionHost(hostId, updatedRedirData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      updatedRedirData
    );
    showSuccess("Redirection host updated successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to update redirection host");
  }
}

/**
 * Deletes a redirection host
 * @param {string|number} hostId - The ID of the host to delete
 */
export async function deleteRedirectionHost(hostId) {
  if (!confirm("Are you sure you want to delete this redirection host?")) 
    return;
  
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "DELETE"
    );
    showSuccess("Redirection host deleted successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to delete redirection host");
  }
}


/**
 * Enables a redirection host
 * @param {string|number} hostId - The ID of the host to enable
 */
export async function enableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/enable`,
      "POST"
    );
    showSuccess("Redirection host enabled successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to enable redirection host");
  }
}

/**
 * Disables a redirection host
 * @param {string|number} hostId - The ID of the host to disable
 */
export async function disableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/disable`,
      "POST"
    );
    showSuccess("Redirection host disabled successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to disable redirection host");
  }
}
// Export all functions to be available globally if needed
window.RedirectionHostManager = {
  createRedirectionHost,
  editRedirectionHost,
  deleteRedirectionHost,
  enableRedirectionHost,
  disableRedirectionHost,
  editRedirectionHostWithModal,
  fetchRedirectionHost
};

