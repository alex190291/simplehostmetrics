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
```

```js simplehostmetrics/static/npm/modals/CertificateModals.js
// /static/npm/modals/CertificateModals.js
import { closeModals } from "./common.js";

export function showCreateCertificateModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("certificateModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="provider">Provider</label>
        <select id="provider" name="provider" required>
          <option value="letsencrypt">Let's Encrypt</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="nice_name">Nice Name</label>
        <input type="text" id="nice_name" name="nice_name">
      </div>
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names">
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Certificate</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        provider: form.querySelector("#provider").value,
        nice_name: form.querySelector("#nice_name").value,
        domain_names: form
          .querySelector("#domain_names")
          .value.split(",")
          .map((d) => d.trim()),
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showValidateCertificateModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("validateCertificateModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="certificate">Certificate File</label>
        <input type="file" id="certificate" name="certificate" required>
      </div>
      <div class="form-group">
        <label for="certificate_key">Certificate Key</label>
        <input type="file" id="certificate_key" name="certificate_key" required>
      </div>
      <div class="form-group">
        <label for="intermediate_certificate">Intermediate Certificate (optional)</label>
        <input type="file" id="intermediate_certificate" name="intermediate_certificate">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Validate Certificate</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      modal.style.display = "none";
      resolve(formData);
    };
  });
}

export function showUploadCertificateModal(certId) {
  return new Promise((resolve) => {
    const modal = document.getElementById("uploadCertificateModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <input type="hidden" name="cert_id" value="${certId}">
      <div class="form-group">
        <label for="certificate">Certificate File</label>
        <input type="file" id="certificate" name="certificate" required>
      </div>
      <div class="form-group">
        <label for="certificate_key">Certificate Key</label>
        <input type="file" id="certificate_key" name="certificate_key" required>
      </div>
      <div class="form-group">
        <label for="intermediate_certificate">Intermediate Certificate (optional)</label>
        <input type="file" id="intermediate_certificate" name="intermediate_certificate">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Upload Certificate</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      modal.style.display = "none";
      resolve(formData);
    };
  });
}
