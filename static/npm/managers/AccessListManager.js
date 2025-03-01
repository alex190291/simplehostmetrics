// /static/npm/managers/AccessListManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function getAccessList(listId) {
  try {
    return await makeRequest("/npm-api", `/nginx/access-lists/${listId}`);
  } catch (error) {
    showError("Failed to fetch access list details");
    throw error;
  }
}

export async function editAccessList(listId, updatedData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/access-lists/${listId}`,
      "PUT",
      updatedData,
    );
    showSuccess("Access list updated successfully");
    await Views.loadAccessLists();
  } catch (error) {
    showError("Failed to update access list");
    throw error;
  }
}

export async function deleteAccessList(listId) {
  if (!confirm("Are you sure you want to delete this access list?")) return;
  try {
    await makeRequest("/npm-api", `/nginx/access-lists/${listId}`, "DELETE");
    showSuccess("Access list deleted successfully");
    await Views.loadAccessLists();
  } catch (error) {
    showError("Failed to delete access list");
    throw error;
  }
}

export async function createAccessList(accessListData) {
  try {
    await makeRequest(
      "/npm-api",
      "/nginx/access-lists",
      "POST",
      accessListData,
    );
    showSuccess("Access list created successfully");
    await Views.loadAccessLists();
  } catch (error) {
    showError("Failed to create access list");
    throw error;
  }
}

export async function updateAccessList(listId, accessListData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/access-lists/${listId}`,
      "PUT", 
      accessListData
    );
    showSuccess("Access list updated successfully");
    await Views.loadAccessLists();
  } catch (error) {
    showError("Failed to update access list");
    throw error;
  }
}
