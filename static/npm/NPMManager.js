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

  // Operations delegating to modals or API calls

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

  async editAccessList(listId) {
    try {
      const list = await makeRequest(
        this.apiBase,
        `/nginx/access-lists/${listId}`,
      );
      // You can implement a modal for editing access lists.
      showSuccess("Edit Access List functionality not yet fully implemented");
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

  async editSetting(settingID) {
    try {
      const settings = await makeRequest(this.apiBase, "/settings");
      const setting = settings.find((s) => s.id === settingID);
      if (!setting) throw new Error("Setting not found");
      showSuccess("Edit Setting functionality not yet fully implemented");
    } catch (error) {
      showError("Failed to load setting details");
    }
  }

  async editStream(streamId) {
    try {
      const stream = await makeRequest(
        this.apiBase,
        `/nginx/streams/${streamId}`,
      );
      showSuccess("Edit Stream functionality not yet fully implemented");
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

  async editRedirectionHost(hostId) {
    try {
      const host = await makeRequest(
        this.apiBase,
        `/nginx/redirection-hosts/${hostId}`,
      );
      showSuccess(
        "Edit Redirection Host functionality not yet fully implemented",
      );
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
}
