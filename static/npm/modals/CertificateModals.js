// /static/npm/modals/CertificateModals.js
import { closeModals } from "./common.js";

export function showCreateCertificateModal() {
  return new Promise((resolve) => {
    let modal = document.getElementById("certificateModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "certificateModal";
      modal.className = "modal";
      modal.innerHTML = `<div class="modal-content"><form></form></div>`;
      document.body.appendChild(modal);
    }
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
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    // Use flex-based styling as with the proxy host modals.
    modal.style.display = "flex";
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
    let modal = document.getElementById("validateCertificateModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "validateCertificateModal";
      modal.className = "modal";
      modal.innerHTML = `<div class="modal-content"><form></form></div>`;
      document.body.appendChild(modal);
    }
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
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "flex";
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
    let modal = document.getElementById("uploadCertificateModal");
    if (!modal) {
      // Create the modal dynamically if it doesn't exist
      modal = document.createElement("div");
      modal.id = "uploadCertificateModal";
      modal.className = "modal";
      modal.innerHTML = `<div class="modal-content"><form></form></div>`;
      document.body.appendChild(modal);
    }
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
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "flex";
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      modal.style.display = "none";
      resolve(formData);
    };
  });
}
