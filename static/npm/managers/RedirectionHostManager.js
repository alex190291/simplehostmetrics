// /static/npm/managers/RedirectionHostManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";
import { showEditRedirectionHostModal } from "../modals/RedirectionHostModals.js";

// Helper function to create certificate if needed
async function handleCertificateCreation(domainNames, certificateId) {
  if (certificateId === "new") {
    try {
      // Import CertificateManager dynamically to avoid circular dependencies
      const certModule = await import("../managers/CertificateManager.js");
      const newCertId = await certModule.createCertificate({
        provider: "letsencrypt",
        domain_names: domainNames,
      });
      return newCertId;
    } catch (error) {
      showError("Failed to create certificate: " + error.message);
      throw error;
    }
  }
  return certificateId;
}

export async function editRedirectionHost(hostId) {
  try {
    // First, show the edit modal to get updated data
    const updatedData = await showEditRedirectionHostModal(hostId);

    // Handle certificate creation if needed
    if (updatedData.certificate_id === "new") {
      updatedData.certificate_id = await handleCertificateCreation(
        updatedData.domain_names,
        updatedData.certificate_id,
      );
    }

    // Send the update request
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      updatedData,
    );

    showSuccess("Redirection host updated successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError(
      "Failed to update redirection host: " +
        (error.message || "Unknown error"),
    );
    console.error("Update redirection host error:", error);
  }
}

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
    showError(
      "Failed to delete redirection host: " +
        (error.message || "Unknown error"),
    );
    console.error("Delete redirection host error:", error);
  }
}

export async function createRedirectionHost(redirData) {
  try {
    // Handle certificate creation if needed
    if (redirData.certificate_id === "new") {
      redirData.certificate_id = await handleCertificateCreation(
        redirData.domain_names,
        redirData.certificate_id,
      );
    }

    await makeRequest(
      "/npm-api",
      "/nginx/redirection-hosts",
      "POST",
      redirData,
    );

    showSuccess("Redirection host created successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError(
      "Failed to create redirection host: " +
        (error.message || "Unknown error"),
    );
    console.error("Create redirection host error:", error);
  }
}

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
    showError(
      "Failed to enable redirection host: " +
        (error.message || "Unknown error"),
    );
    console.error("Enable redirection host error:", error);
  }
}

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
    showError(
      "Failed to disable redirection host: " +
        (error.message || "Unknown error"),
    );
    console.error("Disable redirection host error:", error);
  }
}
