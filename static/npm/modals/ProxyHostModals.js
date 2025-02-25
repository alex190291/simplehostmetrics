// /static/npm/modals/ProxyHostModals.js
import { switchTab, closeModals } from "./common.js";

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

    // Updated fetch URL to point to the correct location in your static folder.
    fetch("/static/npm/json/certbot-dns-plugins.json")
      .then((res) => res.json())
      .then((plugins) => {
        const optionsDiv = modal.querySelector("#dnsProviderOptions");
        optionsDiv.innerHTML = "";
        // Create a select element for providers
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
          resolve({ provider, credentials, wait_time });
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
// End DNS Challenge Modal Logic
// -------------------------

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
    // Append options for new certificate requests
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

export function populateAddHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = `
    <div class="tabs">
      <button type="button" class="btn btn-secondary tab-link active" data-tab="general">General</button>
      <button type="button" class="btn btn-secondary tab-link" data-tab="custom">Custom Nginx Config</button>
    </div>
    <div class="tab-content" id="generalTab">
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names" required>
      </div>
      <div class="form-group">
        <label for="forward_host">Forward Host</label>
        <input type="text" id="forward_host" name="forward_host" required>
      </div>
      <div class="form-group">
        <label for="forward_port">Forward Port</label>
        <input type="number" id="forward_port" name="forward_port" required>
      </div>
      <div class="form-group">
        <label for="forward_scheme">Upstream Scheme</label>
        <select id="forward_scheme" name="forward_scheme" required>
          <option value="http">http</option>
          <option value="https">https</option>
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
          <input type="checkbox" id="cache_assets" name="cache_assets">
          Cache Assets
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="websockets_support" name="websockets_support">
          Websockets Support
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="block_exploits" name="block_exploits">
          Block Common Exploits
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced">
          Force SSL
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="http2_support" name="http2_support">
          HTTP/2 Support
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="hsts_enabled" name="hsts_enabled">
          HSTS Enabled
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains">
          HSTS Subdomains
        </label>
      </div>
    </div>
    <div class="tab-content" id="customTab" style="display:none;">
      <div class="form-group">
        <label for="custom_config">Custom Nginx Config</label>
        <textarea id="custom_config" name="custom_config" rows="30"></textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Add Host</button>
      <button type="button" class="btn btn-secondary modal-close">Cancel</button>
    </div>
  `;
  // Attach tab switching event listeners
  const tabLinks = form.querySelectorAll(".tab-link");
  tabLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"), btn);
    });
  });
  // Attach modal close event listeners for the Cancel button
  form.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeModals);
  });
  // Populate dropdown menus
  const certSelect = form.querySelector("#certificate_id");
  populateCertificateDropdown(certSelect);
  const accessListSelect = form.querySelector("#access_list_id");
  populateAccessListDropdown(accessListSelect);

  form.onsubmit = (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    const formData = new FormData(form);
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

    const baseData = {
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

    function finishCreate(data) {
      import("../managers/ProxyHostManager.js").then((mod) => {
        mod
          .createProxyHost(data)
          .then(() => {
            document.getElementById("addHostModal").style.display = "none";
          })
          .catch((err) => {
            console.error("Failed to create host", err);
          })
          .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "Add Host";
          });
      });
    }

    if (certificate_id_raw === "new_dns") {
      openDnsChallengeModal()
        .then((dnsData) => {
          const newData = Object.assign({}, baseData, {
            dns_challenge: dnsData,
          });
          finishCreate(newData);
        })
        .catch((err) => {
          console.error("DNS challenge canceled or failed", err);
          submitBtn.disabled = false;
          submitBtn.textContent = "Add Host";
        });
    } else {
      finishCreate(baseData);
    }
  };
}

export async function editHostModal(host) {
  const modal = document.getElementById("addHostModal");
  const form = document.getElementById("addHostForm");
  form.innerHTML = `
    <input type="hidden" name="host_id" value="${host.id}">
    <div class="tabs">
      <button type="button" class="btn btn-secondary tab-link active" data-tab="general">General</button>
      <button type="button" class="btn btn-secondary tab-link" data-tab="custom">Custom Nginx Config</button>
    </div>
    <div class="tab-content" id="generalTab">
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names" value="${host.domain_names.join(", ")}" required>
      </div>
      <div class="form-group">
        <label for="forward_host">Forward Host</label>
        <input type="text" id="forward_host" name="forward_host" value="${host.forward_host}" required>
      </div>
      <div class="form-group">
        <label for="forward_port">Forward Port</label>
        <input type="number" id="forward_port" name="forward_port" value="${host.forward_port}" required>
      </div>
      <div class="form-group">
        <label for="forward_scheme">Upstream Scheme</label>
        <select id="forward_scheme" name="forward_scheme" required>
          <option value="http" ${host.forward_scheme === "http" ? "selected" : ""}>http</option>
          <option value="https" ${host.forward_scheme === "https" ? "selected" : ""}>https</option>
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
          <input type="checkbox" id="cache_assets" name="cache_assets" ${host.cache_assets ? "checked" : ""}>
          Cache Assets
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="websockets_support" name="websockets_support" ${host.websockets_support ? "checked" : ""}>
          Websockets Support
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="block_exploits" name="block_exploits" ${host.block_exploits ? "checked" : ""}>
          Block Common Exploits
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced" ${host.ssl_forced ? "checked" : ""}>
          Force SSL
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="http2_support" name="http2_support" ${host.http2_support ? "checked" : ""}>
          HTTP/2 Support
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${host.hsts_enabled ? "checked" : ""}>
          HSTS Enabled
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${host.hsts_subdomains ? "checked" : ""}>
          HSTS Subdomains
        </label>
      </div>
    </div>
    <div class="tab-content" id="customTab" style="display:none;">
      <div class="form-group">
        <label for="custom_config">Custom Nginx Config</label>
        <textarea id="custom_config" name="custom_config" rows="30">${host.custom_config || ""}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Update Host</button>
      <button type="button" class="btn btn-secondary modal-close">Cancel</button>
    </div>
  `;
  modal.style.display = "block";
  // Attach tab switching event listeners
  const tabLinks = form.querySelectorAll(".tab-link");
  tabLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"), btn);
    });
  });
  // Attach modal close event listeners for the Cancel button
  form.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeModals);
  });
  // Populate dropdown menus
  const certSelect = form.querySelector("#certificate_id");
  populateCertificateDropdown(certSelect, host.certificate_id || "");
  const accessListSelect = form.querySelector("#access_list_id");
  populateAccessListDropdown(accessListSelect, host.access_list_id || "");

  form.onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(form);
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

    const baseData = {
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

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    if (certificate_id_raw === "new_dns") {
      openDnsChallengeModal()
        .then((dnsData) => {
          const newData = Object.assign({}, baseData, {
            dns_challenge: dnsData,
          });
          import("../managers/ProxyHostManager.js").then((mod) => {
            mod
              .editProxyHost(host.id, newData)
              .then(() => {
                modal.style.display = "none";
              })
              .catch((err) => {
                console.error("Failed to update host", err);
              })
              .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = "Update Host";
              });
          });
        })
        .catch((err) => {
          console.error("DNS challenge canceled or failed", err);
          submitBtn.disabled = false;
          submitBtn.textContent = "Update Host";
        });
    } else {
      import("../managers/ProxyHostManager.js").then((mod) => {
        mod
          .editProxyHost(host.id, baseData)
          .then(() => {
            modal.style.display = "none";
          })
          .catch((err) => {
            console.error("Failed to update host", err);
          })
          .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "Update Host";
          });
      });
    }
  };
}
