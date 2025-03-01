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
import { loadTemplate, processTemplate } from "../utils/TemplateLoader.js";

// Cache for loaded templates
let redirectionHostFormTemplate = null;
let redirectionHostModalTemplate = null;

// Load templates if not already loaded
async function ensureTemplatesLoaded() {
  if (!redirectionHostFormTemplate) {
    redirectionHostFormTemplate = await loadTemplate("/static/npm/templates/redirection-host-form.html");
  }
  
  if (!redirectionHostModalTemplate) {
    redirectionHostModalTemplate = await loadTemplate("/static/npm/templates/redirection-host-modal.html");
  }
}

// Generate form HTML for redirection host configuration
async function generateRedirectionHostFormHTML(host = null) {
  await ensureTemplatesLoaded();
  
  const isEdit = host !== null;
  const templateData = {
    idField: isEdit ? `<input type="hidden" name="host_id" value="${host.id}">` : "",
    domainNames: isEdit ? host.domain_names.join(", ") : "",
    
    // HTTP Code selection
    forward301Selected: isEdit && host.forward_http_code === 301 ? "selected" : "",
    forward302Selected: isEdit && host.forward_http_code === 302 ? "selected" : "",
    
    // Scheme selection
    forwardSchemeHttp: isEdit && host.forward_scheme === "http" ? "selected" : "",
    forwardSchemeHttps: isEdit && host.forward_scheme === "https" ? "selected" : "",
    
    // Other fields
    forwardDomainName: isEdit ? host.forward_domain_name : "",
    preservePath: isEdit && host.preserve_path ? "checked" : "",
    blockExploits: isEdit && host.block_exploits ? "checked" : "",
    sslForced: isEdit && host.ssl_forced ? "checked" : "",
    http2Support: isEdit && host.http2_support ? "checked" : "",
    hstsEnabled: isEdit && host.hsts_enabled ? "checked" : "",
    hstsSubdomains: isEdit && host.hsts_subdomains ? "checked" : "",
    customConfig: isEdit && host.custom_config ? host.custom_config : "",
    submitBtnText: isEdit ? "Update Host" : "Add Host"
  };
  
  return processTemplate(redirectionHostFormTemplate, templateData);
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

  // Conform to the expected API format
  return {
    domain_names: formData
      .get("domain_names")
      .split(",")
      .map((d) => d.trim()),
    forward_http_code: parseInt(formData.get("forward_http_code")),
    forward_scheme: formData.get("forward_scheme"),
    forward_domain_name: formData.get("forward_domain_name"),
    preserve_path: formData.get("preserve_path") === "on",
    certificate_id: certificate_id,
    ssl_forced: formData.get("ssl_forced") === "on",
    hsts_enabled: formData.get("hsts_enabled") === "on",
    hsts_subdomains: formData.get("hsts_subdomains") === "on",
    http2_support: formData.get("http2_support") === "on",
    block_exploits: formData.get("block_exploits") === "on",
    advanced_config: formData.get("custom_config") || "",
    meta: {} // Required by API
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

// Update the ensureModalExists function to use the template
async function ensureModalExists() {
  let modal = document.getElementById("redirectionHostModal");
  
  if (!modal) {
    await ensureTemplatesLoaded();
    
    modal = document.createElement("div");
    modal.id = "redirectionHostModal";
    modal.className = "modal";
    modal.innerHTML = redirectionHostModalTemplate;
    document.body.appendChild(modal);
    
    // Give the browser a moment to add the element to the DOM
    setTimeout(() => {}, 0);
  }
  
  return modal;
}

// Update the beginning of populateAddRedirectionHostForm to be more robust
export async function populateAddRedirectionHostForm() {
  const modal = await ensureModalExists();
  
  // Make sure we can find the form - first try within the modal we just created
  let form = modal.querySelector("form#addRedirectionHostForm");
  
  // If not found, try document-wide search
  if (!form) {
    form = document.getElementById("addRedirectionHostForm");
  }
  
  // If still not found, create it
  if (!form) {
    form = document.createElement("form");
    form.id = "addRedirectionHostForm";
    modal.querySelector(".modal-content").appendChild(form);
  }
  
  // Add the crucial line to generate the form HTML content - now async
  form.innerHTML = await generateRedirectionHostFormHTML();
  
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
      document.getElementById("redirectionHostModal").style.display = "none";
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
      // Ensure modal exists
      const modal = await ensureModalExists();
      
      // Check if we received just an ID or a complete host object
      let host = hostIdOrObject;

      // If we just got an ID, fetch the complete host data
      if (
        typeof hostIdOrObject === "number" ||
        typeof hostIdOrObject === "string"
      ) {
        const response = await fetch(
          `/npm-api/nginx/redirection-hosts/${hostIdOrObject}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch host data: ${response.status}`);
        }
        host = await response.json();
      }

      // Get the form - first try within the modal directly
      let form = modal.querySelector("form#addRedirectionHostForm");
      
      // If not found, try document-wide search
      if (!form) {
        form = document.getElementById("addRedirectionHostForm");
      }
      
      // If still not found, create it
      if (!form) {
        form = document.createElement("form");
        form.id = "addRedirectionHostForm";
        modal.querySelector(".modal-content").appendChild(form);
      }

      // Generate and set HTML content for the form - now async
      form.innerHTML = await generateRedirectionHostFormHTML(host);
      
      // Display the modal
      modal.style.display = "flex";
      
      // Setup form functionality
      setupRedirectionHostForm(form, true);

      // Populate certificate dropdown with existing values
      const certSelect = form.querySelector("#certificate_id");
      populateCertificateDropdown(certSelect, host.certificate_id || "");

      // Set up form submission handler
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
      const closeBtn = form.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          modal.style.display = "none";
          reject(new Error("Edit cancelled by user"));
        });
      }
    } catch (error) {
      console.error("Error showing edit host modal:", error);
      showError(`Failed to edit redirection host: ${error.message}`);
      reject(error);
    }
  });
}