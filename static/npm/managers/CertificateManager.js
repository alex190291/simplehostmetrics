// /static/npm/managers/CertificateManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

// Helper to wrap a promise with a timeout.
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout exceeded")), timeoutMs),
    ),
  ]);
}

export async function renewCertificate(certId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/certificates/${certId}/renew`,
      "POST",
    );
    showSuccess("Certificate renewal initiated");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to renew certificate");
    throw error;
  }
}

export async function deleteCertificate(certId) {
  if (!confirm("Are you sure you want to delete this certificate?")) return;
  try {
    await makeRequest("/npm-api", `/nginx/certificates/${certId}`, "DELETE");
    showSuccess("Certificate deleted successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to delete certificate");
    throw error;
  }
}

export async function createCertificate(certData) {
  try {
    let requestPromise = makeRequest(
      "/npm-api",
      "/nginx/certificates",
      "POST",
      certData,
    );

    // Apply timeout if DNS challenge with wait time is specified
    if (certData.dns_challenge && certData.dns_challenge.wait_time) {
      requestPromise = withTimeout(
        requestPromise,
        certData.dns_challenge.wait_time * 1000,
      );
    }

    const response = await requestPromise;
    showSuccess("Certificate created successfully");
    await Views.loadCertificates();
    return response.id;
  } catch (error) {
    showError("Failed to create certificate: " + error.message);
    throw error;
  }
}

export async function getCertificate(certId) {
  try {
    const response = await makeRequest(
      "/npm-api",
      `/nginx/certificates/${certId}`,
    );
    return response;
  } catch (error) {
    showError("Failed to fetch certificate details");
    throw error;
  }
}

export async function getAllCertificates(expand = "") {
  try {
    const queryParams = expand ? `?expand=${expand}` : "";
    const response = await makeRequest(
      "/npm-api",
      `/nginx/certificates${queryParams}`,
    );
    return response;
  } catch (error) {
    showError("Failed to fetch certificates");
    throw error;
  }
}

export async function validateCertificate(formData) {
  try {
    await makeRequest(
      "/npm-api",
      "/nginx/certificates/validate",
      "POST",
      formData,
      true, // is multipart/form-data
    );
    showSuccess("Certificate validated successfully");
    return true;
  } catch (error) {
    showError("Failed to validate certificate: " + error.message);
    return false;
  }
}

export async function testHttpReach(domains) {
  try {
    const domainsStr = Array.isArray(domains)
      ? JSON.stringify(domains)
      : domains;
    await makeRequest(
      "/npm-api",
      `/nginx/certificates/test-http?domains=${encodeURIComponent(domainsStr)}`,
    );
    showSuccess("HTTP reachability test successful");
    return true;
  } catch (error) {
    showError("HTTP reachability test failed: " + error.message);
    return false;
  }
}

export async function downloadCertificate(certId) {
  try {
    // For direct download, we don't use makeRequest but redirect the browser
    window.location.href = `/npm-api/nginx/certificates/${certId}/download`;
    return true;
  } catch (error) {
    showError("Failed to download certificate");
    return false;
  }
}

export async function uploadCertificate(certId, formData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/certificates/${certId}/upload`,
      "POST",
      formData,
      true, // is multipart/form-data
    );
    showSuccess("Certificate uploaded successfully");
    await Views.loadCertificates();
    return true;
  } catch (error) {
    showError("Failed to upload certificate: " + error.message);
    return false;
  }
}
