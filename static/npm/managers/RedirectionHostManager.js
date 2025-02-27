// /static/npm/managers/RedirectionHostManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

/**
 * Edit an existing redirection host.
 * Calls the proxy endpoint: PUT /nginx/redirection-hosts/<hostId>
 */
export async function editRedirectionHost(hostId, updatedData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      updatedData,
    );
    showSuccess("Redirection host updated successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to update redirection host");
  }
}

/**
 * Delete a redirection host.
 * Calls the proxy endpoint: DELETE /nginx/redirection-hosts/<hostId>
 */
export async function deleteRedirectionHost(hostId) {
  if (!confirm("Are you sure you want to delete this redirection host?"))
    return;
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "DELETE",
    );
    showSuccess("Redirection host deleted successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to delete redirection host");
  }
}

/**
 * Create a new redirection host.
 * Calls the proxy endpoint: POST /nginx/redirection-hosts
 */
export async function createRedirectionHost(redirData) {
  try {
    await makeRequest(
      "/npm-api",
      "/nginx/redirection-hosts",
      "POST",
      redirData,
    );
    showSuccess("Redirection host created successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to create redirection host");
  }
}

/**
 * Enable a redirection host.
 * Calls the proxy endpoint: POST /nginx/redirection-hosts/<hostId>/enable
 */
export async function enableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/enable`,
      "POST",
    );
    showSuccess("Redirection host enabled successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to enable redirection host");
  }
}

/**
 * Disable a redirection host.
 * Calls the proxy endpoint: POST /nginx/redirection-hosts/<hostId>/disable
 */
export async function disableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/disable`,
      "POST",
    );
    showSuccess("Redirection host disabled successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to disable redirection host");
  }
}
