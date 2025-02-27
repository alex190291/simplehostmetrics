// /static/npm/modals/CertificateModals.js
import { closeModals } from "./common.js";

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
        <label for="dns_challenge">Enable DNS Challenge</label>
        <input type="checkbox" id="dns_challenge" name="dns_challenge">
      </div>
      <div class="form-group" id="dns_provider_group" style="display: none;">
        <label for="dns_provider">DNS Challenge Provider</label>
        <select id="dns_provider" name="dns_provider">
          <option value="">Select Provider</option>
          <option value="acmedns">ACME-DNS</option>
          <option value="cloudflare">Cloudflare</option>
          <option value="digitalocean">DigitalOcean</option>
          <!-- Add other providers as needed -->
        </select>
      </div>
      <div class="form-group" id="api_key_group" style="display: none;">
        <label for="api_key">API Key</label>
        <input type="text" id="api_key" name="api_key">
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Certificate</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;

    // Show/Hide DNS provider and API key fields based on toggle
    const dnsChallengeCheckbox = document.getElementById("dns_challenge");
    dnsChallengeCheckbox.addEventListener("change", () => {
      const dnsProviderGroup = document.getElementById("dns_provider_group");
      const apiKeyGroup = document.getElementById("api_key_group");
      if (dnsChallengeCheckbox.checked) {
        dnsProviderGroup.style.display = "block";
      } else {
        dnsProviderGroup.style.display = "none";
        apiKeyGroup.style.display = "none";
        document.getElementById("dns_provider").value = "";
        document.getElementById("api_key").value = "";
      }
    });

    // Show API key field based on provider selection
    const dnsProviderSelect = document.getElementById("dns_provider");
    dnsProviderSelect.addEventListener("change", () => {
      const apiKeyGroup = document.getElementById("api_key_group");
      if (dnsProviderSelect.value) {
        apiKeyGroup.style.display = "block";
      } else {
        apiKeyGroup.style.display = "none";
      }
    });

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
        dns_challenge: dnsChallengeCheckbox.checked,
        dns_provider: dnsProviderSelect.value,
        api_key: dnsProviderSelect.value
          ? form.querySelector("#api_key").value
          : undefined,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}
