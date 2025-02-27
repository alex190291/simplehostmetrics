// /static/npm/modals/RedirectionHostModals.js
function closeModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
}

function makeRequest(baseUrl, endpoint, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, baseUrl + endpoint, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = function() {
      reject(new Error("Network error occurred"));
    };

    if (data) {
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
  });
}

// Ensure the modal exists in the DOM
function ensureModalExists() {
  let modal = document.getElementById("redirectionHostModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "redirectionHostModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="RedirectionHostModals.closeModals()">&times;</span>
        <h2>Redirection Host</h2>
        <form></form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  return modal;
}

function showCreateRedirectionHostModal() {
  return new Promise((resolve) => {
    const modal = ensureModalExists();
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
        <button type="button" class="btn-secondary" onclick="RedirectionHostModals.closeModals()">Cancel</button>
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

function showEditRedirectionHostModal(hostId) {
  return new Promise(async (resolve, reject) => {
    try {
      const host = await makeRequest(
        "/npm-api",
        `/nginx/redirection-hosts/${hostId}`
      );
      const modal = ensureModalExists();
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${host.id}">
        <div class="form-group">
          <label for="domain_names">Domain Names (comma-separated)</label>
          <input type="text" id="domain_names" name="domain_names" value="${host.domain_names.join(", ")}" required>
        </div>
        <div class="form-group">
          <label for="forward_http_code">Forward HTTP Code</label>
          <input type="number" id="forward_http_code" name="forward_http_code" value
