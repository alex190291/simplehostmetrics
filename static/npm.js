// static/npm.js
class NPMManager {
  constructor() {
    this.apiBase = "/npm-api";
    this.currentView = "proxy"; // possible values: "proxy", "redirection", "stream", "access", "certificates", "audit", "settings"
    this.refreshInterval = 30000;
    this.retryAttempts = 3;
    this.cache = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      // First check if NPM is reachable
      const healthCheck = await this.makeRequest("/");
      if (healthCheck.status !== "OK") {
        this.showError("NPM API is not available");
        return;
      }
      this.setupEventListeners();
      await this.loadCurrentView();
      this.startAutoRefresh();
    } catch (error) {
      this.showError("Failed to connect to NPM API");
      console.error("Init failed:", error);
    }
  }

  setupEventListeners() {
    // Sidebar view switching
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.target.getAttribute("href").substring(1);
        this.switchView(view);
      });
    });

    // Toggle groups in sidebar
    document.querySelectorAll(".sidebar-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        const groupElem = e.target
          .closest(".sidebar-group")
          .querySelector(".sidebar-items");
        this.toggleGroup(groupElem.id);
      });
    });

    // New button for adding a host
    const addNewBtn = document.getElementById("addNewBtn");
    if (addNewBtn) {
      addNewBtn.addEventListener("click", () => this.showAddModal());
    }

    // Search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.handleSearch(e.target.value),
      );
    }
  }

  switchView(view) {
    // Hide all content views
    document.querySelectorAll(".content-view").forEach((v) => {
      v.classList.remove("active");
    });
    // Remove active class from sidebar items
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.classList.remove("active");
    });
    // Show the selected view and mark the corresponding sidebar item
    const viewElement = document.getElementById(`${view}View`);
    if (viewElement) {
      viewElement.classList.add("active");
    }
    const sidebarItem = document.querySelector(`[href="#${view}"]`);
    if (sidebarItem) {
      sidebarItem.classList.add("active");
    }
    this.currentView = view;
    this.loadCurrentView();
  }

  toggleGroup(groupId) {
    const items = document.getElementById(groupId);
    const header = items.previousElementSibling;
    if (items.style.display === "none" || !items.style.display) {
      items.style.display = "block";
      header.querySelector(".arrow").style.transform = "rotate(0deg)";
    } else {
      items.style.display = "none";
      header.querySelector(".arrow").style.transform = "rotate(-90deg)";
    }
  }

  async makeRequest(endpoint, method = "GET", body = null, retryCount = 0) {
    try {
      console.log(`Making request to: ${this.apiBase}${endpoint}`);
      console.log(`Method: ${method}`);
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) {
        options.body = JSON.stringify(body);
        console.log("Request body:", body);
      }
      const response = await fetch(`${this.apiBase}${endpoint}`, options);
      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Response data:", data);
      return data;
    } catch (error) {
      console.error("Request error:", error);
      if (retryCount < this.retryAttempts) {
        console.log(`Retrying request (attempt ${retryCount + 1})`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.makeRequest(endpoint, method, body, retryCount + 1);
      }
      throw error;
    }
  }

  showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 100);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  async loadCurrentView() {
    const viewMap = {
      proxy: this.loadProxyHosts.bind(this),
      redirection: this.loadRedirectionHosts.bind(this),
      stream: this.loadStreamHosts.bind(this),
      access: this.loadAccessLists.bind(this),
      certificates: this.loadCertificates.bind(this),
      audit: this.loadAuditLog.bind(this),
      settings: this.loadSettings.bind(this),
    };
    if (viewMap[this.currentView]) {
      await viewMap[this.currentView]();
    } else {
      console.error(
        `View '${this.currentView}' not found. Falling back to proxy view.`,
      );
      this.currentView = "proxy";
      await viewMap.proxy();
    }
  }

  // ----------------- View implementations -----------------

  async loadProxyHosts() {
    try {
      const hosts = await this.makeRequest("/nginx/proxy-hosts");
      const grid = document.getElementById("proxyHostsGrid");
      grid.innerHTML = "";
      hosts.forEach((host) => {
        grid.appendChild(this.createProxyHostCard(host));
      });
    } catch (error) {
      this.showError("Failed to load proxy hosts");
    }
  }

  createProxyHostCard(host) {
    const card = document.createElement("div");
    card.className = "host-card glass-card";
    card.innerHTML = `
      <div class="card-header">
          <h3>${host.domain_names[0]}</h3>
          <div class="status-indicator ${host.enabled ? "active" : "inactive"}"></div>
      </div>
      <div class="card-content">
          <p>Forward: ${host.forward_host}:${host.forward_port}</p>
          <p>SSL: ${host.ssl_forced ? "Forced" : "Optional"}</p>
          <p>Cache: ${host.caching_enabled ? "Enabled" : "Disabled"}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.editHost(${host.id})">Edit</button>
          <button onclick="npmManager.deleteHost(${host.id})">Delete</button>
      </div>
    `;
    return card;
  }

  async loadRedirectionHosts() {
    try {
      const hosts = await this.makeRequest("/nginx/redirection-hosts");
      const grid = document.getElementById("redirectionHostsGrid");
      grid.innerHTML = "";
      hosts.forEach((host) => {
        grid.appendChild(this.createRedirectionHostCard(host));
      });
    } catch (error) {
      this.showError("Failed to load redirection hosts");
    }
  }

  createRedirectionHostCard(host) {
    const card = document.createElement("div");
    card.className = "host-card glass-card";
    card.innerHTML = `
      <div class="card-header">
          <h3>${host.domain_names[0]}</h3>
          <div class="status-indicator ${host.enabled ? "active" : "inactive"}"></div>
      </div>
      <div class="card-content">
          <p>Redirect HTTP Code: ${host.forward_http_code}</p>
          <p>Forward Domain: ${host.forward_domain_name}</p>
          <p>Preserve Path: ${host.preserve_path ? "Yes" : "No"}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.editRedirectionHost(${host.id})">Edit</button>
          <button onclick="npmManager.deleteRedirectionHost(${host.id})">Delete</button>
      </div>
    `;
    return card;
  }

  async loadStreamHosts() {
    try {
      const streams = await this.makeRequest("/nginx/streams");
      const grid = document.getElementById("streamsGrid");
      grid.innerHTML = "";
      streams.forEach((stream) => {
        grid.appendChild(this.createStreamCard(stream));
      });
    } catch (error) {
      this.showError("Failed to load streams");
    }
  }

  createStreamCard(stream) {
    const card = document.createElement("div");
    card.className = "stream-card glass-card";
    card.innerHTML = `
      <div class="card-header">
          <h3>Stream on port ${stream.incoming_port}</h3>
          <div class="status-indicator ${stream.enabled ? "active" : "inactive"}"></div>
      </div>
      <div class="card-content">
          <p>Forward: ${stream.forwarding_host}:${stream.forwarding_port}</p>
          <p>TCP: ${stream.tcp_forwarding ? "Yes" : "No"}, UDP: ${stream.udp_forwarding ? "Yes" : "No"}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.editStream(${stream.id})">Edit</button>
          <button onclick="npmManager.deleteStream(${stream.id})">Delete</button>
      </div>
    `;
    return card;
  }

  async loadAccessLists() {
    try {
      const lists = await this.makeRequest("/nginx/access-lists");
      const grid = document.getElementById("accessListsGrid");
      grid.innerHTML = "";
      lists.forEach((list) => {
        grid.appendChild(this.createAccessListCard(list));
      });
    } catch (error) {
      this.showError("Failed to load access lists");
    }
  }

  createAccessListCard(list) {
    const card = document.createElement("div");
    card.className = "access-list-card glass-card";
    card.innerHTML = `
      <div class="card-header">
          <h3>${list.name}</h3>
      </div>
      <div class="card-content">
          <p>Authorization: ${list.satisfy_any ? "Any" : "All"}</p>
          <p>Pass Auth: ${list.pass_auth ? "Yes" : "No"}</p>
          <p>Clients: ${list.clients?.length || 0}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.editAccessList(${list.id})">Edit</button>
          <button onclick="npmManager.deleteAccessList(${list.id})">Delete</button>
      </div>
    `;
    return card;
  }

  async loadCertificates() {
    try {
      const certs = await this.makeRequest("/nginx/certificates");
      this.updateCertificateStats(certs);
      const grid = document.getElementById("certificatesGrid");
      grid.innerHTML = "";
      certs.forEach((cert) => {
        grid.appendChild(this.createCertificateCard(cert));
      });
    } catch (error) {
      this.showError("Failed to load certificates");
    }
  }

  updateCertificateStats(certs) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const stats = certs.reduce(
      (acc, cert) => {
        const expiryDate = new Date(cert.expires_on);
        if (expiryDate < now) {
          acc.expired++;
        } else if (expiryDate < thirtyDaysFromNow) {
          acc.expiringSoon++;
        } else {
          acc.valid++;
        }
        return acc;
      },
      { valid: 0, expiringSoon: 0, expired: 0 },
    );
    document.getElementById("validCertsCount").textContent = stats.valid;
    document.getElementById("expiringSoonCount").textContent =
      stats.expiringSoon;
    document.getElementById("expiredCount").textContent = stats.expired;
  }

  createCertificateCard(cert) {
    const card = document.createElement("div");
    card.className = "cert-card glass-card";
    const expiryDate = new Date(cert.expires_on);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate - now) / (1000 * 60 * 60 * 24),
    );
    card.innerHTML = `
      <div class="card-header">
          <h3>${cert.nice_name}</h3>
          <div class="expiry-indicator ${this.getExpiryClass(daysUntilExpiry)}">
              ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : "Expired"}
          </div>
      </div>
      <div class="card-content">
          <p>Domains: ${cert.domain_names.join(", ")}</p>
          <p>Provider: ${cert.provider}</p>
          <p>Expires: ${new Date(cert.expires_on).toLocaleDateString()}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.renewCertificate(${cert.id})">Renew</button>
          <button onclick="npmManager.deleteCertificate(${cert.id})">Delete</button>
      </div>
    `;
    return card;
  }

  getExpiryClass(daysUntilExpiry) {
    if (daysUntilExpiry <= 0) return "expired";
    if (daysUntilExpiry <= 30) return "warning";
    return "valid";
  }

  async loadAuditLog() {
    try {
      const logs = await this.makeRequest("/audit-log");
      const tbody = document.querySelector("#auditLogTable tbody");
      tbody.innerHTML = "";
      logs.forEach((log) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${new Date(log.created_on).toLocaleString()}</td>
          <td>${log.user_id}</td>
          <td>${log.action}</td>
          <td>${JSON.stringify(log.meta)}</td>
        `;
        tbody.appendChild(row);
      });
    } catch (error) {
      this.showError("Failed to load audit log");
    }
  }

  async loadSettings() {
    try {
      const settings = await this.makeRequest("/settings");
      const container = document.getElementById("settingsContainer");
      container.innerHTML = "";
      settings.forEach((setting) => {
        container.appendChild(this.createSettingCard(setting));
      });
    } catch (error) {
      this.showError("Failed to load settings");
    }
  }

  createSettingCard(setting) {
    const card = document.createElement("div");
    card.className = "setting-card glass-card";
    card.innerHTML = `
      <div class="card-header">
          <h3>${setting.name}</h3>
      </div>
      <div class="card-content">
          <p>ID: ${setting.id}</p>
          <p>Description: ${setting.description}</p>
          <p>Value: ${setting.value}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.editSetting('${setting.id}')">Edit</button>
      </div>
    `;
    return card;
  }

  handleSearch(query) {
    const elements = document.querySelectorAll(".glass-card");
    query = query.toLowerCase();
    elements.forEach((element) => {
      const text = element.textContent.toLowerCase();
      element.style.display = text.includes(query) ? "block" : "none";
    });
  }

  startAutoRefresh() {
    setInterval(() => {
      if (document.visibilityState === "visible") {
        this.loadCurrentView();
      }
    }, this.refreshInterval);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.loadCurrentView();
      }
    });
  }

  // ------------- Modal and Form Handlers -------------
  showAddModal() {
    const modal = document.getElementById("addHostModal");
    modal.style.display = "block";
    this.populateAddHostForm();
  }

  populateAddHostForm() {
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

  closeModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.style.display = "none";
    });
  }

  // ------------- Host Operations -------------
  async handleHostSubmit(form) {
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
      await this.makeRequest("/nginx/proxy-hosts", "POST", hostData);
      this.closeModals();
      await this.loadCurrentView();
      this.showSuccess("Host added successfully");
    } catch (error) {
      this.showError("Failed to add host");
    }
  }

  async editHost(hostId) {
    try {
      const host = await this.makeRequest(`/nginx/proxy-hosts/${hostId}`);
      const modal = document.getElementById("addHostModal");
      const form = document.getElementById("addHostForm");
      form.innerHTML = `
        <input type="hidden" name="host_id" value="${hostId}">
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
    } catch (error) {
      this.showError("Failed to load host details");
    }
  }

  async deleteHost(hostId) {
    if (!confirm("Are you sure you want to delete this host?")) return;
    try {
      await this.makeRequest(`/nginx/proxy-hosts/${hostId}`, "DELETE");
      this.showSuccess("Host deleted successfully");
      await this.loadCurrentView();
    } catch (error) {
      this.showError("Failed to delete host");
    }
  }

  // ------------- Certificate Operations -------------
  async handleCertificateUpload(form) {
    try {
      const formData = new FormData(form);
      const certData = {
        nice_name: formData.get("nice_name"),
        provider: "custom",
        certificate: formData.get("certificate"),
        private_key: formData.get("private_key"),
      };
      await this.makeRequest("/nginx/certificates", "POST", certData);
      this.closeModals();
      await this.loadCertificates();
      this.showSuccess("Certificate uploaded successfully");
    } catch (error) {
      this.showError("Failed to upload certificate");
    }
  }

  async handleLetsEncryptRequest(form) {
    try {
      const formData = new FormData(form);
      const certData = {
        nice_name: formData.get("nice_name"),
        provider: "letsencrypt",
        domain_names: formData
          .get("domain_names")
          .split(",")
          .map((d) => d.trim()),
        email: formData.get("email"),
        dns_challenge: formData.get("dns_challenge") === "true",
        dns_provider: formData.get("dns_provider"),
        dns_credentials: JSON.parse(formData.get("dns_credentials")),
      };
      await this.makeRequest("/nginx/certificates", "POST", certData);
      this.closeModals();
      await this.loadCertificates();
      this.showSuccess("Let's Encrypt certificate requested successfully");
    } catch (error) {
      this.showError("Failed to request Let's Encrypt certificate");
    }
  }

  async renewCertificate(certId) {
    try {
      await this.makeRequest(`/nginx/certificates/${certId}/renew`, "POST");
      this.showSuccess("Certificate renewal initiated");
      await this.loadCertificates();
    } catch (error) {
      this.showError("Failed to renew certificate");
    }
  }

  async deleteCertificate(certId) {
    if (!confirm("Are you sure you want to delete this certificate?")) return;
    try {
      await this.makeRequest(`/nginx/certificates/${certId}`, "DELETE");
      this.showSuccess("Certificate deleted successfully");
      await this.loadCertificates();
    } catch (error) {
      this.showError("Failed to delete certificate");
    }
  }

  // ------------- Access List Operations -------------
  async editAccessList(listId) {
    try {
      const list = await this.makeRequest(`/nginx/access-lists/${listId}`);
      const modal = document.getElementById("addHostModal");
      const form = document.getElementById("addHostForm");
      form.innerHTML = `
        <input type="hidden" name="list_id" value="${listId}">
        <div class="form-group">
            <label for="name">List Name</label>
            <input type="text" id="name" name="name" value="${list.name}" required>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" name="satisfy_any" value="true" ${list.satisfy_any ? "checked" : ""}>
                Satisfy Any Condition
            </label>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" name="pass_auth" value="true" ${list.pass_auth ? "checked" : ""}>
                Pass Authentication
            </label>
        </div>
        <div class="form-group">
            <label for="clients">Allowed Clients (one per line)</label>
            <textarea id="clients" name="clients" rows="5">${list.clients ? list.clients.join("\n") : ""}</textarea>
        </div>
        <div class="form-actions">
            <button type="submit" class="btn-primary">Update Access List</button>
            <button type="button" class="btn-secondary" onclick="npmManager.closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
    } catch (error) {
      this.showError("Failed to load access list details");
    }
  }

  async deleteAccessList(listId) {
    if (!confirm("Are you sure you want to delete this access list?")) return;
    try {
      await this.makeRequest(`/nginx/access-lists/${listId}`, "DELETE");
      this.showSuccess("Access list deleted successfully");
      await this.loadAccessLists();
    } catch (error) {
      this.showError("Failed to delete access list");
    }
  }

  // ------------- Settings Operations -------------
  async loadSettings() {
    try {
      const settings = await this.makeRequest("/settings");
      const container = document.getElementById("settingsContainer");
      container.innerHTML = "";
      settings.forEach((setting) => {
        container.appendChild(this.createSettingCard(setting));
      });
    } catch (error) {
      this.showError("Failed to load settings");
    }
  }

  createSettingCard(setting) {
    const card = document.createElement("div");
    card.className = "setting-card glass-card";
    card.innerHTML = `
      <div class="card-header">
          <h3>${setting.name}</h3>
      </div>
      <div class="card-content">
          <p>ID: ${setting.id}</p>
          <p>Description: ${setting.description}</p>
          <p>Value: ${setting.value}</p>
      </div>
      <div class="card-actions">
          <button onclick="npmManager.editSetting('${setting.id}')">Edit</button>
      </div>
    `;
    return card;
  }

  async editSetting(settingID) {
    try {
      const settings = await this.makeRequest("/settings");
      const setting = settings.find((s) => s.id === settingID);
      if (!setting) {
        throw new Error("Setting not found");
      }
      const modal = document.getElementById("editSettingModal");
      const form = modal.querySelector("form");
      form.elements["value"].value = setting.value;
      // Assume meta fields are edited separately if needed.
      modal.style.display = "block";
    } catch (error) {
      this.showError("Failed to load setting details");
    }
  }

  // ------------- Stream Operations -------------
  async editStream(streamId) {
    try {
      const stream = await this.makeRequest(`/nginx/streams/${streamId}`);
      const modal = document.getElementById("editStreamModal");
      const form = modal.querySelector("form");
      form.elements["incoming_port"].value = stream.incoming_port;
      form.elements["forwarding_host"].value = stream.forwarding_host;
      form.elements["forwarding_port"].value = stream.forwarding_port;
      form.elements["tcp_forwarding"].checked = stream.tcp_forwarding;
      form.elements["udp_forwarding"].checked = stream.udp_forwarding;
      modal.style.display = "block";
    } catch (error) {
      this.showError("Failed to load stream details");
    }
  }

  async deleteStream(streamId) {
    if (!confirm("Are you sure you want to delete this stream?")) return;
    try {
      await this.makeRequest(`/nginx/streams/${streamId}`, "DELETE");
      this.showSuccess("Stream deleted successfully");
      await this.loadStreamHosts();
    } catch (error) {
      this.showError("Failed to delete stream");
    }
  }

  // ------------- Redirection Host Operations -------------
  async editRedirectionHost(hostId) {
    try {
      const host = await this.makeRequest(`/nginx/redirection-hosts/${hostId}`);
      const modal = document.getElementById("editRedirectionModal");
      const form = modal.querySelector("form");
      form.elements["domain_names"].value = host.domain_names.join(", ");
      form.elements["forward_http_code"].value = host.forward_http_code;
      form.elements["forward_domain_name"].value = host.forward_domain_name;
      form.elements["preserve_path"].checked = host.preserve_path;
      modal.style.display = "block";
    } catch (error) {
      this.showError("Failed to load redirection host details");
    }
  }

  async deleteRedirectionHost(hostId) {
    if (!confirm("Are you sure you want to delete this redirection host?"))
      return;
    try {
      await this.makeRequest(`/nginx/redirection-hosts/${hostId}`, "DELETE");
      this.showSuccess("Redirection host deleted successfully");
      await this.loadRedirectionHosts();
    } catch (error) {
      this.showError("Failed to delete redirection host");
    }
  }

  // ------------- Notification and Utility Methods -------------
  switchCertTab(tab) {
    document
      .querySelectorAll(".cert-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".cert-form")
      .forEach((f) => f.classList.remove("active"));
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
    document.getElementById(`${tab}CertForm`).classList.add("active");
  }
}

// Initialize the NPM Manager when the document is ready
document.addEventListener("DOMContentLoaded", () => {
  window.npmManager = new NPMManager();
});

// Close modals when clicking outside
window.onclick = (event) => {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
  }
};
