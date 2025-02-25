// static/npm.js
class NPMManager {
  constructor() {
    this.apiBase = `https://${window.location.hostname}/api`;
    this.currentView = "proxy";
    this.token = null;
    this.refreshInterval = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.cache = new Map();
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.setupEventListeners();
    this.loadCurrentView();
    this.startAutoRefresh();
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.apiBase}/tokens`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();
      this.token = data.token;
    } catch (error) {
      console.error("Auth check failed:", error);
      window.location.href = "/login";
    }
  }

  setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchView(e.target.getAttribute("href").substring(1));
      });
    });

    // Add new button
    document.getElementById("addNewBtn").addEventListener("click", () => {
      this.showAddModal();
    });

    // Search functionality
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.handleSearch(e.target.value);
    });

    // Certificate tabs
    document.querySelectorAll(".cert-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.switchCertTab(e.target.dataset.tab);
      });
    });

    // Modal close buttons
    document.querySelectorAll(".modal .close").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.closeModals();
      });
    });

    // Form submissions
    this.setupFormListeners();
  }

  setupFormListeners() {
    // Add Host Form
    document
      .getElementById("addHostForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleHostSubmit(e.target);
      });

    // Certificate Forms
    document
      .getElementById("uploadCertForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleCertificateUpload(e.target);
      });

    document
      .getElementById("letsencryptForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleLetsEncryptRequest(e.target);
      });
  }

  async makeRequest(endpoint, method = "GET", body = null, retryCount = 0) {
    try {
      const options = {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.apiBase}${endpoint}`, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.retryAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.makeRequest(endpoint, method, body, retryCount + 1);
      }
      throw error;
    }
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

    await viewMap[this.currentView]();
  }

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
                <p>Cache: ${host.cache_enabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div class="card-actions">
                <button onclick="npmManager.editHost(${host.id})">Edit</button>
                <button onclick="npmManager.deleteHost(${host.id})">Delete</button>
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
                                    ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : "Expired"}</div>
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
      this.loadCurrentView();
      this.showSuccess("Host added successfully");
    } catch (error) {
      this.showError("Failed to add host");
    }
  }

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
      this.loadCertificates();
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
      this.loadCertificates();
      this.showSuccess("Let's Encrypt certificate requested successfully");
    } catch (error) {
      this.showError("Failed to request Let's Encrypt certificate");
    }
  }

  async renewCertificate(certId) {
    try {
      await this.makeRequest(`/nginx/certificates/${certId}/renew`, "POST");
      this.showSuccess("Certificate renewal initiated");
      this.loadCertificates();
    } catch (error) {
      this.showError("Failed to renew certificate");
    }
  }

  async deleteCertificate(certId) {
    if (!confirm("Are you sure you want to delete this certificate?")) return;

    try {
      await this.makeRequest(`/nginx/certificates/${certId}`, "DELETE");
      this.showSuccess("Certificate deleted successfully");
      this.loadCertificates();
    } catch (error) {
      this.showError("Failed to delete certificate");
    }
  }

  async deleteHost(hostId) {
    if (!confirm("Are you sure you want to delete this host?")) return;

    try {
      await this.makeRequest(`/nginx/proxy-hosts/${hostId}`, "DELETE");
      this.showSuccess("Host deleted successfully");
      this.loadCurrentView();
    } catch (error) {
      this.showError("Failed to delete host");
    }
  }

  switchView(view) {
    document
      .querySelectorAll(".content-view")
      .forEach((v) => v.classList.remove("active"));
    document
      .querySelectorAll(".sidebar-item")
      .forEach((i) => i.classList.remove("active"));

    document.getElementById(`${view}View`).classList.add("active");
    document.querySelector(`[href="#${view}"]`).classList.add("active");

    this.currentView = view;
    this.loadCurrentView();
  }

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

  handleSearch(query) {
    const elements = document.querySelectorAll(".glass-card");
    query = query.toLowerCase();

    elements.forEach((element) => {
      const text = element.textContent.toLowerCase();
      element.style.display = text.includes(query) ? "block" : "none";
    });
  }

  // static/npm.js (continued)
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

  showError(message) {
    this.showNotification(message, "error");
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add("show"), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  startAutoRefresh() {
    setInterval(() => {
      if (document.visibilityState === "visible") {
        this.loadCurrentView();
      }
    }, this.refreshInterval);

    // Update on visibility change
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.loadCurrentView();
      }
    });
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
                                        <input type="text" id="domain_names" name="domain_names"
                                               value="${host.domain_names.join(", ")}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="forward_host">Forward Host</label>
                                        <input type="text" id="forward_host" name="forward_host"
                                               value="${host.forward_host}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="forward_port">Forward Port</label>
                                        <input type="number" id="forward_port" name="forward_port"
                                               value="${host.forward_port}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="ssl_forced" value="true"
                                                   ${host.ssl_forced ? "checked" : ""}>
                                            Force SSL
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="cache_enabled" value="true"
                                                   ${host.cache_enabled ? "checked" : ""}>
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
                                            <input type="checkbox" name="satisfy_any" value="true"
                                                   ${list.satisfy_any ? "checked" : ""}>
                                            Satisfy Any Condition
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="pass_auth" value="true"
                                                   ${list.pass_auth ? "checked" : ""}>
                                            Pass Authentication
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label for="clients">Allowed Clients (one per line)</label>
                                        <textarea id="clients" name="clients" rows="5">${list.clients?.join("\n") || ""}</textarea>
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
