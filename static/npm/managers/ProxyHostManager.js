// /static/npm/managers/ProxyHostManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function editProxyHost(hostId, updatedData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/proxy-hosts/${hostId}`,
      "PUT",
      updatedData,
    );
    showSuccess("Host updated successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to update host");
  }
}

export async function deleteProxyHost(hostId) {
  if (!confirm("Are you sure you want to delete this host?")) return;
  try {
    await makeRequest("/npm-api", `/nginx/proxy-hosts/${hostId}`, "DELETE");
    showSuccess("Host deleted successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to delete host");
  }
}

export async function enableProxyHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/proxy-hosts/${hostId}/enable`,
      "POST",
    );
    showSuccess("Proxy host enabled successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to enable proxy host");
  }
}

export async function disableProxyHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/proxy-hosts/${hostId}/disable`,
      "POST",
    );
    showSuccess("Proxy host disabled successfully");
    await Views.loadProxyHosts();
  } catch (error) {
    showError("Failed to disable proxy host");
  }
}
