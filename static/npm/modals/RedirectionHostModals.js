// simplehostmetrics/static/npm/modals/RedirectionHostModals.js
import { switchTab, closeModals } from "/static/npm/common.js";
import { 
  showSuccess, 
  showError, 
  populateCertificateDropdown, 
  handleCertificateCreation 
} from "../NPMUtils.js";

// -------------------------
// Form Population Functions
// -------------------------
export function populateRedirectionHostForm(host = null) {
  const form = document.getElementById("redirectionHostForm");
  if (!form) {
    console.error("Redirection host form not found");
    return;
  }

  form.innerHTML = generateRedirectionHostFormHTML(host);
  setupRedirectionForm(form, !!host);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      const baseData = processRedirectionFormData(formData);

      // Handle certificate creation if needed
      const certId = formData.get("certificate_id");
      if (certId.startsWith("new_")) {
        baseData.certificate_id = await handleCertificateCreation(
          baseData.domain_names,
          certId === "new_dns"
        );
      } else {
        baseData.certificate_id = certId === "" ? null : parseInt(certId);
      }

      // Create or update the redirection host
      const RedirectionHostManager = await import("../managers/RedirectionHostManager.js");
      if (host) {
        // Change from updateRedirectionHost to editRedirectionHost
        await RedirectionHostManager.editRedirectionHost(host.id, baseData);
      } else {
        await RedirectionHostManager.createRedirectionHost(baseData);
      }
      
      document.getElementById("redirectionHostModal").style.display = "none";
      closeModals();
    } catch (error) {
      console.error("Form submission error:", error);
      alert("An error occurred: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = host ? "Update" : "Create";
    }
  };
}

// -------------------------
// Form Generation Utilities
// -------------------------
function generateRedirectionHostFormHTML(host = null) {
  const isEdit = host !== null;
  const idField = isEdit
    ? `<input type="hidden" name="id" value="${host.id}">`
    : "";

  // Default values for form fields
  const domainNames = isEdit ? host.domain_names.join(", ") : "";
  const forwardHttpCode = isEdit ? host.forward_http_code : "301";
  const forwardScheme = isEdit ? host.forward_scheme : "auto";
  const forwardDomain = isEdit ? host.forward_domain_name : "";
  const preservePath = isEdit ? host.preserve_path : true;
  const sslForced = isEdit ? host.ssl_forced : false;
  const hstsEnabled = isEdit ? host.hsts_enabled : false;
  const hstsSubdomains = isEdit ? host.hsts_subdomains : false;
  const http2Support = isEdit ? host.http2_support : false;
  const blockExploits = isEdit ? host.block_exploits : false;
  const customConfig = isEdit && host.advanced_config ? host.advanced_config : "";
  const enabled = isEdit ? host.enabled : true;

  return `
    ${idField}
    <div class="tabs">
      <button type="button" class="btn btn-secondary tab-link active" data-tab="general">General</button>
      <button type="button" class="btn btn-secondary tab-link" data-tab="custom">Custom Nginx Config</button>
    </div>
    <div class="tab-content" id="generalTab">
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names" value="${domainNames}" required>
      </div>

      <div class="form-group">
        <label for="forward_http_code">Redirect HTTP Code</label>
        <select id="forward_http_code" name="forward_http_code" required>
          <option value="301" ${forwardHttpCode === "301" ? "selected" : ""}>301 - Permanent Redirect</option>
          <option value="302" ${forwardHttpCode === "302" ? "selected" : ""}>302 - Temporary Redirect</option>
        </select>
      </div>

      <div class="form-group">
        <label for="forward_scheme">Protocol</label>
        <select id="forward_scheme" name="forward_scheme" required>
          <option value="auto" ${forwardScheme === "auto" ? "selected" : ""}>Auto</option>
          <option value="http" ${forwardScheme === "http" ? "selected" : ""}>HTTP</option>
          <option value="https" ${forwardScheme === "https" ? "selected" : ""}>HTTPS</option>
        </select>
      </div>

      <div class="form-group">
        <label for="forward_domain_name">Destination Domain</label>
        <input type="text" id="forward_domain_name" name="forward_domain_name" value="${forwardDomain}" required>
      </div>

      <div class="form-group">
        <label for="preserve_path">Preserve Path</label>
        <select id="preserve_path" name="preserve_path" required>
          <option value="true" ${preservePath ? "selected" : ""}>Yes</option>
          <option value="false" ${!preservePath ? "selected" : ""}>No</option>
        </select>
      </div>

      <div class="form-group">
        <label for="certificate_id">SSL Certificate</label>
        <select id="certificate_id" name="certificate_id"></select>
      </div>

      <div class="form-group toggle">
        <label>
          <div class="toggle-switch">
            <input type="checkbox" id="ssl_forced" name="ssl_forced" ${sslForced ? "checked" : ""}>
            <span class="slider"></span>
          </div>
          <span class="toggle-label">Force SSL</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <div class="toggle-switch">
            <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${hstsEnabled ? "checked" : ""}>
            <span class="slider"></span>
          </div>
          <span class="toggle-label">HSTS Enabled</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <div class="toggle-switch">
            <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${hstsSubdomains ? "checked" : ""}>
            <span class="slider"></span>
          </div>
          <span class="toggle-label">Include Subdomains</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <div class="toggle-switch">
            <input type="checkbox" id="http2_support" name="http2_support" ${http2Support ? "checked" : ""}>
            <span class="slider"></span>
          </div>
          <span class="toggle-label">HTTP/2 Support</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <div class="toggle-switch">
            <input type="checkbox" id="block_exploits" name="block_exploits" ${blockExploits ? "checked" : ""}>
            <span class="slider"></span>
          </div>
          <span class="toggle-label">Block Exploits</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <div class="toggle-switch">
            <input type="checkbox" id="enabled" name="enabled" ${enabled ? "checked" : ""}>
            <span class="slider"></span>
          </div>
          <span class="toggle-label">Enabled</span>
        </label>
      </div>
    </div>
    <div class="tab-content" id="customTab" style="display:none;">
      <div class="form-group">
        <label for="advanced_config">Custom Nginx Config</label>
        <textarea id="advanced_config" name="advanced_config" rows="10">${customConfig}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">${isEdit ? "Update" : "Create"} Redirection</button>
      <button type="button" class="btn btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

// -------------------------
// Form Handling
// -------------------------
function setupRedirectionForm(form, isEdit = false) {
  // Tab functionality
  const tabLinks = form.querySelectorAll(".tab-link");
  tabLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"), btn);
    });
  });

  // Attach modal close event listeners
  form.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeModals);
  });

  // Certificate dropdown
  const certSelect = form.querySelector("#certificate_id");
  
  if (isEdit) {
    const hostId = form.querySelector("input[name='id']")?.value;
    populateCertificateDropdown(certSelect, hostId);
  } else {
    populateCertificateDropdown(certSelect);
  }
}

// Process form data from both create and edit forms
function processRedirectionFormData(formData) {
  // Convert form data to an object for API
  const data = {
    domain_names: formData.get("domain_names").split(",").map(d => d.trim()),
    forward_domain_name: formData.get("forward_domain"),
    forward_scheme: formData.get("forward_scheme"),
    forward_http_code: parseInt(formData.get("forward_http_code")),
    preserve_path: formData.get("preserve_path") === "true",
    ssl_forced: formData.has("ssl_forced"),
    hsts_enabled: formData.has("hsts_enabled"),
    hsts_subdomains: formData.has("hsts_subdomains"),
    http2_support: formData.has("http2_support"),
    block_exploits: formData.has("block_exploits"),
    advanced_config: formData.get("advanced_config") || "",
    enabled: formData.has("enabled"),
    meta: {}
  };
  return data;
}

// -------------------------
// Modal Operations
// -------------------------
export function showCreateRedirectionHostModal() {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.id = "redirectionHostModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Create Redirection Host</h2>
        <form id="redirectionHostForm"></form>
      </div>
    `;

    const form = modal.querySelector("#redirectionHostForm");
    form.innerHTML = generateRedirectionHostFormHTML();
    setupRedirectionForm(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Please wait...";

      try {
        const formData = new FormData(form);
        const baseData = processRedirectionFormData(formData);
        
        // Handle certificate creation if needed
        const certId = formData.get("certificate_id");
        if (certId.startsWith("new_")) {
          try {
            baseData.certificate_id = await handleCertificateCreation(
              baseData.domain_names,
              certId
            );
          } catch (err) {
            showError("Failed to create certificate");
            console.error("Failed to create certificate", err);
            throw err;
          }
        } else {
          baseData.certificate_id = certId === "" ? null : parseInt(certId);
        }

        modal.remove();
        resolve(baseData);
      } catch (error) {
        console.error("Form submission error:", error);
        showError("An error occurred: " + error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Redirection";
      }
    });

    document.body.appendChild(modal);
    modal.style.display = "flex";
  });
}

export async function editRedirectionHostModal(hostId) {
  try {
    const host = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}`).then(r => r.json());
    return new Promise((resolve, reject) => {
      const modal = document.getElementById("redirectionHostModal");
      const form = document.getElementById("redirectionHostForm");
      
      form.innerHTML = generateRedirectionHostFormHTML(host);
      modal.style.display = "flex";
      setupRedirectionForm(form, true);
      
      // Add form submission handling
      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = processRedirectionFormData(formData);
        modal.style.display = "none";
        resolve(data);
      };
    });
  } catch (error) {
    console.error("Failed to fetch redirection host data:", error);
    showError("Failed to load redirection host data");
    throw error;
  }
}

// Initialize modal close handlers
document.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("close") ||
    e.target.classList.contains("modal-close")
  ) {
    closeModals();
  }
});

// Export the module globally for easy access
window.RedirectionHostModals = {
  showCreateRedirectionHostModal,
  editRedirectionHostModal
};
