// /static/npm/managers/NPMManager.js
import * as ProxyHostManager from "./ProxyHostManager.js";
import * as RedirectionHostManager from "./RedirectionHostManager.js";
import * as StreamManager from "./StreamManager.js";
import * as ReportManager from "./ReportManager.js";
import * as SettingManager from "./SettingManager.js";
import * as TokenManager from "./TokenManager.js";
import * as UserManager from "./UserManager.js";
import { makeRequest } from "../NPMService.js";
import { showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";
import { editHostModal } from "../modals/ProxyHostModals.js";
import { showEditRedirectionHostModal } from "../modals/RedirectionHostModals.js";

export class NPMManager {
  constructor() {
    this.apiBase = "/npm-api";
    this.currentView = "proxy";
    this.refreshInterval = 30000;
    this.retryAttempts = 3;
    this.initialize();

    // Expose delegate functions so that global calls like npmManager.editHost() work.
    // Proxy Host delegate functions:
    this.editHost = this.editHost.bind(this);
    this.deleteHost = ProxyHostManager.deleteProxyHost;
    this.enableProxyHost = ProxyHostManager.enableProxyHost;
    this.disableProxyHost = ProxyHostManager.disableProxyHost;

    // Redirection Host delegate functions:
    this.editRedirectionHost = this.editRedirectionHost.bind(this);
    this.deleteRedirectionHost = RedirectionHostManager.deleteRedirectionHost;
    this.createRedirectionHost = RedirectionHostManager.createRedirectionHost;
    this.enableRedirectionHost = RedirectionHostManager.enableRedirectionHost;
    this.disableRedirectionHost = RedirectionHostManager.disableRedirectionHost;

    // Additional manager functions can be attached similarly.
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
        // Example: open proxy host add modal (imported from modals/ProxyHostModals.js)
        import("../modals/ProxyHostModals.js").then((modals) => {
          modals.populateAddHostForm();
          document.getElementById("addHostModal").style.display = "block";
        });
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
      reports: ReportManager.loadReports,
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

  // Delegate function for editing a proxy host.
  async editHost(hostId) {
    try {
      // Load current host details.
      const host = await makeRequest(
        this.apiBase,
        `/nginx/proxy-hosts/${hostId}`,
      );
      // Open the edit modal from the ProxyHostModals.
      const updatedData = await editHostModal(host);
      // Delegate update to ProxyHostManager.
      await ProxyHostManager.editProxyHost(hostId, updatedData);
    } catch (error) {
      console.error("Failed to edit host", error);
    }
  }

  // Delegate function for editing a redirection host
  async editRedirectionHost(hostId) {
    try {
      // Open the edit modal and get updated data
      const updatedData = await showEditRedirectionHostModal(hostId);
      // Delegate update to RedirectionHostManager
      await RedirectionHostManager.editRedirectionHost(hostId, updatedData);
    } catch (error) {
      console.error("Failed to edit redirection host", error);
      showError("Failed to edit redirection host");
    }
  }
}
