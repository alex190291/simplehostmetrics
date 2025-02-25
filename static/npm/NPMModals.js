// /static/npm/NPMModals.js
import { showSuccess, showError } from "./NPMUtils.js";
import { makeRequest } from "./NPMService.js";

const API_BASE = "/npm-api";

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
