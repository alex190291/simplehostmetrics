// simplehostmetrics/static/npm/modals/RedirectionHostModals.js
import { 
  switchTab, 
  closeModals,
  showSuccess,   
  showError, 
  populateCertificateDropdown, 
  handleCertificateCreation,
  openDnsChallengeModal, 
} from "../NPMUtils.js";


// Cache the template content
let redirectionHostFormTemplate = null;

// Generate form HTML for redirection host configuration - used by both add and edit modals
async function generateRedirectionHostFormHTML(host = null) {
  // Fetch the template if we haven't already
  if (!RedirectionHostFormTemplate) {
    try {
      const response = await fetch("/static/npm/templates/redirection-host-form.html");
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      redirectionHostFormTemplate = await response.text();
    } catch (error) {
      console.error("Failed to load redirection host form template:", error);
      // Fall back to empty template
      redirectionHostFormTemplate = "<div>Error loading template</div>";
    }
  }
  
  // Create a temporary container to manipulate the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = redirectionHostFormTemplate;
  
  const isEdit = host !== null;
  
  // Update all the form fields with data
  if (isEdit) {
    // Set host ID for edit mode
    const idField = tempDiv.querySelector('#hostIdField');
    idField.value = host.id;
    
    // Set forward http code
    const forwardHttpCode = tempDiv.querySelector('#forward_http_code');
    Array.from(forwardHttpCode.options).forEach(option => {
      option.selected = option.value === host.forward_http_code;
    });

    // Set forward scheme
    const forwardSchemeSelect = tempDiv.querySelector('#forward_scheme');
    Array.from(forwardSchemeSelect.options).forEach(option => {
      option.selected = option.value === host.forward_scheme;
    });

    // Set domain names
    const domainNamesInput = tempDiv.querySelector('#domain_names');
    domainNamesInput.value = host.domain_names.join(", ");
    
    // Set forward http domain
    tempDiv.querySelector('#forward_domain_name').value = host.forward_domain_name;
        
    // Set all checkboxes
    if (host.ssl_forced) tempDiv.querySelector('#ssl_forced').checked = true;
    if (host.hsts_enabled) tempDiv.querySelector('#hsts_enabled').checked = true;
    if (host.hsts_subdomains) tempDiv.querySelector('#hsts_subdomains').checked = true;
    if (host.http2_support) tempDiv.querySelector('#http2_support').checked = true;
    if (host.block_exploits) tempDiv.querySelector('#block_exploits').checked = true;

    
    // Set custom config
    if (host.advanced_config) {
      tempDiv.querySelector('#advanced_config').value = host.advanced_config;
    }
    
    // Set submit button text
    tempDiv.querySelector('#submitBtn').textContent = "Update Redirection";
  }
  
  return tempDiv.innerHTML;
}

// Process form data from both add and edit forms
function processRedirectionHostFormData(formData) {
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
    forward_http_code: formData.get("forward_http_code"),
    forward_scheme: formData.get("forward_scheme"),
    forward_domain_name: formData.get("forward_domain_name"),
    preserve_path: formData.get("preserve_path") === "on",
    certificate_id: certificate_id,
    caching_enabled: formData.get("cache_assets") === "on",
    ssl_forced: formData.get("ssl_forced") === "on",
    hsts_enabled: formData.get("hsts_enabled") === "on",
    hsts_subdomains: formData.get("hsts_subdomains") === "on",
    http2_support: formData.get("http2_support") === "on",
    block_exploits: formData.get("block_exploits") === "on",
    advanced_config: formData.get("custom_config"),
  };
}

// Setup form for both add and edit
function setupRedirectionHostForm(form, isEdit = false) {
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

  if (isEdit) {
    const hostId = form.querySelector("input[name='host_id']").value;
    populateCertificateDropdown(certSelect, hostId);
  } else {
    populateCertificateDropdown(certSelect);
  }
 
}



// -------------------------
// Add Host Flow
// -------------------------
export function populateAddRedirectionHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = generateRedirectionHostFormHTML();
  setupRedirectionHostForm(form, false);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      const baseData = processRedirectionHostFormData(formData);
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

      // Create the redirection host
      const RedirectionHostManager = await import("../managers/RedirectionHostManager.js");
      await RedirectionHostManager.createRedirectionHost(baseData);
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
export async function editRedirectionHostModal(hostIdOrObject) {
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

      form.innerHTML = generateRedirectionHostFormHTML(host);
      modal.style.display = "flex";
      setupRedirectionHostForm(form, true);

      // Populate certificate and access list dropdowns with existing values
      const certSelect = form.querySelector("#certificate_id");
      populateCertificateDropdown(certSelect, host.certificate_id || "");

      const accessListSelect = form.querySelector("#access_list_id");
      populateAccessListDropdown(accessListSelect, host.access_list_id || "");

      form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedData = processRedirectionHostFormData(formData);

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