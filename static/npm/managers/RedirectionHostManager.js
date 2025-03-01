import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

/**
 * Creates a new redirection host
 * @param {Object} redirectionData - The redirection host data
 */
export async function createRedirectionHost(redirectionData) {
  try {
    await makeRequest(
      "/npm-api", 
      "/nginx/redirection-hosts", 
      "POST", redirectionData
    );

    showSuccess("Redirection Host created successfully");
    await Views.loadRedirectionHosts();    
  } catch (error) {
    showError("Failed to create redirection host");
    throw error;
  }
}

/**
 * Edits an existing redirection host
 * @param {string|number} hostId - The ID of the host to edit
 * @param {Object} updatedRedirectionData - The updated host data
 */
export async function editRedirectionHost(hostId, updatedRedirectionData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      updatedRedirectionData
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
};

