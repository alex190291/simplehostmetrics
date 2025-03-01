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
      
      // Get initial certificates list to compare later
      let initialCerts = [];
      try {
        initialCerts = await makeRequest("/npm-api", "/nginx/certificates");
      } catch (error) {
        console.warn("Couldn't get initial certificates list:", error);
      }
      
      // Prepare the certificate data for API
      const data = {
        provider: formData.get("provider"),
        nice_name: formData.get("nice_name"),
        domain_names: formData.get("domain_names").split(",").map(d => d.trim()),
        meta: {
          letsencrypt_agree: true,
          letsencrypt_email: formData.get("email") || "admin@example.com"
        }
      };
      
      // Handle DNS challenge if enabled
      if (formData.get("dns_challenge") === "on") {
        data.meta.dns_challenge = true;
        const dnsProvider = formData.get("dns_provider");
        data.meta.dns_provider = dnsProvider;
        
        // Add credentials in the format required by the API
        const credentials = formData.get("dns_credentials");
        if (credentials) {
          data.meta.dns_provider_credentials = credentials;
          
          // Set propagation seconds if specified
          const propagationSeconds = formData.get("propagation_seconds");
          if (propagationSeconds) {
            data.meta.propagation_seconds = parseInt(propagationSeconds, 10);
          }
        }
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

      // Create or update certificate
      let certId;
      if (certificate) {
        // Update existing certificate
        await CertificateManager.updateCertificate(certificate.id, data);
      } else {
        // Create new certificate
        certId = await CertificateManager.createCertificate(data);
        
        // For DNS challenges, check for success more aggressively
        if (data.meta.dns_challenge) {
          // Close modal right away to prevent UI interference
          closeModals();
          
          // Start a separate client-side monitoring for UI feedback
          monitorCertificateCreation(certId, initialCerts);
          return; // Exit early since we're handling this separately
        }
      }
      
      // Close modal after successful creation/update
      closeModals();
      
    } catch (error) {
      console.error("Form submission error:", error);
      showError("An error occurred: " + error.message);
      
      // Reset button state on error
      submitBtn.disabled = false;
      submitBtn.textContent = certificate ? "Update" : "Create";
    }
  };
}

/**
 * Monitor for certificate creation by comparing certificate lists
 * @param {number} expectedCertId - ID of the certificate we're expecting
 * @param {Array} initialCerts - Initial list of certificates before creation
 */
async function monitorCertificateCreation(expectedCertId, initialCerts) {
  // Show a persistent notification that we're monitoring
  const notification = showInfo("Monitoring certificate creation...", true);
  
  // Maximum time to wait before giving up
  const maxWaitTime = 3 * 60 * 1000; // 3 minutes
  const startTime = Date.now();
  const checkInterval = 5000; // 5 seconds
  
  // Keep checking for certificate creation
  const checkForCertificate = async () => {
    try {
      // Stop if we've been trying too long
      if (Date.now() - startTime > maxWaitTime) {
        if (notification) notification.remove();
        return;
      }
      
      // Get current certificates list
      const currentCerts = await makeRequest("/npm-api", "/nginx/certificates");
      
      // Check if our certificate exists and is valid
      const ourCert = currentCerts.find(cert => cert.id === expectedCertId);
      if (ourCert && ourCert.expires_on) {
        // We found our certificate and it has an expiry date (valid)
        if (notification) notification.remove();
        showSuccess("Certificate created successfully!");
        return;
      }
      
      // Check if any new certificates appeared that match our domains
      // This covers the case where the ID might have changed
      if (initialCerts && initialCerts.length > 0) {
        const newCerts = currentCerts.filter(cert => 
          !initialCerts.some(oldCert => oldCert.id === cert.id));
          
        if (newCerts.length > 0) {
          // Found new certificates since we started, assume success
          if (notification) notification.remove();
          showSuccess("New certificate detected!");
          return;
        }
      }
      
      // Schedule next check
      setTimeout(checkForCertificate, checkInterval);
    } catch (error) {
      console.error("Error monitoring certificate creation:", error);
      if (notification) notification.remove();
    }
  };
  
  // Start the monitoring process
  checkForCertificate();
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
  const email = isEdit && certificate.meta ? certificate.meta.letsencrypt_email || "" : "";
  const dnsChallenge = isEdit && certificate.meta && certificate.meta.dns_challenge ? true : false;
  const dnsProvider = isEdit && certificate.meta ? certificate.meta.dns_provider || "" : "";
  const dnsCredentials = isEdit && certificate.meta ? certificate.meta.dns_provider_credentials || "" : "";
  const propagationSeconds = isEdit && certificate.meta ? certificate.meta.propagation_seconds || "60" : "60";
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
      <label for="nice_name">Certificate Name</label>
      <input type="text" id="nice_name" name="nice_name" value="${niceName}" placeholder="my.domain.com">
    </div>
    <div class="form-group">
      <label for="domain_names">Domain Names (comma-separated)</label>
      <input type="text" id="domain_names" name="domain_names" value="${domainNames}" required placeholder="domain.com, www.domain.com">
    </div>
    <div class="form-group">
      <label for="email">Email Address (for Let's Encrypt)</label>
      <input type="email" id="email" name="email" value="${email}" placeholder="admin@example.com">
    </div>
    
    <!-- DNS Challenge section -->
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="dns_challenge" name="dns_challenge" ${dnsChallenge ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">Enable DNS Challenge</span>
        <span class="help-text">(Use DNS validation instead of HTTP validation)</span>
      </label>
    </div>
    
    <div id="dns_challenge_settings" style="display: ${dnsChallenge ? "block" : "none"}">
      <div class="dns-challenge-info alert alert-info">
        <p><strong>DNS Challenge Information:</strong></p>
        <p>DNS challenge allows you to validate domain ownership via DNS records when HTTP validation is not possible.</p>
        <p>You'll need access to configure DNS records for your domain, either manually or via a supported DNS provider API.</p>
      </div>
      
      <div class="form-group">
        <label for="dns_provider">DNS Provider</label>
        <select id="dns_provider" name="dns_provider">
          <option value="">Select Provider</option>
        </select>
      </div>
      <div class="form-group">
        <label for="dns_credentials">Provider Credentials</label>
        <textarea id="dns_credentials" name="dns_credentials" rows="6" placeholder="Enter provider-specific credentials">${dnsCredentials}</textarea>
        <p class="help-text">Format depends on provider. Will be automatically populated based on selection.</p>
      </div>
      <div class="form-group">
        <label for="propagation_seconds">Propagation Wait Time (seconds)</label>
        <input type="number" id="propagation_seconds" name="propagation_seconds" value="${propagationSeconds}" min="30" step="1">
        <p class="help-text">DNS propagation can take time. Increase this value if validation fails.</p>
      </div>
    </div>
    
    <div class="form-group">
      <label for="meta">Advanced Settings (JSON)</label>
      <textarea id="meta" name="meta" placeholder='{}'>${meta}</textarea>
      <p class="help-text">Only modify if you know what you're doing.</p>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">${isEdit ? "Update" : "Create"} Certificate</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

function setupCertificateForm(form) {
  // Get DNS providers for dropdown
  loadDnsProviders().then(providers => {
    const select = form.querySelector("#dns_provider");
    if (select) {
      // Clear existing options except the first one
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add options for each provider
      Object.keys(providers).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = providers[key].name;
        select.appendChild(option);
      });
      
      // Set selected if value exists
      const currentValue = select.getAttribute('data-selected');
      if (currentValue) {
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value === currentValue) {
            select.selectedIndex = i;
            break;
          }
        }
      }
      
      // Add change handler to populate credentials template
      select.addEventListener('change', () => {
        const selectedProvider = select.value;
        if (selectedProvider && providers[selectedProvider]) {
          const credentialsTemplate = providers[selectedProvider].credentials;
          form.querySelector("#dns_credentials").value = credentialsTemplate;
        }
      });
      
      // Trigger change to populate template if a provider is already selected
      if (select.value) {
        select.dispatchEvent(new Event('change'));
      }
    }
  }).catch(err => {
    console.error('Failed to load DNS providers:', err);
  });
  
  // Show/Hide DNS challenge settings based on toggle
  const dnsChallengeCheckbox = form.querySelector("#dns_challenge");
  dnsChallengeCheckbox.addEventListener("change", () => {
    const dnsSettings = form.querySelector("#dns_challenge_settings");
    if (dnsChallengeCheckbox.checked) {
      dnsSettings.style.display = "block";
    } else {
      dnsSettings.style.display = "none";
    }
  });
}

// Load DNS providers from the JSON file
async function loadDnsProviders() {
  try {
    const response = await fetch("/static/npm/json/certbot-dns-plugins.json");
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading DNS providers:', error);
    return {};
  }
}
