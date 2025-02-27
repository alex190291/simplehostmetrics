// /static/npm/modals/RedirectionHostModals.js
import { makeRequest } from "../NPMService.js";
import { closeModals, switchTab } from "./common.js";
import * as Views from "../NPMViews.js";

// Helper function to generate the redirection host form HTML
function generateRedirectionHostFormHTML(host = null) {
  const isEdit = host !== null;
  const idField = isEdit
    ? `<input type="hidden" name="host_id" value="${host.id}">`
    : "";
  const domainNames = isEdit ? host.domain_names.join(", ") : "";
  const forwardHttpCode = isEdit ? host.forward_http_code : "301";
  const forwardDomainName = isEdit ? host.forward_domain_name : "";
  const forwardSchemeAuto =
    isEdit && host.forward_scheme === "auto" ? "selected" : "";
  const forwardSchemeHttp =
    isEdit && host.forward_scheme === "http" ? "selected" : "";
  const forwardSchemeHttps =
    isEdit && host.forward_scheme === "https" ? "selected" : "";
  const preservePathYes = isEdit && host.preserve_path ? "selected" : "";
  const preservePathNo = isEdit && !host.preserve_path ? "selected" : "";
  const sslForced = isEdit && host.ssl_forced ? "checked" : "";
  const hstsEnabled = isEdit && host.hsts_enabled ? "checked" : "";
  const hstsSubdomains = isEdit && host.hsts_subdomains ? "checked" : "";
  const http2Support = isEdit && host.http2_support ? "checked" : "";
  const blockExploits = isEdit && host.block_exploits ? "checked" : "";
  const advancedConfig =
    isEdit && host.advanced_config ? host.advanced_config : "";
  const enabled = isEdit ? (host.enabled ? "checked" : "") : "checked";
  const meta = isEdit ? JSON.stringify(host.meta || {}, null, 2) : "{}";
  const submitBtnText = isEdit
    ? "Update Redirection Host"
    : "Create Redirection Host";

  return `
    ${idField}
    <div class="tabs">
      <button type="button" class="btn btn-secondary tab-link active" data-tab="general">General</button>
      <button type="button" class="btn btn-secondary tab-link" data-tab="ssl">SSL</button>
      <button type="button" class="btn btn-secondary tab-link" data-tab="advanced">Advanced</button>
    </div>
    <div class="tab-content" id="generalTab">
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names" value="${domainNames}" required>
      </div>
      <div class="form-group">
        <label for="forward_http_code">Forward HTTP Code</label>
        <input type="number" id="forward_http_code" name="forward_http_code" value="${forwardHttpCode}" required>
      </div>
      <div class="form-group">
        <label for="forward_scheme">Forward Scheme</label>
        <select id="forward_scheme" name="forward_scheme" required>
          <option value="auto" ${forwardSchemeAuto}>Auto</option>
          <option value="http" ${forwardSchemeHttp}>HTTP</option>
          <option value="https" ${forwardSchemeHttps}>HTTPS</option>
        </select>
      </div>
      <div class="form-group">
        <label for="forward_domain_name">Forward Domain Name</label>
        <input type="text" id="forward_domain_name" name="forward_domain_name" value="${forwardDomainName}" required>
      </div>
      <div class="form-group">
        <label for="preserve_path">Preserve Path</label>
        <select id="preserve_path" name="preserve_path" required>
          <option value="true" ${preservePathYes}>Yes</option>
          <option value="false" ${preservePathNo}>No</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="enabled" name="enabled" ${enabled}>
          Enabled
        </label>
      </div>
    </div>
    <div class="tab-content" id="sslTab" style="display:none;">
      <div class="form-group">
        <label for="certificate_id">Certificate ID (or 'new')</label>
        <select id="certificate_id" name="certificate_id"></select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced" ${sslForced}>
          Force SSL
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${hstsEnabled}>
          HSTS Enabled
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${hstsSubdomains}>
          HSTS Subdomains
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="http2_support" name="http2_support" ${http2Support}>
          HTTP/2 Support
        </label>
      </div>
    </div>
    <div class="tab-content" id="advancedTab" style="display:none;">
      <div class="form-group">
        <label>
          <input type="checkbox" id="block_exploits" name="block_exploits" ${blockExploits}>
          Block Exploits
        </label>
      </div>
      <div class="form-group">
        <label for="advanced_config">Advanced Config</label>
        <textarea id="advanced_config" name="advanced_config" rows="10">${advancedConfig}</textarea>
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" rows="5" placeholder='{}'>${meta}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">${submitBtnText}</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

// Helper function to populate the certificate dropdown dynamically
async function populateCertificateDropdown(selectElement, selectedValue = "") {
  try {
    const certificates = await makeRequest("/npm-api", "/nginx/certificates");

    selectElement.innerHTML = '<option value="">None</option>';
    certificates.forEach((cert) => {
      const option = document.createElement("option");
      option.value = cert.id;
      option.textContent =
        cert.nice_name ||
        (cert.domain_names ? cert.domain_names.join(", ") : "") ||
        cert.provider ||
        `Certificate #${cert.id}`;

      if (cert.id == selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });

    // Add "new" certificate option
    const optionNew = document.createElement("option");
    optionNew.value = "new";
    optionNew.textContent = "Request New Certificate";
    if (selectedValue === "new") optionNew.selected = true;
    selectElement.appendChild(optionNew);
  } catch (error) {
    console.error("Failed to load certificates", error);
  }
}

// Setup the form with event listeners and populate dropdowns
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

  // Populate certificate dropdown
  const certSelect = form.querySelector("#certificate_id");
  let certId = "";

  if (isEdit && form.querySelector("input[name='host_id']")) {
    const hostId = form.querySelector("input[name='host_id']").value;
    makeRequest("/npm-api", `/nginx/redirection-hosts/${hostId}`)
      .then((host) => {
        certId = host.certificate_id || "";
        populateCertificateDropdown(certSelect, certId);
      })
      .catch((error) => {
        console.error("Error fetching host data:", error);
        populateCertificateDropdown(certSelect);
      });
  } else {
    populateCertificateDropdown(certSelect);
  }
}

// Process the form data for submission
function processRedirectionHostFormData(formData) {
  const certificateIdRaw = formData.get("certificate_id");
  let certificateId = null;

  if (certificateIdRaw && certificateIdRaw !== "") {
    certificateId =
      certificateIdRaw === "new" ? "new" : parseInt(certificateIdRaw);
  }

  const data = {
    domain_names: formData
      .get("domain_names")
      .split(",")
      .map((d) => d.trim()),
    forward_http_code: parseInt(formData.get("forward_http_code")),
    forward_scheme: formData.get("forward_scheme"),
    forward_domain_name: formData.get("forward_domain_name"),
    preserve_path: formData.get("preserve_path") === "true",
    enabled: formData.get("enabled") === "on",
    ssl_forced: formData.get("ssl_forced") === "on",
    hsts_enabled: formData.get("hsts_enabled") === "on",
    hsts_subdomains: formData.get("hsts_subdomains") === "on",
    http2_support: formData.get("http2_support") === "on",
    block_exploits: formData.get("block_exploits") === "on",
    advanced_config: formData.get("advanced_config"),
    meta: {},
  };

  if (certificateId !== null) {
    data.certificate_id = certificateId;
  }

  try {
    const metaValue = formData.get("meta");
    if (metaValue && metaValue.trim() !== "") {
      data.meta = JSON.parse(metaValue);
    }
  } catch (error) {
    console.error("Invalid JSON in meta field:", error);
  }

  return data;
}

// Show the modal for creating a new redirection host
export function showCreateRedirectionHostModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("redirectionHostModal");
    const form = modal.querySelector("form");

    form.innerHTML = generateRedirectionHostFormHTML();
    setupRedirectionHostForm(form, false);
    modal.style.display = "block";

    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = processRedirectionHostFormData(formData);
      modal.style.display = "none";
      resolve(data);
    };
  });
}

// Show the modal for editing an existing redirection host
export function showEditRedirectionHostModal(hostId) {
  return new Promise(async (resolve, reject) => {
    try {
      const host = await makeRequest(
        "/npm-api",
        `/nginx/redirection-hosts/${hostId}`,
      );

      const modal = document.getElementById("redirectionHostModal");
      if (!modal) {
        reject(new Error("Modal element not found"));
        return;
      }

      const form = modal.querySelector("form");
      if (!form) {
        reject(new Error("Form element not found in modal"));
        return;
      }

      form.innerHTML = generateRedirectionHostFormHTML(host);
      setupRedirectionHostForm(form, true);
      modal.style.display = "block";

      form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = processRedirectionHostFormData(formData);
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      console.error("Error preparing edit modal:", error);
      reject(error);
    }
  });
}
