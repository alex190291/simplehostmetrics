// /static/npm/modals/ProxyHostModals.js
import { switchTab, closeModals } from "/static/npm/NPMUtils.js";

import {
  showSuccess,
  showError,
  populateCertificateDropdown,
  openDnsChallengeModal,
  handleCertificateCreation,
} from "../NPMUtils.js";

// Helper function to populate the access list dropdown dynamically
async function populateAccessListDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/access-lists");
    if (!response.ok) {
      console.error("Failed to load access lists", response.statusText);
      return;
    }
    const accessLists = await response.json();
    selectElement.innerHTML = '<option value="">None</option>';
    accessLists.forEach((list) => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      if (list.id == selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load access lists", error);
  }
}

// Generate form HTML for host configuration - used by both add and edit modals
function generateProxyHostFormHTML(host = null) {
  const isEdit = host !== null;
  const idField = isEdit
    ? `<input type="hidden" name="host_id" value="${host.id}">`
    : "";
  const domainNames = isEdit ? host.domain_names.join(", ") : "";
  const forwardHost = isEdit ? host.forward_host : "";
  const forwardPort = isEdit ? host.forward_port : "";
  const forwardSchemeHttp =
    isEdit && host.forward_scheme === "http" ? "selected" : "";
  const forwardSchemeHttps =
    isEdit && host.forward_scheme === "https" ? "selected" : "";
  const cacheAssets = isEdit && host.cache_assets ? "checked" : "";
  // Fix: Use allow_websocket_upgrade instead of websockets_support to match API property
  const websocketsSupport =
    isEdit && host.allow_websocket_upgrade ? "checked" : "";
  const blockExploits = isEdit && host.block_exploits ? "checked" : "";
  const sslForced = isEdit && host.ssl_forced ? "checked" : "";
  const http2Support = isEdit && host.http2_support ? "checked" : "";
  const hstsEnabled = isEdit && host.hsts_enabled ? "checked" : "";
  const hstsSubdomains = isEdit && host.hsts_subdomains ? "checked" : "";
  const customConfig = isEdit && host.custom_config ? host.custom_config : "";
  const submitBtnText = isEdit ? "Update Host" : "Add Host";

  // Make sure all checkboxes are replaced with toggle switches
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
        <label for="forward_host">Forward Host</label>
        <input type="text" id="forward_host" name="forward_host" value="${forwardHost}" required>
      </div>
      <div class="form-group">
        <label for="forward_port">Forward Port</label>
        <input type="number" id="forward_port" name="forward_port" value="${forwardPort}" required>
      </div>
      <div class="form-group">
        <label for="forward_scheme">Upstream Scheme</label>
        <select id="forward_scheme" name="forward_scheme" required>
          <option value="http" ${forwardSchemeHttp}>http</option>
          <option value="https" ${forwardSchemeHttps}>https</option>
        </select>
      </div>
      <div class="form-group">
        <label for="certificate_id">Certificate</label>
        <select id="certificate_id" name="certificate_id" required></select>
      </div>
      <div class="form-group">
        <label for="access_list_id">Access List</label>
        <select id="access_list_id" name="access_list_id">
          <option value="">None</option>
        </select>
      </div>

      <!-- Toggle switches instead of checkboxes -->
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="cache_assets" name="cache_assets" ${cacheAssets}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Cache Assets</span>
        </label>
      </div>

      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="websockets_support" name="websockets_support" ${websocketsSupport}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Websockets Support</span>
        </label>
      </div>

      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="block_exploits" name="block_exploits" ${blockExploits}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Block Common Exploits</span>
        </label>
      </div>

      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="ssl_forced" name="ssl_forced" ${sslForced}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Force SSL</span>
        </label>
      </div>

      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="http2_support" name="http2_support" ${http2Support}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HTTP/2 Support</span>
        </label>
      </div>

      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${hstsEnabled}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HSTS Enabled</span>
        </label>
      </div>

      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${hstsSubdomains}>

}div>
    </div>
    <div class="tab-content" id="customTab" style="display:none;">
      <div class="form-group">
        <label for="custom_config">Custom Nginx Config</label>
        <textarea id="custom_config" name="custom_config" rows="30">${customConfig}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">${submitBtnText}</button>
      <button type="button" class="btn btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

// Process form data from both add and edit forms
function processProxyHostFormData(formData) {
  const certificate_id_raw = formData.get("certificate_id");
  let certificate_id;
  if (certificate_id_raw === "") {
    certificate_id = null;
  } else if (
    certificate_id_raw === "new_dns" ||
    certificate_id_raw === "new_nodns"
  ) {
    certificate_id = "new";
  } else {
    certificate_id = parseInt(certificate_id_raw);
  }
  const access_list_id_raw = formData.get("access_list_id");
  const access_list_id =
    access_list_id_raw === "" ? null : parseInt(access_list_id_raw);

  return {
    domain_names: formData
      .get("domain_names")
      .split(",")
      .map((d) => d.trim()),
    forward_host: formData.get("forward_host"),
    forward_port: parseInt(formData.get("forward_port")),
    forward_scheme: formData.get("forward_scheme"),
    certificate_id: certificate_id,
    access_list_id: access_list_id,
    caching_enabled: formData.get("cache_assets") === "on",
    allow_websocket_upgrade: formData.get("websockets_support") === "on",
    block_exploits: formData.get("block_exploits") === "on",
    ssl_forced: formData.get("ssl_forced") === "on",
    http2_support: formData.get("http2_support") === "on",
    hsts_enabled: formData.get("hsts_enabled") === "on",
    hsts_subdomains: formData.get("hsts_subdomains") === "on",
    advanced_config: formData.get("custom_config"),
  };
}

// Setup form for both add and edit
function setupProxyHostForm(form, isEdit = false) {
  // Attach tab switching event listeners
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

  // Populate dropdown menus
  const certSelect = form.querySelector("#certificate_id");
  const accessListSelect = form.querySelector("#access_list_id");

  if (isEdit) {
    const hostId = form.querySelector("input[name='host_id']").value;
    populateCertificateDropdown(certSelect, hostId);
  } else {
    populateCertificateDropdown(certSelect);
  }

  populateAccessListDropdown(accessListSelect);
}

// -------------------------
// Add Host Flow
// -------------------------
export function populateAddProxyHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = generateProxyHostFormHTML();
  setupProxyHostForm(form, false);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      const baseData = processProxyHostFormData(formData);
      const certificate_id_raw = formData.get("certificate_id");

      // Handle certificate creation if needed
      if (
        certificate_id_raw === "new_dns" ||
        certificate_id_raw === "new_nodns"
      ) {
        try {
          baseData.certificate_id = await handleCertificateCreation(
            baseData.domain_names,
            certificate_id_raw,
          );
        } catch (err) {
          showError("Failed to create certificate");
          console.error("Failed to create certificate", err);
          throw err;
        }
      }

      // Create the proxy host
      const ProxyHostManager = await import("../managers/ProxyHostManager.js");
      await ProxyHostManager.createProxyHost(baseData);
      document.getElementById("addHostModal").style.display = "none";
    } catch (err) {
      console.error("Failed to create host", err);
      showError("Failed to create host");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Host";
    }
  };
}

// -------------------------
// Edit Host Flow
// -------------------------
export async function editProxyHostModal(hostIdOrObject) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if we received just an ID or a complete host object
      let host = hostIdOrObject;

      // If we just got an ID, fetch the complete host data
      if (
        typeof hostIdOrObject === "number" ||
        typeof hostIdOrObject === "string"
      ) {
        const response = await fetch(
          `/npm-api/nginx/proxy-hosts/${hostIdOrObject}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch host data: ${response.status}`);
        }
        host = await response.json();
      }

      // Now we have the complete host object, proceed with the modal
      const modal = document.getElementById("addHostModal");
      if (!modal) {
        throw new Error("Host modal element not found");
      }

      const form = document.getElementById("addHostForm");
      if (!form) {
        throw new Error("Host form element not found");
      }

      form.innerHTML = generateProxyHostFormHTML(host);
      modal.style.display = "flex";
      setupProxyHostForm(form, true);

      // Populate certificate and access list dropdowns with existing values
      const certSelect = form.querySelector("#certificate_id");
      populateCertificateDropdown(certSelect, host.certificate_id || "");

      const accessListSelect = form.querySelector("#access_list_id");
      populateAccessListDropdown(accessListSelect, host.access_list_id || "");

      form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedData = processProxyHostFormData(formData);

        // Close the modal after form submission
        modal.style.display = "none";

        // Resolve the promise with the updated data
        resolve(updatedData);
      };

      // Also close the modal when Cancel button is clicked
      form.querySelector(".modal-close").addEventListener("click", () => {
        modal.style.display = "none";
        reject(new Error("Edit cancelled by user"));
      });
    } catch (error) {
      console.error("Error showing edit host modal:", error);
      showError(`Failed to edit host: ${error.message}`);
      reject(error);
    }
  });
}
