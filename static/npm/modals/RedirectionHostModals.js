// simplehostmetrics/static/npm/modals/RedirectionHostModals.js
import { switchTab, closeModals } from "/static/npm/common.js";

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
      const baseData = processFormData(formData);

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
        await RedirectionHostManager.updateRedirectionHost(host.id, baseData);
      } else {
        await RedirectionHostManager.createRedirectionHost(baseData);
      }
      
      document.getElementById("redirectionHostModal").style.display = "none";
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
  // Fix: Properly initialize advanced_config to empty string if not present
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

      <!-- Replace checkboxes with toggle switches -->
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="ssl_forced" name="ssl_forced" ${sslForced ? "checked" : ""}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Force SSL</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${hstsEnabled ? "checked" : ""}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HSTS Enabled</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${hstsSubdomains ? "checked" : ""}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Include Subdomains</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="http2_support" name="http2_support" ${http2Support ? "checked" : ""}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HTTP/2 Support</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="block_exploits" name="block_exploits" ${blockExploits ? "checked" : ""}>
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Block Exploits</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="enabled" name="enabled" ${enabled ? "checked" : ""}>
            <span class="slider"></span>
          </span>
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
// Certificate Management
// -------------------------
async function populateCertificateDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/certificates");
    if (!response.ok) throw new Error("Failed to load certificates");
    const certificates = await response.json();

    selectElement.innerHTML = certificates
      .map(
        (
          cert,
        ) => `<option value="${cert.id}" ${cert.id === selectedValue ? "selected" : ""}>
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

// DNS Challenge Modal - Similar to ProxyHostModals.js implementation
function openDnsChallengeModal() {
  return new Promise((resolve, reject) => {
    let modal = document.getElementById("dnsChallengeModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "dnsChallengeModal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-content">
          <h2>Select DNS Provider</h2>
          <div id="dnsProviderOptions"></div>
          <div class="form-group">
            <label for="dnsCredentials">API Credentials</label>
            <textarea id="dnsCredentials" name="dnsCredentials" rows="4" placeholder="Enter credentials exactly as required"></textarea>
          </div>
          <div class="form-group">
            <label for="dnsWaitTime">Waiting Time (seconds)</label>
            <input type="number" id="dnsWaitTime" name="dnsWaitTime" value="20" min="5">
          </div>
          <div class="form-actions">
            <button id="dnsConfirm" class="btn btn-primary">Confirm</button>
            <button id="dnsCancel" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.style.display = "flex";

    // Load DNS provider options
    fetch("/static/npm/json/certbot-dns-plugins.json")
      .then((res) => res.json())
      .then((plugins) => {
        const optionsDiv = modal.querySelector("#dnsProviderOptions");
        optionsDiv.innerHTML = "";
        const select = document.createElement("select");
        select.id = "dnsProviderSelect";
        for (const key in plugins) {
          const opt = document.createElement("option");
          opt.value = key;
          opt.textContent = plugins[key].name;
          select.appendChild(opt);
        }
        optionsDiv.appendChild(select);

        modal.querySelector("#dnsConfirm").onclick = () => {
          const provider = document.getElementById("dnsProviderSelect").value;
          const credentials = document
            .getElementById("dnsCredentials")
            .value.trim();
          const wait_time = parseInt(
            document.getElementById("dnsWaitTime").value,
            10,
          );
          modal.style.display = "none";
          resolve({
            provider: provider,
            credentials: credentials,
            wait_time: wait_time,
          });
        };
        modal.querySelector("#dnsCancel").onclick = () => {
          modal.style.display = "none";
          reject(new Error("DNS challenge canceled by user."));
        };
      })
      .catch((err) => {
        modal.style.display = "none";
        reject(err);
      });
  });
}

// -------------------------
// Form Handling
// -------------------------
function setupRedirectionForm(form, isEdit = false) {
  // Tab functionality
  form.querySelectorAll(".tab-link").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab, btn));
  });

  // // Close button
  // form.querySelectorAll(".modal-close").forEach((btn) => {
  //   btn.addEventListener("click", closeModals);
  // });

  // Certificate dropdown
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
    let certPayload = {
      provider: "letsencrypt",
      domain_names: domainNames,
    };

    // Handle DNS challenge if selected
    if (useDnsChallenge) {
      try {
        const dnsData = await openDnsChallengeModal();
        certPayload.dns_challenge = {
          provider: dnsData.provider,
          credentials: dnsData.credentials,
          wait_time: dnsData.wait_time,
        };
      } catch (err) {
        console.error("Failed to configure DNS challenge", err);
        throw err;
      }
    }

    // Create certificate
    const response = await fetch("/npm-api/nginx/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(certPayload),
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
        ssl_forced: formData.has("ssl_forced"),
        hsts_enabled: formData.has("hsts_enabled"),
        hsts_subdomains: formData.has("hsts_subdomains"),
        http2_support: formData.has("http2_support"),
        block_exploits: formData.has("block_exploits"),
        advanced_config: formData.get("advanced_config") || "", // Fix: Ensure it's never undefined
        enabled: formData.has("enabled"),
      };

      // Handle certificate creation if needed
      try {
        const certId = formData.get("certificate_id");
        if (certId.startsWith("new_")) {
          baseData.certificate_id = await handleCertificateCreation(
            baseData.domain_names,
            certId,
          );
        } else {
          baseData.certificate_id = certId === "" ? null : parseInt(certId);
        }

        modal.remove();
        resolve(baseData);
      } catch (error) {
        console.error("Form submission error:", error);
        alert("An error occurred: " + error.message);
      }
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

    // Fix: Make sure advanced_config is initialized properly
    if (host.advanced_config === undefined) {
      host.advanced_config = "";
    }

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

        try {
          // Fix: Properly handle advanced_config to prevent undefined
          const customConfig = formData.get("advanced_config");

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
            ssl_forced: formData.has("ssl_forced"),
            hsts_enabled: formData.has("hsts_enabled"),
            hsts_subdomains: formData.has("hsts_subdomains"),
            http2_support: formData.has("http2_support"),
            block_exploits: formData.has("block_exploits"),
            advanced_config: customConfig || "", // Fix: Ensure it's never undefined
            enabled: formData.has("enabled"),
          };

          // Handle certificate selection/creation
          const certId = formData.get("certificate_id");
          if (certId.startsWith("new_")) {
            updatedData.certificate_id = await handleCertificateCreation(
              updatedData.domain_names,
              certId,
            );
          } else {
            updatedData.certificate_id =
              certId === "" ? null : parseInt(certId);
          }

          modal.remove();
          resolve(updatedData);
        } catch (error) {
          console.error("Form update error:", error);
          alert("An error occurred: " + error.message);
        }
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
