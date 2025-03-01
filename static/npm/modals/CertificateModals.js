// /static/npm/modals/CertificateModals.js
import { closeModals, showError } from "../NPMUtils.js";

export function populateCertificateForm(certificate = null) {
  const form = document.getElementById("certificateForm");
  if (!form) {
    console.error("Certificate form not found");
    return;
  }

  form.innerHTML = generateCertificateFormHTML(certificate);
  setupCertificateForm(form, !!certificate);

  // Properly wire up the close button
  const closeButton = form.querySelector(".modal-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      closeModals();
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      
      // Prepare the certificate data for API
      const data = {
        provider: formData.get("provider"),
        nice_name: formData.get("nice_name"),
        domain_names: formData.get("domain_names").split(",").map(d => d.trim()),
        meta: {}
      };
      
      // Handle DNS challenge if enabled
      if (formData.get("dns_challenge")) {
        data.meta.dns_challenge = true;
        data.meta.dns_provider = formData.get("dns_provider");
        if (formData.get("api_key")) {
          data.meta.dns_provider_credentials = formData.get("api_key");
        }
      }
      
      // For Let's Encrypt, add required fields
      if (data.provider === "letsencrypt") {
        data.meta.letsencrypt_agree = true;
        data.meta.letsencrypt_email = "admin@example.com"; // Could be made configurable
      }
      
      // If it's a custom JSON in meta field, parse and merge it
      try {
        const metaJSON = formData.get("meta");
        if (metaJSON && metaJSON !== "{}") {
          const customMeta = JSON.parse(metaJSON);
          data.meta = {...data.meta, ...customMeta};
        }
      } catch (jsonError) {
        showError("Invalid JSON in meta field");
        throw jsonError;
      }

      // Import dynamically to avoid circular dependencies
      const CertificateManager = await import("../managers/CertificateManager.js");
      if (certificate) {
        await CertificateManager.updateCertificate(certificate.id, data);
      } else {
        await CertificateManager.createCertificate(data);
      }

      closeModals();
    } catch (error) {
      console.error("Form submission error:", error);
      showError("An error occurred: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = certificate ? "Update" : "Create";
    }
  };
}

// Modified to not require a specific certId for uploading new certificates
export function showUploadCertificateModal(certId = null) {
  const modalHTML = `
    <div id="uploadCertificateModal" class="modal">
      <div class="modal-content">
        <h2>${certId ? 'Replace' : 'Upload'} Certificate</h2>
        <form id="uploadCertificateForm">
          ${!certId ? `
          <div class="form-group">
            <label for="certificate_name">Certificate Name</label>
            <input type="text" id="certificate_name" name="certificate_name" required placeholder="my.domain.com">
          </div>
          <div class="form-group">
            <label for="domain_names">Domain Names (comma-separated)</label>
            <input type="text" id="domain_names" name="domain_names" required placeholder="domain.com, www.domain.com">
          </div>
          ` : ''}
          <div class="form-group">
            <label for="certificate">Certificate File</label>
            <input type="file" id="certificate" name="certificate" required accept=".crt,.pem,.cert">
          </div>
          <div class="form-group">
            <label for="certificate_key">Certificate Key File</label>
            <input type="file" id="certificate_key" name="certificate_key" required accept=".key,.pem">
          </div>
          <input type="hidden" name="certId" value="${certId || ''}">
          <div class="form-actions">
            <button type="submit" class="btn-primary">Upload</button>
            <button type="button" class="btn-secondary modal-close">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Create and add modal if it doesn't exist
  let modal = document.getElementById("uploadCertificateModal");
  if (modal) {
    document.body.removeChild(modal);
  }
  
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = modalHTML;
  modal = tempDiv.firstElementChild;
  document.body.appendChild(modal);
  modal.style.display = "flex";

  // Setup form submit and close button
  const form = document.getElementById("uploadCertificateForm");
  const closeBtn = modal.querySelector(".modal-close");
  
  closeBtn.addEventListener("click", () => {
    closeModals();
  });
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";
    
    try {
      const formData = new FormData(form);
      const CertificateManager = await import("../managers/CertificateManager.js");
      
      const specificCertId = formData.get("certId");
      
      if (specificCertId) {
        // Upload to existing certificate
        await CertificateManager.uploadCertificate(specificCertId, formData);
      } else {
        // Create new certificate with uploaded files
        await CertificateManager.uploadNewCertificate(formData);
      }
      
      closeModals();
    } catch (error) {
      showError("Upload failed: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Upload";
    }
  };
}

function generateCertificateFormHTML(certificate = null) {
  const isEdit = certificate !== null;
  const provider = isEdit ? certificate.provider : "letsencrypt";
  const niceName = isEdit ? certificate.nice_name : "";
  const domainNames = isEdit ? certificate.domain_names.join(", ") : "";
  const dnsChallenge = isEdit && certificate.meta && certificate.meta.dns_challenge ? true : false;
  const dnsProvider = isEdit && certificate.meta ? certificate.meta.dns_provider || "" : "";
  const apiKey = isEdit && certificate.meta ? certificate.meta.dns_provider_credentials || "" : "";
  const meta = isEdit ? JSON.stringify(certificate.meta || {}, null, 2) : "{}";

  return `
    <div class="form-group">
      <label for="provider">Provider</label>
      <select id="provider" name="provider" required>
        <option value="letsencrypt" ${provider === "letsencrypt" ? "selected" : ""}>Let's Encrypt</option>
        <option value="other" ${provider === "other" ? "selected" : ""}>Other</option>
      </select>
    </div>
    <div class="form-group">
      <label for="nice_name">Nice Name</label>
      <input type="text" id="nice_name" name="nice_name" value="${niceName}" placeholder="my.domain.com">
    </div>
    <div class="form-group">
      <label for="domain_names">Domain Names (comma-separated)</label>
      <input type="text" id="domain_names" name="domain_names" value="${domainNames}" required placeholder="domain.com, www.domain.com">
    </div>
    
    <!-- Replace checkbox with toggle switch -->
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="dns_challenge" name="dns_challenge" ${dnsChallenge ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">Enable DNS Challenge</span>
      </label>
    </div>
    
    <div class="form-group" id="dns_provider_group" style="display: ${dnsChallenge ? "block" : "none"}">
      <label for="dns_provider">DNS Challenge Provider</label>
      <select id="dns_provider" name="dns_provider">
        <option value="">Select Provider</option>
        <option value="acmedns" ${dnsProvider === "acmedns" ? "selected" : ""}>ACME-DNS</option>
        <option value="cloudflare" ${dnsProvider === "cloudflare" ? "selected" : ""}>Cloudflare</option>
        <option value="digitalocean" ${dnsProvider === "digitalocean" ? "selected" : ""}>DigitalOcean</option>
      </select>
    </div>
    <div class="form-group" id="api_key_group" style="display: ${dnsProvider ? "block" : "none"}">
      <label for="api_key">API Key</label>
      <input type="text" id="api_key" name="api_key" value="${apiKey}">
    </div>
    <div class="form-group">
      <label for="meta">Meta (JSON)</label>
      <textarea id="meta" name="meta" placeholder='{}'>${meta}</textarea>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">${isEdit ? "Update" : "Create"} Certificate</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

function setupCertificateForm(form) {
  // Show/Hide DNS provider and API key fields based on toggle
  const dnsChallengeCheckbox = form.querySelector("#dns_challenge");
  dnsChallengeCheckbox.addEventListener("change", () => {
    const dnsProviderGroup = form.querySelector("#dns_provider_group");
    const apiKeyGroup = form.querySelector("#api_key_group");
    if (dnsChallengeCheckbox.checked) {
      dnsProviderGroup.style.display = "block";
    } else {
      dnsProviderGroup.style.display = "none";
      apiKeyGroup.style.display = "none";
      form.querySelector("#dns_provider").value = "";
      form.querySelector("#api_key").value = "";
    }
  });

  // Show API key field based on provider selection
  const dnsProviderSelect = form.querySelector("#dns_provider");
  dnsProviderSelect.addEventListener("change", () => {
    const apiKeyGroup = form.querySelector("#api_key_group");
    if (dnsProviderSelect.value) {
      apiKeyGroup.style.display = "block";
    } else {
      apiKeyGroup.style.display = "none";
    }
  });

  // Add test button for domain HTTP reachability
  const domainInput = form.querySelector("#domain_names");
  const testButton = document.createElement("button");
  testButton.type = "button";
  testButton.className = "btn-secondary test-button";
  testButton.textContent = "Test HTTP Reachability";
  testButton.style.marginLeft = "10px";
  testButton.addEventListener("click", async () => {
    const domains = domainInput.value.split(",").map(d => d.trim()).filter(d => d);
    if (domains.length > 0) {
      try {
        const CertificateManager = await import("../managers/CertificateManager.js");
        CertificateManager.testHttpReach(domains);
      } catch (error) {
        showError("Test failed: " + error.message);
      }
    } else {
      showError("Please enter at least one domain name");
    }
  });
  
  domainInput.parentNode.appendChild(testButton);
}
