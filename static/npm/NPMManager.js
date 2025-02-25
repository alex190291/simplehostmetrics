// /static/npm/NPMManager.js
import { makeRequest } from "./NPMService.js";
import * as Views from "./NPMViews.js";
import * as Modals from "./NPMModals.js";
import { showError, showSuccess } from "./NPMUtils.js";

export class NPMManager {
  constructor() {
    this.apiBase = "/npm-api";
    this.currentView = "proxy";
    this.refreshInterval = 30000;
    this.retryAttempts = 3;
    this.cache = new Map();
    // Bind methods used as callbacks
    this.loadCurrentView = this.loadCurrentView.bind(this);
    this.startAutoRefresh = this.startAutoRefresh.bind(this);
    this.switchView = this.switchView.bind(this);
    this.closeModals = Modals.closeModals;
    this.initialize();
  }

  async initialize() {
    try {
      const healthCheck = await makeRequest(this.apiBase, "/");
      if (healthCheck.status !== "OK") {
        showError("NPM API is not available");
        return;
      }
      this.setupEventListeners();
      await this.loadCurrentView();
      this.startAutoRefresh();
    } catch (error) {
      showError("Failed to connect to NPM API");
      console.error("Init failed:", error);
    }
  }

  setupEventListeners() {
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.target.getAttribute("href").substring(1);
        this.switchView(view);
      });
    });
    document.querySelectorAll(".sidebar-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        const groupElem = e.target
          .closest(".sidebar-group")
          .querySelector(".sidebar-items");
        this.toggleGroup(groupElem.id);
      });
    });
    const addNewBtn = document.getElementById("addNewBtn");
    if (addNewBtn) {
      addNewBtn.addEventListener("click", () => {
        // Default to add proxy host form
        Modals.populateAddHostForm();
        document.getElementById("addHostModal").style.display = "block";
      });
    }
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.handleSearch(e.target.value),
      );
    }
  }

  switchView(view) {
    document.querySelectorAll(".content-view").forEach((v) => {
      v.style.display = "none";
      v.classList.remove("active");
    });
    document
      .querySelectorAll(".sidebar-item")
      .forEach((item) => item.classList.remove("active"));
    const viewElement = document.getElementById(`${view}View`);
    if (viewElement) {
      viewElement.style.display = "block";
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
    if (!items.style.display || items.style.display === "none") {
      items.style.display = "block";
      header.querySelector(".arrow").style.transform = "rotate(0deg)";
    } else {
      items.style.display = "none";
      header.querySelector(".arrow").style.transform = "rotate(-90deg)";
    }
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

  async loadCurrentView() {
    const viewMap = {
      proxy: Views.loadProxyHosts,
      redirection: Views.loadRedirectionHosts,
      stream: Views.loadStreamHosts,
      access: Views.loadAccessLists,
      certificates: Views.loadCertificates,
      audit: Views.loadAuditLog,
      settings: Views.loadSettings,
      dead: Views.loadDeadHosts,
      reports: Views.loadReports,
      users: Views.loadUsers,
    };
    if (viewMap[this.currentView]) {
      await viewMap[this.currentView]();
    } else {
      console.error(
        `View "${this.currentView}" not found. Falling back to proxy.`,
      );
      this.currentView = "proxy";
      await viewMap.proxy();
    }
  }

  // Proxy Host Operations
  async editHost(hostId) {
    try {
      const host = await makeRequest(
        this.apiBase,
        `/nginx/proxy-hosts/${hostId}`,
      );
      await Modals.editHostModal(host);
    } catch (error) {
      showError("Failed to load host details");
    }
  }

  async deleteHost(hostId) {
    if (!confirm("Are you sure you want to delete this host?")) return;
    try {
      await makeRequest(this.apiBase, `/nginx/proxy-hosts/${hostId}`, "DELETE");
      showSuccess("Host deleted successfully");
      await this.loadCurrentView();
    } catch (error) {
      showError("Failed to delete host");
    }
  }

  async enableProxyHost(hostId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/proxy-hosts/${hostId}/enable`,
        "POST",
      );
      showSuccess("Proxy host enabled successfully");
      await this.loadCurrentView();
    } catch (error) {
      showError("Failed to enable proxy host");
    }
  }

  async disableProxyHost(hostId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/proxy-hosts/${hostId}/disable`,
        "POST",
      );
      showSuccess("Proxy host disabled successfully");
      await this.loadCurrentView();
    } catch (error) {
      showError("Failed to disable proxy host");
    }
  }

  // Certificate Operations
  async renewCertificate(certId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/certificates/${certId}/renew`,
        "POST",
      );
      showSuccess("Certificate renewal initiated");
      await Views.loadCertificates();
    } catch (error) {
      showError("Failed to renew certificate");
    }
  }

  async deleteCertificate(certId) {
    if (!confirm("Are you sure you want to delete this certificate?")) return;
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/certificates/${certId}`,
        "DELETE",
      );
      showSuccess("Certificate deleted successfully");
      await Views.loadCertificates();
    } catch (error) {
      showError("Failed to delete certificate");
    }
  }

  async createCertificate() {
    try {
      const certData = await Modals.showCreateCertificateModal();
      await makeRequest(this.apiBase, "/nginx/certificates", "POST", certData);
      showSuccess("Certificate created successfully");
      await Views.loadCertificates();
    } catch (error) {
      showError("Failed to create certificate");
    }
  }

  async validateCertificate() {
    try {
      const formData = await Modals.showValidateCertificateModal();
      await makeRequest(
        this.apiBase,
        "/nginx/certificates/validate",
        "POST",
        formData,
      );
      showSuccess("Certificate validated successfully");
      await Views.loadCertificates();
    } catch (error) {
      showError("Failed to validate certificate");
    }
  }

  async testHttpReach(domains) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/certificates/test-http?domains=${encodeURIComponent(JSON.stringify(domains))}`,
      );
      showSuccess("HTTP reachability test completed");
    } catch (error) {
      showError("HTTP reachability test failed");
    }
  }

  async downloadCertificate(certId) {
    try {
      const url = `${this.apiBase}/nginx/certificates/${certId}/download`;
      window.location.href = url;
    } catch (error) {
      showError("Failed to download certificate");
    }
  }

  async uploadCertificate(certId) {
    try {
      const formData = await Modals.showUploadCertificateModal(certId);
      await makeRequest(
        this.apiBase,
        `/nginx/certificates/${certId}/upload`,
        "POST",
        formData,
      );
      showSuccess("Certificate uploaded successfully");
      await Views.loadCertificates();
    } catch (error) {
      showError("Failed to upload certificate");
    }
  }

  // Access List Operations
  async editAccessList(listId) {
    try {
      const list = await makeRequest(
        this.apiBase,
        `/nginx/access-lists/${listId}`,
      );
      await Modals.editAccessListModal(list);
    } catch (error) {
      showError("Failed to load access list details");
    }
  }

  async deleteAccessList(listId) {
    if (!confirm("Are you sure you want to delete this access list?")) return;
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/access-lists/${listId}`,
        "DELETE",
      );
      showSuccess("Access list deleted successfully");
      await Views.loadAccessLists();
    } catch (error) {
      showError("Failed to delete access list");
    }
  }

  async createAccessList() {
    try {
      const accessListData = await Modals.showCreateAccessListModal();
      await makeRequest(
        this.apiBase,
        "/nginx/access-lists",
        "POST",
        accessListData,
      );
      showSuccess("Access list created successfully");
      await Views.loadAccessLists();
    } catch (error) {
      showError("Failed to create access list");
    }
  }

  async updateAccessList(listId) {
    try {
      const updatedData = await Modals.showEditAccessListModal(listId);
      await makeRequest(
        this.apiBase,
        `/nginx/access-lists/${listId}`,
        "PUT",
        updatedData,
      );
      showSuccess("Access list updated successfully");
      await Views.loadAccessLists();
    } catch (error) {
      showError("Failed to update access list");
    }
  }

  // Redirection Host Operations
  async editRedirectionHost(hostId) {
    try {
      const host = await makeRequest(
        this.apiBase,
        `/nginx/redirection-hosts/${hostId}`,
      );
      await Modals.editRedirectionHostModal(host);
    } catch (error) {
      showError("Failed to load redirection host details");
    }
  }

  async deleteRedirectionHost(hostId) {
    if (!confirm("Are you sure you want to delete this redirection host?"))
      return;
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/redirection-hosts/${hostId}`,
        "DELETE",
      );
      showSuccess("Redirection host deleted successfully");
      await Views.loadRedirectionHosts();
    } catch (error) {
      showError("Failed to delete redirection host");
    }
  }

  async createRedirectionHost() {
    try {
      const redirData = await Modals.showCreateRedirectionHostModal();
      await makeRequest(
        this.apiBase,
        "/nginx/redirection-hosts",
        "POST",
        redirData,
      );
      showSuccess("Redirection host created successfully");
      await Views.loadRedirectionHosts();
    } catch (error) {
      showError("Failed to create redirection host");
    }
  }

  async updateRedirectionHost(hostId) {
    try {
      const redirData = await Modals.showEditRedirectionHostModal(hostId);
      await makeRequest(
        this.apiBase,
        `/nginx/redirection-hosts/${hostId}`,
        "PUT",
        redirData,
      );
      showSuccess("Redirection host updated successfully");
      await Views.loadRedirectionHosts();
    } catch (error) {
      showError("Failed to update redirection host");
    }
  }

  async enableRedirectionHost(hostId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/redirection-hosts/${hostId}/enable`,
        "POST",
      );
      showSuccess("Redirection host enabled successfully");
      await this.loadCurrentView();
    } catch (error) {
      showError("Failed to enable redirection host");
    }
  }

  async disableRedirectionHost(hostId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/redirection-hosts/${hostId}/disable`,
        "POST",
      );
      showSuccess("Redirection host disabled successfully");
      await this.loadCurrentView();
    } catch (error) {
      showError("Failed to disable redirection host");
    }
  }

  // Dead Host Operations
  async loadDeadHosts() {
    try {
      await Views.loadDeadHosts();
    } catch (error) {
      showError("Failed to load dead hosts");
    }
  }

  async createDeadHost() {
    try {
      const deadData = await Modals.showCreateDeadHostModal();
      await makeRequest(this.apiBase, "/nginx/dead-hosts", "POST", deadData);
      showSuccess("Dead host created successfully");
      await Views.loadDeadHosts();
    } catch (error) {
      showError("Failed to create dead host");
    }
  }

  async updateDeadHost(hostId) {
    try {
      const deadData = await Modals.showEditDeadHostModal(hostId);
      await makeRequest(
        this.apiBase,
        `/nginx/dead-hosts/${hostId}`,
        "PUT",
        deadData,
      );
      showSuccess("Dead host updated successfully");
      await Views.loadDeadHosts();
    } catch (error) {
      showError("Failed to update dead host");
    }
  }

  async deleteDeadHost(hostId) {
    if (!confirm("Are you sure you want to delete this dead host?")) return;
    try {
      await makeRequest(this.apiBase, `/nginx/dead-hosts/${hostId}`, "DELETE");
      showSuccess("Dead host deleted successfully");
      await Views.loadDeadHosts();
    } catch (error) {
      showError("Failed to delete dead host");
    }
  }

  async enableDeadHost(hostId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/dead-hosts/${hostId}/enable`,
        "POST",
      );
      showSuccess("Dead host enabled successfully");
      await Views.loadDeadHosts();
    } catch (error) {
      showError("Failed to enable dead host");
    }
  }

  async disableDeadHost(hostId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/dead-hosts/${hostId}/disable`,
        "POST",
      );
      showSuccess("Dead host disabled successfully");
      await Views.loadDeadHosts();
    } catch (error) {
      showError("Failed to disable dead host");
    }
  }

  // Stream Operations
  async editStream(streamId) {
    try {
      const stream = await makeRequest(
        this.apiBase,
        `/nginx/streams/${streamId}`,
      );
      await Modals.editStreamModal(stream);
    } catch (error) {
      showError("Failed to load stream details");
    }
  }

  async deleteStream(streamId) {
    if (!confirm("Are you sure you want to delete this stream?")) return;
    try {
      await makeRequest(this.apiBase, `/nginx/streams/${streamId}`, "DELETE");
      showSuccess("Stream deleted successfully");
      await Views.loadStreamHosts();
    } catch (error) {
      showError("Failed to delete stream");
    }
  }

  async createStream() {
    try {
      const streamData = await Modals.showCreateStreamModal();
      await makeRequest(this.apiBase, "/nginx/streams", "POST", streamData);
      showSuccess("Stream created successfully");
      await Views.loadStreamHosts();
    } catch (error) {
      showError("Failed to create stream");
    }
  }

  async updateStream(streamId) {
    try {
      const streamData = await Modals.showEditStreamModal(streamId);
      await makeRequest(
        this.apiBase,
        `/nginx/streams/${streamId}`,
        "PUT",
        streamData,
      );
      showSuccess("Stream updated successfully");
      await Views.loadStreamHosts();
    } catch (error) {
      showError("Failed to update stream");
    }
  }

  async enableStream(streamId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/streams/${streamId}/enable`,
        "POST",
      );
      showSuccess("Stream enabled successfully");
      await Views.loadStreamHosts();
    } catch (error) {
      showError("Failed to enable stream");
    }
  }

  async disableStream(streamId) {
    try {
      await makeRequest(
        this.apiBase,
        `/nginx/streams/${streamId}/disable`,
        "POST",
      );
      showSuccess("Stream disabled successfully");
      await Views.loadStreamHosts();
    } catch (error) {
      showError("Failed to disable stream");
    }
  }

  // Reports
  async loadReports() {
    try {
      await Views.loadReports();
    } catch (error) {
      showError("Failed to load reports");
    }
  }

  // Settings
  async editSetting(settingID) {
    try {
      const settings = await makeRequest(this.apiBase, "/settings");
      const setting = settings.find((s) => s.id === settingID);
      if (!setting) throw new Error("Setting not found");
      await Modals.editSettingModal(setting);
    } catch (error) {
      showError("Failed to load setting details");
    }
  }

  async updateSetting(settingID, newValue, meta) {
    try {
      await makeRequest(this.apiBase, `/settings/${settingID}`, "PUT", {
        value: newValue,
        meta,
      });
      showSuccess("Setting updated successfully");
      await Views.loadSettings();
    } catch (error) {
      showError("Failed to update setting");
    }
  }

  // Tokens
  async refreshToken() {
    try {
      const tokenData = await makeRequest(this.apiBase, "/tokens");
      showSuccess("Token refreshed");
      return tokenData;
    } catch (error) {
      showError("Failed to refresh token");
    }
  }

  async requestToken(identity, secret, scope) {
    try {
      const body = { identity, secret };
      if (scope) body.scope = scope;
      const tokenData = await makeRequest(
        this.apiBase,
        "/tokens",
        "POST",
        body,
      );
      showSuccess("Token requested successfully");
      return tokenData;
    } catch (error) {
      showError("Failed to request token");
    }
  }

  // User Operations
  async loadUsers() {
    try {
      await Views.loadUsers();
    } catch (error) {
      showError("Failed to load users");
    }
  }

  async createUser() {
    try {
      const userData = await Modals.showCreateUserModal();
      await makeRequest(this.apiBase, "/users", "POST", userData);
      showSuccess("User created successfully");
      await Views.loadUsers();
    } catch (error) {
      showError("Failed to create user");
    }
  }

  async updateUser(userID) {
    try {
      const userData = await Modals.showEditUserModal(userID);
      await makeRequest(this.apiBase, `/users/${userID}`, "PUT", userData);
      showSuccess("User updated successfully");
      await Views.loadUsers();
    } catch (error) {
      showError("Failed to update user");
    }
  }

  async deleteUser(userID) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await makeRequest(this.apiBase, `/users/${userID}`, "DELETE");
      showSuccess("User deleted successfully");
      await Views.loadUsers();
    } catch (error) {
      showError("Failed to delete user");
    }
  }

  async updateUserAuth(userID, type, current, secret) {
    try {
      await makeRequest(this.apiBase, `/users/${userID}/auth`, "PUT", {
        type,
        current,
        secret,
      });
      showSuccess("User authentication updated successfully");
    } catch (error) {
      showError("Failed to update user authentication");
    }
  }

  async updateUserPermissions(userID, permissions) {
    try {
      await makeRequest(
        this.apiBase,
        `/users/${userID}/permissions`,
        "PUT",
        permissions,
      );
      showSuccess("User permissions updated successfully");
    } catch (error) {
      showError("Failed to update user permissions");
    }
  }

  async loginAsUser(userID) {
    try {
      const result = await makeRequest(
        this.apiBase,
        `/users/${userID}/login`,
        "POST",
      );
      showSuccess("Logged in as user successfully");
      return result;
    } catch (error) {
      showError("Failed to login as user");
    }
  }
}
