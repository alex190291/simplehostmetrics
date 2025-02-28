// /static/npm/modals/CertificateModals.js
import { closeModals } from "../common.js";

export function populateCertificateForm(certificate = null) {
  const form = document.getElementById("certificateForm");
  if (!form) {
    console.error("Certificate form not found");
    return;
  }

  form.innerHTML = generateCertificateFormHTML(certificate);
  setupCertificateForm(form, !!certificate);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      const data = {
        provider: formData.get("provider"),
        nice_name: formData.get("nice_name"),
        domain_names: formData.get("domain_names").split(",").map(d => d.trim()),
        dns_challenge: formData.has("dns_challenge"),
        dns_provider: formData.get("dns_provider"),
        api_key: formData.get("dns_provider") ? formData.get("api_key") : undefined,
        meta: JSON.parse(formData.get("meta") || "{}")
      };

      // Create or update the certificate
      const CertificateManager = await import("../managers/CertificateManager.js");
      if (certificate) {
        await CertificateManager.updateCertificate(certificate.id, data);
      } else {
        await CertificateManager.createCertificate(data);
      }

      document.getElementById("certificateModal").style.display = "none";
    } catch (error) {
      console.error("Form submission error:", error);
      alert("An error occurred: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = certificate ? "Update" : "Create";
    }
  };
}

function generateCertificateFormHTML(certificate = null) {
  const isEdit = certificate !== null;
  const provider = isEdit ? certificate.provider : "letsencrypt";
  const niceName = isEdit ? certificate.nice_name : "";
  const domainNames = isEdit ? certificate.domain_names.join(", ") : "";
  const dnsChallenge = isEdit ? certificate.dns_challenge : false;
  const dnsProvider = isEdit ? certificate.dns_provider : "";
  const apiKey = isEdit ? certificate.api_key : "";
  const meta = isEdit ? JSON.stringify(certificate.meta, null, 2) : "{}";

  return `
    <div class="form-group">
      <label for="provider">Provider</label>
      <select id="provider" name="provider" required>
        <option value="letsencrypt" ${provider === "letsencrypt" ? "selected" : ""}>Let's Encrypt</option>
        <option value="other" ${provider === "other" ? "selected" : ""}>Other</option>
      </select>
    </div>
    <div class="form-group">
      <label for="nice_name">Nice Name</label>
      <input type="text" id="nice_name" name="nice_name" value="${niceName}">
    </div>
    <div class="form-group">
      <label for="domain_names">Domain Names (comma-separated)</label>
      <input type="text" id="domain_names" name="domain_names" value="${domainNames}">
    </div>
    
    <!-- Replace checkbox with toggle switch -->
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="dns_challenge" name="dns_challenge" ${dnsChallenge ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">Enable DNS Challenge</span>
      </label>
    </div>
    
    <div class="form-group" id="dns_provider_group" style="display: ${dnsChallenge ? "block" : "none"}">
      <label for="dns_provider">DNS Challenge Provider</label>
      <select id="dns_provider" name="dns_provider">
        <option value="">Select Provider</option>
        <option value="acmedns" ${dnsProvider === "acmedns" ? "selected" : ""}>ACME-DNS</option>
        <option value="cloudflare" ${dnsProvider === "cloudflare" ? "selected" : ""}>Cloudflare</option>
        <option value="digitalocean" ${dnsProvider === "digitalocean" ? "selected" : ""}>DigitalOcean</option>
      </select>
    </div>
    <div class="form-group" id="api_key_group" style="display: ${dnsProvider ? "block" : "none"}">
      <label for="api_key">API Key</label>
      <input type="text" id="api_key" name="api_key" value="${apiKey}">
    </div>
    <div class="form-group">
      <label for="meta">Meta (JSON)</label>
      <textarea id="meta" name="meta" placeholder='{}'>${meta}</textarea>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">${isEdit ? "Update" : "Create"} Certificate</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

function setupCertificateForm(form) {
  // Show/Hide DNS provider and API key fields based on toggle
  const dnsChallengeCheckbox = form.querySelector("#dns_challenge");
  dnsChallengeCheckbox.addEventListener("change", () => {
    const dnsProviderGroup = form.querySelector("#dns_provider_group");
    const apiKeyGroup = form.querySelector("#api_key_group");
    if (dnsChallengeCheckbox.checked) {
      dnsProviderGroup.style.display = "block";
    } else {
      dnsProviderGroup.style.display = "none";
      apiKeyGroup.style.display = "none";
      form.querySelector("#dns_provider").value = "";
      form.querySelector("#api_key").value = "";
    }
  });

  // Show API key field based on provider selection
  const dnsProviderSelect = form.querySelector("#dns_provider");
  dnsProviderSelect.addEventListener("change", () => {
    const apiKeyGroup = form.querySelector("#api_key_group");
    if (dnsProviderSelect.value) {
      apiKeyGroup.style.display = "block";
    } else {
      apiKeyGroup.style.display = "none";
    }
  });
}
