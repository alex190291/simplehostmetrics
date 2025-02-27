// simplehostmetrics/static/npm/modals/RedirectionHostModals.js
import { switchTab, closeModals } from "./common.js";

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
  const customConfig = isEdit ? host.custom_config : "";
  const enabled = isEdit ? host.enabled : true;

  return `
    ${idField}
    <div class="tabs">
      <button type="button" class="btn btn-secondary tab-link active" data-tab="general">General</button>
      <button type="button" class="btn btn-secondary tab-link" data-tab="custom">Custom Nginx Config</button>
    </div>
    <div class="tab-content" id="generalTab" data-tab="general">
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
      <div class="form-group checkboxes">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced" ${sslForced ? "checked" : ""}>
          Force SSL
        </label>
        <label>
          <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${hstsEnabled ? "checked" : ""}>
          HSTS Enabled
        </label>
        <label>
          <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${hstsSubdomains ? "checked" : ""}>
          Include Subdomains
        </label>
        <label>
          <input type="checkbox" id="http2_support" name="http2_support" ${http2Support ? "checked" : ""}>
          HTTP/2 Support
        </label>
        <label>
          <input type="checkbox" id="block_exploits" name="block_exploits" ${blockExploits ? "checked" : ""}>
          Block Exploits
        </label>
        <label>
          <input type="checkbox" id="enabled" name="enabled" ${enabled ? "checked" : ""}>
          Enabled
        </label>
      </div>
    </div>
    <div class="tab-content" id="customTab" data-tab="custom" style="display:none;">
      <div class="form-group">
        <label for="custom_config">Custom Nginx Config</label>
        <textarea id="custom_config" name="custom_config" rows="30">${customConfig}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">${isEdit ? "Update" : "Create"} Redirection</button>
      <button type="button" class="btn btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

// -------------------------
// Certificate Management
// -------------------------
async function populateCertificateDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/certificates");
    if (!response.ok) throw new Error("Failed to load certificates");
    const certificates = await response.json();

    selectElement.innerHTML = certificates
      .map(
        (cert) =>
          `<option value="${cert.id}" ${cert.id === selectedValue ? "selected" : ""}>
            ${cert.nice_name || cert.domain_names?.join(", ") || cert.id}
          </option>`,
      )
      .join("");

    // Add certificate creation options
    const newCertOptions = `
      <option value="new_nodns">Create New Certificate (HTTP Challenge)</option>
      <option value="new_dns">Create New Certificate (DNS Challenge)</option>
    `;
    selectElement.innerHTML += newCertOptions;
  } catch (error) {
    console.error("Certificate loading failed:", error);
    selectElement.innerHTML = `<option value="">Error loading certificates</option>`;
  }
}

// -------------------------
// Form Handling
// -------------------------
function setupRedirectionForm(form, isEdit = false) {
  // Attach tab switching event listeners (same as ProxyHostModals.js)
  form.querySelectorAll(".tab-link").forEach((btn) => {
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
  populateCertificateDropdown(
    certSelect,
    isEdit ? form.querySelector("input[name='id']")?.value : "",
  );
}

async function handleCertificateCreation(domainNames, certOption) {
  if (!certOption.startsWith("new")) return certOption;

  try {
    const useDnsChallenge = certOption === "new_dns";
    const response = await fetch("/npm-api/nginx/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "letsencrypt",
        domain_names: domainNames,
        ...(useDnsChallenge && {
          dns_challenge: await openDnsChallengeModal(),
        }),
      }),
    });

    if (!response.ok) throw new Error("Certificate creation failed");
    const { id } = await response.json();
    return id;
  } catch (error) {
    console.error("Certificate creation error:", error);
    throw error;
  }
}

// -------------------------
// Modal Operations
// -------------------------
export function showCreateRedirectionHostModal() {
  return new Promise(async (resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Create Redirection Host</h2>
        <form id="redirectionHostForm"></form>
      </div>
    `;

    const form = modal.querySelector("#redirectionHostForm");
    form.innerHTML = generateRedirectionHostFormHTML();
    setupRedirectionForm(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const baseData = {
        domain_names: formData
          .get("domain_names")
          .split(",")
          .map((d) => d.trim()),
        forward_http_code: parseInt(formData.get("forward_http_code")),
        forward_scheme: formData.get("forward_scheme"),
        forward_domain_name: formData.get("forward_domain_name"),
        preserve_path: formData.get("preserve_path") === "true",
        certificate_id: await handleCertificateCreation(
          formData
            .get("domain_names")
            .split(",")
            .map((d) => d.trim()),
          formData.get("certificate_id"),
        ),
        ssl_forced: formData.has("ssl_forced"),
        hsts_enabled: formData.has("hsts_enabled"),
        hsts_subdomains: formData.has("hsts_subdomains"),
        http2_support: formData.has("http2_support"),
        block_exploits: formData.has("block_exploits"),
        custom_config: formData.get("custom_config"),
        enabled: formData.has("enabled"),
      };

      modal.remove();
      resolve(baseData);
    });

    document.body.appendChild(modal);
    modal.style.display = "flex";
  });
}

export async function showEditRedirectionHostModal(hostId) {
  try {
    const response = await fetch(`/npm-api/nginx/redirection-hosts/${hostId}`);
    if (!response.ok) throw new Error("Failed to fetch host");
    const host = await response.json();

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Edit Redirection Host</h2>
        <form id="redirectionHostForm"></form>
      </div>
    `;

    const form = modal.querySelector("#redirectionHostForm");
    form.innerHTML = generateRedirectionHostFormHTML(host);
    setupRedirectionForm(form, true);

    return new Promise((resolve) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedData = {
          ...host,
          domain_names: formData
            .get("domain_names")
            .split(",")
            .map((d) => d.trim()),
          forward_http_code: parseInt(formData.get("forward_http_code")),
          forward_scheme: formData.get("forward_scheme"),
          forward_domain_name: formData.get("forward_domain_name"),
          preserve_path: formData.get("preserve_path") === "true",
          certificate_id: await handleCertificateCreation(
            formData
              .get("domain_names")
              .split(",")
              .map((d) => d.trim()),
            formData.get("certificate_id"),
          ),
          ssl_forced: formData.has("ssl_forced"),
          hsts_enabled: formData.has("hsts_enabled"),
          hsts_subdomains: formData.has("hsts_subdomains"),
          http2_support: formData.has("http2_support"),
          block_exploits: formData.has("block_exploits"),
          custom_config: formData.get("custom_config"),
          enabled: formData.has("enabled"),
        };

        modal.remove();
        resolve(updatedData);
      });

      document.body.appendChild(modal);
      modal.style.display = "flex";
    });
  } catch (error) {
    console.error("Edit modal error:", error);
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
