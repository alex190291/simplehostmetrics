// /static/npm/modals/ProxyHostModals.js
import { switchTab, closeModals } from "/static/npm/NPMUtils.js";
import { loadTemplate, processTemplate } from "../utils/TemplateLoader.js";

import {
  showSuccess,
  showError,
  populateCertificateDropdown,
  handleCertificateCreation,
} from "../NPMUtils.js";

// Cache for loaded templates
let proxyHostFormTemplate = null;

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

// Load templates if not already loaded
async function ensureTemplatesLoaded() {
  if (!proxyHostFormTemplate) {
    proxyHostFormTemplate = await loadTemplate("/static/npm/templates/proxy-host-form.html");
  }
}

// Generate form HTML for host configuration - using templates now
async function generateProxyHostFormHTML(host = null) {
  await ensureTemplatesLoaded();

  const isEdit = host !== null;
  const templateData = {
    idField: isEdit ? `<input type="hidden" name="host_id" value="${host.id}">` : "",
    domainNames: isEdit ? host.domain_names.join(", ") : "",
    forwardHost: isEdit ? host.forward_host : "",
    forwardPort: isEdit ? host.forward_port : "",
    forwardSchemeHttp: isEdit && host.forward_scheme === "http" ? "selected" : "",
    forwardSchemeHttps: isEdit && host.forward_scheme === "https" ? "selected" : "",
    cacheAssets: isEdit && host.cache_assets ? "checked" : "",
    websocketsSupport: isEdit && host.allow_websocket_upgrade ? "checked" : "",
    blockExploits: isEdit && host.block_exploits ? "checked" : "",
    sslForced: isEdit && host.ssl_forced ? "checked" : "",
    http2Support: isEdit && host.http2_support ? "checked" : "",
    hstsEnabled: isEdit && host.hsts_enabled ? "checked" : "",
    hstsSubdomains: isEdit && host.hsts_subdomains ? "checked" : "",
    customConfig: isEdit && host.custom_config ? host.custom_config : "",
    submitBtnText: isEdit ? "Update Host" : "Add Host"
  };

  return processTemplate(proxyHostFormTemplate, templateData);
}

// Process form data from both add and edit forms
function processProxyHostFormData(formData) {
  const certificate_id_raw = formData.get("certificate_id");
  let certificate_id;
  if (certificate_id_raw === "") {
    certificate_id = null;
  } else if (certificate_id_raw === "new_nodns") {
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
export async function populateAddProxyHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = await generateProxyHostFormHTML(); // Now async
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
      if (certificate_id_raw === "new_nodns") { // Remove the "new_dns" || 
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

      form.innerHTML = await generateProxyHostFormHTML(host); // Now async
      modal.style.display = "flex";
      setupProxyHostForm(form, true);

      // Populate certificate and access list dropdowns with existing values
      const certSelect = form.querySelector("#certificate_id");
      populateCertificateDropdown(certSelect, host.certificate_id || "");


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
