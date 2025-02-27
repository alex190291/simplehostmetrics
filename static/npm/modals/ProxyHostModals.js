// /static/npm/modals/ProxyHostModals.js
import { switchTab, closeModals } from "static/npm/common.js";

// -------------------------
// DNS Challenge Modal Logic
// -------------------------
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

    // Correct URL to load the JSON file from static folder.
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
// Helper function to populate the certificate dropdown dynamically
async function populateCertificateDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/certificates");
    if (!response.ok) {
      console.error("Failed to load certificates", response.statusText);
      return;
    }
    const certificates = await response.json();
    selectElement.innerHTML = "";
    certificates.forEach((cert) => {
      const option = document.createElement("option");
      option.value = cert.id;
      option.textContent =
        cert.nice_name ||
        (cert.domain_names ? cert.domain_names.join(", ") : "") ||
        cert.provider ||
        cert.id;
      if (cert.id == selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
    const optionNoDns = document.createElement("option");
    optionNoDns.value = "new_nodns";
    optionNoDns.textContent = "Request New Certificate (No DNS Challenge)";
    selectElement.appendChild(optionNoDns);
    const optionDns = document.createElement("option");
    optionDns.value = "new_dns";
    optionDns.textContent = "Request New Certificate (DNS Challenge)";
    selectElement.appendChild(optionDns);
  } catch (error) {
    console.error("Failed to load certificates", error);
  }
}

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
function generateHostFormHTML(host = null) {
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
  const websocketsSupport = isEdit && host.websockets_support ? "checked" : "";
  const blockExploits = isEdit && host.block_exploits ? "checked" : "";
  const sslForced = isEdit && host.ssl_forced ? "checked" : "";
  const http2Support = isEdit && host.http2_support ? "checked" : "";
  const hstsEnabled = isEdit && host.hsts_enabled ? "checked" : "";
  const hstsSubdomains = isEdit && host.hsts_subdomains ? "checked" : "";
  const customConfig = isEdit && host.custom_config ? host.custom_config : "";
  const submitBtnText = isEdit ? "Update Host" : "Add Host";

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
      <div class="form-group">
        <label>
          <input type="checkbox" id="cache_assets" name="cache_assets" ${cacheAssets}>
          Cache Assets
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="websockets_support" name="websockets_support" ${websocketsSupport}>
          Websockets Support
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="block_exploits" name="block_exploits" ${blockExploits}>
          Block Common Exploits
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced" ${sslForced}>
          Force SSL
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="http2_support" name="http2_support" ${http2Support}>
          HTTP/2 Support
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
function processHostFormData(formData) {
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

// Create certificate helper
async function createCertificate(domainNames, hasDnsChallenge = false) {
  const certPayload = {
    provider: "letsencrypt",
    domain_names: domainNames,
  };

  if (hasDnsChallenge) {
    const dnsData = await openDnsChallengeModal();
    certPayload.dns_challenge = {
      provider: dnsData.provider,
      credentials: dnsData.credentials,
      wait_time: dnsData.wait_time,
    };
  }

  const certModule = await import("../managers/CertificateManager.js");
  return certModule.createCertificate(certPayload);
}

// Setup form for both add and edit
function setupHostForm(form, isEdit = false) {
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
export function populateAddHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = generateHostFormHTML();
  setupHostForm(form, false);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      const baseData = processHostFormData(formData);
      const certificate_id_raw = formData.get("certificate_id");

      // Handle certificate creation if needed
      if (certificate_id_raw === "new_dns") {
        try {
          const newCertId = await createCertificate(
            baseData.domain_names,
            true,
          );
          baseData.certificate_id = newCertId;
        } catch (err) {
          console.error("Failed to create certificate with DNS challenge", err);
          alert("Certificate creation failed: " + err.message);
          throw err;
        }
      } else if (certificate_id_raw === "new_nodns") {
        try {
          const newCertId = await createCertificate(
            baseData.domain_names,
            false,
          );
          baseData.certificate_id = newCertId;
        } catch (err) {
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
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Host";
    }
  };
}

// -------------------------
// Edit Host Flow
// -------------------------
export function editHostModal(host) {
  return new Promise((resolve) => {
    const modal = document.getElementById("addHostModal");
    const form = document.getElementById("addHostForm");

    form.innerHTML = generateHostFormHTML(host);
    modal.style.display = "flex";
    setupHostForm(form, true);

    // Populate certificate and access list dropdowns with existing values
    const certSelect = form.querySelector("#certificate_id");
    populateCertificateDropdown(certSelect, host.certificate_id || "");

    const accessListSelect = form.querySelector("#access_list_id");
    populateAccessListDropdown(accessListSelect, host.access_list_id || "");

    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const updatedData = processHostFormData(formData);
      resolve(updatedData);
    };
  });
}
//test
