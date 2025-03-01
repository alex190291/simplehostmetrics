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

// Cache the template content
let proxyHostFormTemplate = null;

// Generate form HTML for host configuration - used by both add and edit modals
async function generateProxyHostFormHTML(host = null) {
  // Fetch the template if we haven't already
  if (!proxyHostFormTemplate) {
    try {
      const response = await fetch("/static/npm/templates/proxy-host-form.html");
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      proxyHostFormTemplate = await response.text();
    } catch (error) {
      console.error("Failed to load proxy host form template:", error);
      // Fall back to empty template
      proxyHostFormTemplate = "<div>Error loading template</div>";
    }
  }
  
  // Create a temporary container to manipulate the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = proxyHostFormTemplate;
  
  const isEdit = host !== null;
  
  // Update all the form fields with data
  if (isEdit) {
    // Set host ID for edit mode
    const idField = tempDiv.querySelector('#hostIdField');
    idField.value = host.id;
    
    // Set domain names
    const domainNamesInput = tempDiv.querySelector('#domain_names');
    domainNamesInput.value = host.domain_names.join(", ");
    
    // Set forward host and port
    tempDiv.querySelector('#forward_host').value = host.forward_host;
    tempDiv.querySelector('#forward_port').value = host.forward_port;
    
    // Set forward scheme
    const forwardSchemeSelect = tempDiv.querySelector('#forward_scheme');
    Array.from(forwardSchemeSelect.options).forEach(option => {
      option.selected = option.value === host.forward_scheme;
    });
    
    // Set all checkboxes
    if (host.cache_assets) tempDiv.querySelector('#cache_assets').checked = true;
    if (host.allow_websocket_upgrade) tempDiv.querySelector('#websockets_support').checked = true;
    if (host.block_exploits) tempDiv.querySelector('#block_exploits').checked = true;
    if (host.ssl_forced) tempDiv.querySelector('#ssl_forced').checked = true;
    if (host.http2_support) tempDiv.querySelector('#http2_support').checked = true;
    if (host.hsts_enabled) tempDiv.querySelector('#hsts_enabled').checked = true;
    if (host.hsts_subdomains) tempDiv.querySelector('#hsts_subdomains').checked = true;
    
    // Set custom config
    if (host.custom_config) {
      tempDiv.querySelector('#custom_config').value = host.custom_config;
    }
    
    // Set submit button text
    tempDiv.querySelector('#submitBtn').textContent = "Update Host";
  }
  
  return tempDiv.innerHTML;
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
