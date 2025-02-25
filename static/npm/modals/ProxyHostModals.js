// /static/npm/modals/ProxyHostModals.js
import { switchTab, closeModals } from "./common.js";

// Helper function to populate the certificate dropdown dynamically
async function populateCertificateDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/certificates");
    if (!response.ok) {
      console.error("Failed to load certificates", response.statusText);
      return;
    }
    const certificates = await response.json();
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
        <select id="certificate_id" name="certificate_id">
          <option value="">None</option>
          <option value="new_nodns">Request New Certificate (No DNS Challenge)</option>
          <option value="new_dns">Request New Certificate (DNS Challenge)</option>
        </select>
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
  // Attach modal close event listeners
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
    const formData = new FormData(form);
    const newData = {
      domain_names: formData
        .get("domain_names")
        .split(",")
        .map((d) => d.trim()),
      forward_host: formData.get("forward_host"),
      forward_port: parseInt(formData.get("forward_port")),
      forward_scheme: formData.get("forward_scheme"),
      certificate_id: formData.get("certificate_id"),
      access_list_id: formData.get("access_list_id") || null,
      caching_enabled: formData.get("cache_assets") === "on",
      allow_websocket_upgrade: formData.get("websockets_support") === "on",
      block_exploits: formData.get("block_exploits") === "on",
      ssl_forced: formData.get("ssl_forced") === "on",
      http2_support: formData.get("http2_support") === "on",
      hsts_enabled: formData.get("hsts_enabled") === "on",
      hsts_subdomains: formData.get("hsts_subdomains") === "on",
      advanced_config: formData.get("custom_config"),
    };
    import("../managers/ProxyHostManager.js").then((mod) => {
      mod
        .createProxyHost(newData)
        .then(() => {
          document.getElementById("addHostModal").style.display = "none";
        })
        .catch((err) => {
          console.error("Failed to create host", err);
        });
    });
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
        <select id="certificate_id" name="certificate_id">
          <option value="" ${!host.certificate_id ? "selected" : ""}>None</option>
          <option value="new_nodns" ${host.certificate_id === "new_nodns" ? "selected" : ""}>Request New Certificate (No DNS Challenge)</option>
          <option value="new_dns" ${host.certificate_id === "new_dns" ? "selected" : ""}>Request New Certificate (DNS Challenge)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="access_list_id">Access List</label>
        <select id="access_list_id" name="access_list_id">
          <option value="" ${!host.access_list_id ? "selected" : ""}>None</option>
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
    const updatedData = {
      domain_names: formData
        .get("domain_names")
        .split(",")
        .map((d) => d.trim()),
      forward_host: formData.get("forward_host"),
      forward_port: parseInt(formData.get("forward_port")),
      forward_scheme: formData.get("forward_scheme"),
      certificate_id: formData.get("certificate_id"),
      access_list_id: formData.get("access_list_id") || null,
      caching_enabled: formData.get("cache_assets") === "on",
      allow_websocket_upgrade: formData.get("websockets_support") === "on",
      block_exploits: formData.get("block_exploits") === "on",
      ssl_forced: formData.get("ssl_forced") === "on",
      http2_support: formData.get("http2_support") === "on",
      hsts_enabled: formData.get("hsts_enabled") === "on",
      hsts_subdomains: formData.get("hsts_subdomains") === "on",
      advanced_config: formData.get("custom_config"),
    };
    import("../managers/ProxyHostManager.js").then((mod) => {
      mod
        .editProxyHost(host.id, updatedData)
        .then(() => {
          modal.style.display = "none";
        })
        .catch((err) => {
          console.error("Failed to update host", err);
        });
    });
  };
}
