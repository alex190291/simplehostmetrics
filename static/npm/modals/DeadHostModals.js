// /static/npm/modals/DeadHostModals.js
import { makeRequest } from "../NPMService.js";
import { closeModals } from "./NPMUtils.js";

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
      
      <!-- Replace checkboxes with toggle switches -->
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="ssl_forced" name="ssl_forced">
            <span class="slider"></span>
          </span>
          <span class="toggle-label">Force SSL</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="hsts_enabled" name="hsts_enabled">
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HSTS Enabled</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains">
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HSTS Subdomains</span>
        </label>
      </div>
      
      <div class="form-group toggle">
        <label>
          <span class="toggle-switch">
            <input type="checkbox" id="http2_support" name="http2_support">
            <span class="slider"></span>
          </span>
          <span class="toggle-label">HTTP2 Support</span>
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
      const host = await makeRequest("/npm-api", `/nginx/dead-hosts/${hostId}`);
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
        
        <!-- Replace checkboxes with toggle switches -->
        <div class="form-group toggle">
          <label>
            <span class="toggle-switch">
              <input type="checkbox" id="ssl_forced" name="ssl_forced" ${host.ssl_forced ? "checked" : ""}>
              <span class="slider"></span>
            </span>
            <span class="toggle-label">Force SSL</span>
          </label>
        </div>
        
        <div class="form-group toggle">
          <label>
            <span class="toggle-switch">
              <input type="checkbox" id="hsts_enabled" name="hsts_enabled" ${host.hsts_enabled ? "checked" : ""}>
              <span class="slider"></span>
            </span>
            <span class="toggle-label">HSTS Enabled</span>
          </label>
        </div>
        
        <div class="form-group toggle">
          <label>
            <span class="toggle-switch">
              <input type="checkbox" id="hsts_subdomains" name="hsts_subdomains" ${host.hsts_subdomains ? "checked" : ""}>
              <span class="slider"></span>
            </span>
            <span class="toggle-label">HSTS Subdomains</span>
          </label>
        </div>
        
        <div class="form-group toggle">
          <label>
            <span class="toggle-switch">
              <input type="checkbox" id="http2_support" name="http2_support" ${host.http2_support ? "checked" : ""}>
              <span class="slider"></span>
            </span>
            <span class="toggle-label">HTTP2 Support</span>
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
