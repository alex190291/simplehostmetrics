// /static/npm/modals/RedirectionHostModals.js
import { makeRequest } from "../NPMService.js";
import { closeModals } from "./common.js";

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
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
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
        "/npm-api",
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
          <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
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
