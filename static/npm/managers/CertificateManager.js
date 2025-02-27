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
    showError("Failed to create certificate");
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
    );
    showSuccess("Certificate validated successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to validate certificate");
  }
}

export async function testHttpReach(domains) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/certificates/test-http?domains=${encodeURIComponent(JSON.stringify(domains))}`,
    );
    showSuccess("HTTP reachability test completed");
  } catch (error) {
    showError("HTTP reachability test failed");
  }
}

export async function downloadCertificate(certId) {
  try {
    const url = `/npm-api/nginx/certificates/${certId}/download`;
    window.location.href = url;
  } catch (error) {
    showError("Failed to download certificate");
  }
}

export async function uploadCertificate(certId, formData) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/certificates/${certId}/upload`,
      "POST",
      formData,
    );
    showSuccess("Certificate uploaded successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to upload certificate");
  }
}
