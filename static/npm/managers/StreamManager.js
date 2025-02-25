// /static/npm/managers/StreamManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function editStream(streamId, updatedData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/streams/${streamId}`,
      "PUT",
      updatedData,
    );
    showSuccess("Stream updated successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError("Failed to update stream");
  }
}

export async function deleteStream(streamId) {
  if (!confirm("Are you sure you want to delete this stream?")) return;
  try {
    await makeRequest("/npm-api", `/nginx/streams/${streamId}`, "DELETE");
    showSuccess("Stream deleted successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError("Failed to delete stream");
  }
}

export async function createStream(streamData) {
  try {
    await makeRequest("/npm-api", "/nginx/streams", "POST", streamData);
    showSuccess("Stream created successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError("Failed to create stream");
  }
}

export async function enableStream(streamId) {
  try {
    await makeRequest("/npm-api", `/nginx/streams/${streamId}/enable`, "POST");
    showSuccess("Stream enabled successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError("Failed to enable stream");
  }
}

export async function disableStream(streamId) {
  try {
    await makeRequest("/npm-api", `/nginx/streams/${streamId}/disable`, "POST");
    showSuccess("Stream disabled successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError("Failed to disable stream");
  }
}
