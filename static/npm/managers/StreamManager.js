// /static/npm/managers/StreamManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function editStream(streamId, updatedData) {
  try {
    // Format the data according to what the API expects
    const formattedData = {
      incoming_port: updatedData.incoming_port,
      forwarding_host: updatedData.forwarding_host,
      forwarding_port: updatedData.forwarding_port,
      tcp_forwarding: updatedData.tcp_forwarding,
      udp_forwarding: updatedData.udp_forwarding,
      enabled: updatedData.enabled,
      meta: {}  // Required empty object
    };
    
    await makeRequest(
      "/npm-api",
      `/nginx/streams/${streamId}`,
      "PUT",
      formattedData,
    );
    showSuccess("Stream updated successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError(`Failed to update stream: ${error.message || error}`);
    console.error("Stream update error:", error);
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
    // Format the data according to what the API expects
    const formattedData = {
      incoming_port: streamData.incoming_port,
      forwarding_host: streamData.forwarding_host,
      forwarding_port: streamData.forwarding_port,
      tcp_forwarding: streamData.tcp_forwarding,
      udp_forwarding: streamData.udp_forwarding,
      enabled: streamData.enabled,
      meta: {}  // Required empty object
    };
    
    await makeRequest("/npm-api", "/nginx/streams", "POST", formattedData);
    showSuccess("Stream created successfully");
    await Views.loadStreamHosts();
  } catch (error) {
    showError(`Failed to create stream: ${error.message || error}`);
    console.error("Stream creation error:", error);
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
