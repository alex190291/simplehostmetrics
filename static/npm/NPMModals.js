// /static/npm/NPMModals.js
import { showSuccess, showError } from "./NPMUtils.js";
import { makeRequest } from "./NPMService.js";

const API_BASE = "/npm-api";

// Existing Host Modals
export function populateAddHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = `
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
      <label>
        <input type="checkbox" name="ssl_forced" value="true">
        Force SSL
      </label>
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" name="cache_enabled" value="true">
        Enable Caching
      </label>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">Add Host</button>
      <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
    </div>
  `;
}

export async function handleHostSubmit(form) {
  try {
    const formData = new FormData(form);
    const hostData = {
      domain_names: formData
        .get("domain_names")
        .split(",")
        .map((d) => d.trim()),
      forward_host: formData.get("forward_host"),
      forward_port: parseInt(formData.get("forward_port")),
      ssl_forced: formData.get("ssl_forced") === "true",
      cache_enabled: formData.get("cache_enabled") === "true",
    };
    await makeRequest(API_BASE, "/nginx/proxy-hosts", "POST", hostData);
    closeModals();
    showSuccess("Host added successfully");
  } catch (error) {
    showError("Failed to add host");
  }
}

export function closeModals() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.style.display = "none";
  });
}

export async function editHostModal(host) {
  const modal = document.getElementById("addHostModal");
  const form = document.getElementById("addHostForm");
  form.innerHTML = `
    <input type="hidden" name="host_id" value="${host.id}">
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
      <label>
        <input type="checkbox" name="ssl_forced" value="true" ${host.ssl_forced ? "checked" : ""}>
        Force SSL
      </label>
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" name="cache_enabled" value="true" ${host.cache_enabled ? "checked" : ""}>
        Enable Caching
      </label>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">Update Host</button>
      <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
    </div>
  `;
  modal.style.display = "block";
}

// Access List Modals
export function showCreateAccessListModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("accessListModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="name">List Name</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="satisfy_any" name="satisfy_any">
          Satisfy Any
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="pass_auth" name="pass_auth">
          Pass Authentication
        </label>
      </div>
      <div class="form-group">
        <label for="items">Items (JSON Array)</label>
        <textarea id="items" name="items" placeholder='[{"username": "user", "password": "pass"}]'></textarea>
      </div>
      <div class="form-group">
        <label for="clients">Clients (JSON Array)</label>
        <textarea id="clients" name="clients" placeholder='[{"address": "1.2.3.4", "directive": "allow"}]'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Access List</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        name: form.querySelector("#name").value,
        satisfy_any: form.querySelector("#satisfy_any").checked,
        pass_auth: form.querySelector("#pass_auth").checked,
        items: JSON.parse(form.querySelector("#items").value || "[]"),
        clients: JSON.parse(form.querySelector("#clients").value || "[]"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showEditAccessListModal(listId) {
  return new Promise(async (resolve, reject) => {
    try {
      const list = await makeRequest(API_BASE, `/nginx/access-lists/${listId}`);
      const modal = document.getElementById("accessListModal");
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${list.id}">
        <div class="form-group">
          <label for="name">List Name</label>
          <input type="text" id="name" name="name" value="${list.name}" required>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="satisfy_any" name="satisfy_any" ${list.satisfy_any ? "checked" : ""}>
            Satisfy Any
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="pass_auth" name="pass_auth" ${list.pass_auth ? "checked" : ""}>
            Pass Authentication
          </label>
        </div>
        <div class="form-group">
          <label for="items">Items (JSON Array)</label>
          <textarea id="items" name="items">${JSON.stringify(list.items || [])}</textarea>
        </div>
        <div class="form-group">
          <label for="clients">Clients (JSON Array)</label>
          <textarea id="clients" name="clients">${JSON.stringify(list.clients || [])}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update Access List</button>
          <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          name: form.querySelector("#name").value,
          satisfy_any: form.querySelector("#satisfy_any").checked,
          pass_auth: form.querySelector("#pass_auth").checked,
          items: JSON.parse(form.querySelector("#items").value || "[]"),
          clients: JSON.parse(form.querySelector("#clients").value || "[]"),
        };
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Certificate Modals
export function showCreateCertificateModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("certificateModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="provider">Provider</label>
        <select id="provider" name="provider" required>
          <option value="letsencrypt">Let's Encrypt</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="nice_name">Nice Name</label>
        <input type="text" id="nice_name" name="nice_name">
      </div>
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names">
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Certificate</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        provider: form.querySelector("#provider").value,
        nice_name: form.querySelector("#nice_name").value,
        domain_names: form
          .querySelector("#domain_names")
          .value.split(",")
          .map((d) => d.trim()),
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showValidateCertificateModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("validateCertificateModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="certificate">Certificate File</label>
        <input type="file" id="certificate" name="certificate" required>
      </div>
      <div class="form-group">
        <label for="certificate_key">Certificate Key</label>
        <input type="file" id="certificate_key" name="certificate_key" required>
      </div>
      <div class="form-group">
        <label for="intermediate_certificate">Intermediate Certificate (optional)</label>
        <input type="file" id="intermediate_certificate" name="intermediate_certificate">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Validate Certificate</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      modal.style.display = "none";
      resolve(formData);
    };
  });
}

export function showUploadCertificateModal(certId) {
  return new Promise((resolve) => {
    const modal = document.getElementById("uploadCertificateModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <input type="hidden" name="cert_id" value="${certId}">
      <div class="form-group">
        <label for="certificate">Certificate File</label>
        <input type="file" id="certificate" name="certificate" required>
      </div>
      <div class="form-group">
        <label for="certificate_key">Certificate Key</label>
        <input type="file" id="certificate_key" name="certificate_key" required>
      </div>
      <div class="form-group">
        <label for="intermediate_certificate">Intermediate Certificate (optional)</label>
        <input type="file" id="intermediate_certificate" name="intermediate_certificate">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Upload Certificate</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      modal.style.display = "none";
      resolve(formData);
    };
  });
}

// Redirection Host Modals
export function showCreateRedirectionHostModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("redirectionHostModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names" required>
      </div>
      <div class="form-group">
        <label for="forward_http_code">Forward HTTP Code</label>
        <input type="number" id="forward_http_code" name="forward_http_code" required>
      </div>
      <div class="form-group">
        <label for="forward_scheme">Forward Scheme</label>
        <select id="forward_scheme" name="forward_scheme" required>
          <option value="auto">Auto</option>
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
        </select>
      </div>
      <div class="form-group">
        <label for="forward_domain_name">Forward Domain Name</label>
        <input type="text" id="forward_domain_name" name="forward_domain_name" required>
      </div>
      <div class="form-group">
        <label for="preserve_path">Preserve Path</label>
        <select id="preserve_path" name="preserve_path" required>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div class="form-group">
        <label for="certificate_id">Certificate ID (or 'new')</label>
        <input type="text" id="certificate_id" name="certificate_id">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced">
          Force SSL
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
      <div class="form-group">
        <label>
          <input type="checkbox" id="http2_support" name="http2_support">
          HTTP2 Support
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="block_exploits" name="block_exploits">
          Block Exploits
        </label>
      </div>
      <div class="form-group">
        <label for="advanced_config">Advanced Config</label>
        <textarea id="advanced_config" name="advanced_config"></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="enabled" name="enabled" checked>
          Enabled
        </label>
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Redirection Host</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        domain_names: form
          .querySelector("#domain_names")
          .value.split(",")
          .map((d) => d.trim()),
        forward_http_code: parseInt(
          form.querySelector("#forward_http_code").value,
        ),
        forward_scheme: form.querySelector("#forward_scheme").value,
        forward_domain_name: form.querySelector("#forward_domain_name").value,
        preserve_path: form.querySelector("#preserve_path").value === "true",
        certificate_id: form.querySelector("#certificate_id").value,
        ssl_forced: form.querySelector("#ssl_forced").checked,
        hsts_enabled: form.querySelector("#hsts_enabled").checked,
        hsts_subdomains: form.querySelector("#hsts_subdomains").checked,
        http2_support: form.querySelector("#http2_support").checked,
        block_exploits: form.querySelector("#block_exploits").checked,
        advanced_config: form.querySelector("#advanced_config").value,
        enabled: form.querySelector("#enabled").checked,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showEditRedirectionHostModal(hostId) {
  return new Promise(async (resolve, reject) => {
    try {
      const host = await makeRequest(
        API_BASE,
        `/nginx/redirection-hosts/${hostId}`,
      );
      const modal = document.getElementById("redirectionHostModal");
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${host.id}">
        <div class="form-group">
          <label for="domain_names">Domain Names (comma-separated)</label>
          <input type="text" id="domain_names" name="domain_names" value="${host.domain_names.join(", ")}" required>
        </div>
        <div class="form-group">
          <label for="forward_http_code">Forward HTTP Code</label>
          <input type="number" id="forward_http_code" name="forward_http_code" value="${host.forward_http_code}" required>
        </div>
        <div class="form-group">
          <label for="forward_scheme">Forward Scheme</label>
          <select id="forward_scheme" name="forward_scheme" required>
            <option value="auto" ${host.forward_scheme === "auto" ? "selected" : ""}>Auto</option>
            <option value="http" ${host.forward_scheme === "http" ? "selected" : ""}>HTTP</option>
            <option value="https" ${host.forward_scheme === "https" ? "selected" : ""}>HTTPS</option>
          </select>
        </div>
        <div class="form-group">
          <label for="forward_domain_name">Forward Domain Name</label>
          <input type="text" id="forward_domain_name" name="forward_domain_name" value="${host.forward_domain_name}" required>
        </div>
        <div class="form-group">
          <label for="preserve_path">Preserve Path</label>
          <select id="preserve_path" name="preserve_path" required>
            <option value="true" ${host.preserve_path ? "selected" : ""}>Yes</option>
            <option value="false" ${!host.preserve_path ? "selected" : ""}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label for="certificate_id">Certificate ID (or 'new')</label>
          <input type="text" id="certificate_id" name="certificate_id" value="${host.certificate_id || ""}">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="ssl_forced" name="ssl_forced" ${host.ssl_forced ? "checked" : ""}>
            Force SSL
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
        <div class="form-group">
          <label>
            <input type="checkbox" id="http2_support" name="http2_support" ${host.http2_support ? "checked" : ""}>
            HTTP2 Support
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="block_exploits" name="block_exploits" ${host.block_exploits ? "checked" : ""}>
            Block Exploits
          </label>
        </div>
        <div class="form-group">
          <label for="advanced_config">Advanced Config</label>
          <textarea id="advanced_config" name="advanced_config">${host.advanced_config || ""}</textarea>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="enabled" name="enabled" ${host.enabled ? "checked" : ""}>
            Enabled
          </label>
        </div>
        <div class="form-group">
          <label for="meta">Meta (JSON)</label>
          <textarea id="meta" name="meta">${JSON.stringify(host.meta || {})}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update Redirection Host</button>
          <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          domain_names: form
            .querySelector("#domain_names")
            .value.split(",")
            .map((d) => d.trim()),
          forward_http_code: parseInt(
            form.querySelector("#forward_http_code").value,
          ),
          forward_scheme: form.querySelector("#forward_scheme").value,
          forward_domain_name: form.querySelector("#forward_domain_name").value,
          preserve_path: form.querySelector("#preserve_path").value === "true",
          certificate_id: form.querySelector("#certificate_id").value,
          ssl_forced: form.querySelector("#ssl_forced").checked,
          hsts_enabled: form.querySelector("#hsts_enabled").checked,
          hsts_subdomains: form.querySelector("#hsts_subdomains").checked,
          http2_support: form.querySelector("#http2_support").checked,
          block_exploits: form.querySelector("#block_exploits").checked,
          advanced_config: form.querySelector("#advanced_config").value,
          enabled: form.querySelector("#enabled").checked,
          meta: JSON.parse(form.querySelector("#meta").value || "{}"),
        };
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Dead Host Modals
export function showCreateDeadHostModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("deadHostModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="domain_names">Domain Names (comma-separated)</label>
        <input type="text" id="domain_names" name="domain_names" required>
      </div>
      <div class="form-group">
        <label for="certificate_id">Certificate ID</label>
        <input type="text" id="certificate_id" name="certificate_id">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ssl_forced" name="ssl_forced">
          Force SSL
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
      <div class="form-group">
        <label>
          <input type="checkbox" id="http2_support" name="http2_support">
          HTTP2 Support
        </label>
      </div>
      <div class="form-group">
        <label for="advanced_config">Advanced Config</label>
        <textarea id="advanced_config" name="advanced_config"></textarea>
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Dead Host</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        domain_names: form
          .querySelector("#domain_names")
          .value.split(",")
          .map((d) => d.trim()),
        certificate_id: form.querySelector("#certificate_id").value,
        ssl_forced: form.querySelector("#ssl_forced").checked,
        hsts_enabled: form.querySelector("#hsts_enabled").checked,
        hsts_subdomains: form.querySelector("#hsts_subdomains").checked,
        http2_support: form.querySelector("#http2_support").checked,
        advanced_config: form.querySelector("#advanced_config").value,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showEditDeadHostModal(hostId) {
  return new Promise(async (resolve, reject) => {
    try {
      const host = await makeRequest(API_BASE, `/nginx/dead-hosts/${hostId}`);
      const modal = document.getElementById("deadHostModal");
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${host.id}">
        <div class="form-group">
          <label for="domain_names">Domain Names (comma-separated)</label>
          <input type="text" id="domain_names" name="domain_names" value="${host.domain_names.join(", ")}" required>
        </div>
        <div class="form-group">
          <label for="certificate_id">Certificate ID</label>
          <input type="text" id="certificate_id" name="certificate_id" value="${host.certificate_id || ""}">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="ssl_forced" name="ssl_forced" ${host.ssl_forced ? "checked" : ""}>
            Force SSL
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
        <div class="form-group">
          <label>
            <input type="checkbox" id="http2_support" name="http2_support" ${host.http2_support ? "checked" : ""}>
            HTTP2 Support
          </label>
        </div>
        <div class="form-group">
          <label for="advanced_config">Advanced Config</label>
          <textarea id="advanced_config" name="advanced_config">${host.advanced_config || ""}</textarea>
        </div>
        <div class="form-group">
          <label for="meta">Meta (JSON)</label>
          <textarea id="meta" name="meta">${JSON.stringify(host.meta || {})}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update Dead Host</button>
          <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          domain_names: form
            .querySelector("#domain_names")
            .value.split(",")
            .map((d) => d.trim()),
          certificate_id: form.querySelector("#certificate_id").value,
          ssl_forced: form.querySelector("#ssl_forced").checked,
          hsts_enabled: form.querySelector("#hsts_enabled").checked,
          hsts_subdomains: form.querySelector("#hsts_subdomains").checked,
          http2_support: form.querySelector("#http2_support").checked,
          advanced_config: form.querySelector("#advanced_config").value,
          meta: JSON.parse(form.querySelector("#meta").value || "{}"),
        };
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Stream Modals
export function showCreateStreamModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("streamModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="incoming_port">Incoming Port</label>
        <input type="number" id="incoming_port" name="incoming_port" required>
      </div>
      <div class="form-group">
        <label for="forwarding_host">Forwarding Host</label>
        <input type="text" id="forwarding_host" name="forwarding_host" required>
      </div>
      <div class="form-group">
        <label for="forwarding_port">Forwarding Port</label>
        <input type="number" id="forwarding_port" name="forwarding_port" required>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="tcp_forwarding" name="tcp_forwarding">
          TCP Forwarding
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="udp_forwarding" name="udp_forwarding">
          UDP Forwarding
        </label>
      </div>
      <div class="form-group">
        <label for="certificate_id">Certificate ID</label>
        <input type="text" id="certificate_id" name="certificate_id">
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Stream</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        incoming_port: parseInt(form.querySelector("#incoming_port").value),
        forwarding_host: form.querySelector("#forwarding_host").value,
        forwarding_port: parseInt(form.querySelector("#forwarding_port").value),
        tcp_forwarding: form.querySelector("#tcp_forwarding").checked,
        udp_forwarding: form.querySelector("#udp_forwarding").checked,
        certificate_id: form.querySelector("#certificate_id").value,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function editStreamModal(stream) {
  return new Promise((resolve) => {
    const modal = document.getElementById("streamModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <input type="hidden" name="id" value="${stream.id}">
      <div class="form-group">
        <label for="incoming_port">Incoming Port</label>
        <input type="number" id="incoming_port" name="incoming_port" value="${stream.incoming_port}" required>
      </div>
      <div class="form-group">
        <label for="forwarding_host">Forwarding Host</label>
        <input type="text" id="forwarding_host" name="forwarding_host" value="${stream.forwarding_host}" required>
      </div>
      <div class="form-group">
        <label for="forwarding_port">Forwarding Port</label>
        <input type="number" id="forwarding_port" name="forwarding_port" value="${stream.forwarding_port}" required>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="tcp_forwarding" name="tcp_forwarding" ${stream.tcp_forwarding ? "checked" : ""}>
          TCP Forwarding
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="udp_forwarding" name="udp_forwarding" ${stream.udp_forwarding ? "checked" : ""}>
          UDP Forwarding
        </label>
      </div>
      <div class="form-group">
        <label for="certificate_id">Certificate ID</label>
        <input type="text" id="certificate_id" name="certificate_id" value="${stream.certificate_id || ""}">
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta">${JSON.stringify(stream.meta || {})}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Update Stream</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        incoming_port: parseInt(form.querySelector("#incoming_port").value),
        forwarding_host: form.querySelector("#forwarding_host").value,
        forwarding_port: parseInt(form.querySelector("#forwarding_port").value),
        tcp_forwarding: form.querySelector("#tcp_forwarding").checked,
        udp_forwarding: form.querySelector("#udp_forwarding").checked,
        certificate_id: form.querySelector("#certificate_id").value,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

// User Modals
export function showCreateUserModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("userModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="nickname">Nickname</label>
        <input type="text" id="nickname" name="nickname" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="roles">Roles (comma-separated)</label>
        <input type="text" id="roles" name="roles">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="is_disabled" name="is_disabled">
          Is Disabled
        </label>
      </div>
      <div class="form-group">
        <label for="auth">Auth (JSON: {type, secret})</label>
        <textarea id="auth" name="auth" placeholder='{"type": "password", "secret": ""}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create User</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        name: form.querySelector("#name").value,
        nickname: form.querySelector("#nickname").value,
        email: form.querySelector("#email").value,
        roles: form
          .querySelector("#roles")
          .value.split(",")
          .map((r) => r.trim()),
        is_disabled: form.querySelector("#is_disabled").checked,
        auth: JSON.parse(
          form.querySelector("#auth").value ||
            '{"type": "password", "secret": ""}',
        ),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showEditUserModal(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await makeRequest(API_BASE, `/users/${userID}`);
      const modal = document.getElementById("userModal");
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${user.id}">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" value="${user.name}" required>
        </div>
        <div class="form-group">
          <label for="nickname">Nickname</label>
          <input type="text" id="nickname" name="nickname" value="${user.nickname}" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="${user.email}" required>
        </div>
        <div class="form-group">
          <label for="roles">Roles (comma-separated)</label>
          <input type="text" id="roles" name="roles" value="${(user.roles || []).join(", ")}">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="is_disabled" name="is_disabled" ${user.is_disabled ? "checked" : ""}>
            Is Disabled
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update User</button>
          <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          name: form.querySelector("#name").value,
          nickname: form.querySelector("#nickname").value,
          email: form.querySelector("#email").value,
          roles: form
            .querySelector("#roles")
            .value.split(",")
            .map((r) => r.trim()),
          is_disabled: form.querySelector("#is_disabled").checked,
        };
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Setting Modal
export function editSettingModal(setting) {
  return new Promise((resolve) => {
    const modal = document.getElementById("settingModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <input type="hidden" name="id" value="${setting.id}">
      <div class="form-group">
        <label for="value">Value</label>
        <select id="value" name="value" required>
          <option value="congratulations" ${setting.value === "congratulations" ? "selected" : ""}>Congratulations</option>
          <option value="404" ${setting.value === "404" ? "selected" : ""}>404</option>
          <option value="444" ${setting.value === "444" ? "selected" : ""}>444</option>
          <option value="redirect" ${setting.value === "redirect" ? "selected" : ""}>Redirect</option>
          <option value="html" ${setting.value === "html" ? "selected" : ""}>HTML</option>
        </select>
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'>${JSON.stringify(setting.meta || {})}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Update Setting</button>
        <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        value: form.querySelector("#value").value,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}
