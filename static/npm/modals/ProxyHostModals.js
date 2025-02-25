// /static/npm/modals/ProxyHostModals.js
import { switchTab, closeModals } from "./common.js";

export function populateAddHostForm() {
  const form = document.getElementById("addHostForm");
  form.innerHTML = `
    <div class="tabs">
      <button type="button" class="tab-link active" onclick="switchTab('general', this)">General</button>
      <button type="button" class="tab-link" onclick="switchTab('custom', this)">Custom Nginx Config</button>
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
          <option value="1">Access List 1</option>
          <option value="2">Access List 2</option>
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
        <textarea id="custom_config" name="custom_config"></textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">Add Host</button>
      <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
    </div>
  `;
}

export async function editHostModal(host) {
  const modal = document.getElementById("addHostModal");
  const form = document.getElementById("addHostForm");
  form.innerHTML = `
    <input type="hidden" name="host_id" value="${host.id}">
    <div class="tabs">
      <button type="button" class="tab-link active" onclick="switchTab('general', this)">General</button>
      <button type="button" class="tab-link" onclick="switchTab('custom', this)">Custom Nginx Config</button>
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
          <option value="1" ${host.access_list_id === 1 ? "selected" : ""}>Access List 1</option>
          <option value="2" ${host.access_list_id === 2 ? "selected" : ""}>Access List 2</option>
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
        <textarea id="custom_config" name="custom_config">${host.custom_config || ""}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">Update Host</button>
      <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
    </div>
  `;
  modal.style.display = "block";
  return new Promise((resolve) => {
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
        cache_assets: formData.get("cache_assets") === "on",
        websockets_support: formData.get("websockets_support") === "on",
        block_exploits: formData.get("block_exploits") === "on",
        ssl_forced: formData.get("ssl_forced") === "on",
        http2_support: formData.get("http2_support") === "on",
        hsts_enabled: formData.get("hsts_enabled") === "on",
        hsts_subdomains: formData.get("hsts_subdomains") === "on",
        custom_config: formData.get("custom_config"),
      };
      modal.style.display = "none";
      resolve(updatedData);
    };
  });
}
