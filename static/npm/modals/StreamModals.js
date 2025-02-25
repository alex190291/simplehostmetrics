// /static/npm/modals/StreamModals.js
import { closeModals } from "./common.js";

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
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
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
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
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
