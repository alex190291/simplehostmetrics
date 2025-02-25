// /static/npm/managers/DeadHostManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function loadDeadHosts() {
  try {
    await Views.loadDeadHosts();
  } catch (error) {
    showError("Failed to load dead hosts");
  }
}

export async function createDeadHost(deadData) {
  try {
    await makeRequest("/npm-api", "/nginx/dead-hosts", "POST", deadData);
    showSuccess("Dead host created successfully");
    await Views.loadDeadHosts();
  } catch (error) {
    showError("Failed to create dead host");
  }
}

export async function updateDeadHost(hostId, deadData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/dead-hosts/${hostId}`,
      "PUT",
      deadData,
    );
    showSuccess("Dead host updated successfully");
    await Views.loadDeadHosts();
  } catch (error) {
    showError("Failed to update dead host");
  }
}

export async function deleteDeadHost(hostId) {
  if (!confirm("Are you sure you want to delete this dead host?")) return;
  try {
    await makeRequest("/npm-api", `/nginx/dead-hosts/${hostId}`, "DELETE");
    showSuccess("Dead host deleted successfully");
    await Views.loadDeadHosts();
  } catch (error) {
    showError("Failed to delete dead host");
  }
}

export async function enableDeadHost(hostId) {
  try {
    await makeRequest("/npm-api", `/nginx/dead-hosts/${hostId}/enable`, "POST");
    showSuccess("Dead host enabled successfully");
    await Views.loadDeadHosts();
  } catch (error) {
    showError("Failed to enable dead host");
  }
}

export async function disableDeadHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/dead-hosts/${hostId}/disable`,
      "POST",
    );
    showSuccess("Dead host disabled successfully");
    await Views.loadDeadHosts();
  } catch (error) {
    showError("Failed to disable dead host");
  }
}
