// /static/npm/managers/NPMManager.js
import * as ProxyHostManager from "./ProxyHostManager.js";
import * as RedirectionHostManager from "./RedirectionHostManager.js";
import * as StreamManager from "./StreamManager.js";
import * as ReportManager from "./ReportManager.js";
import * as SettingManager from "./SettingManager.js";
import * as TokenManager from "./TokenManager.js";
import * as UserManager from "./UserManager.js";
import * as CertificateManager from "./CertificateManager.js";
import { makeRequest } from "../NPMService.js";
import { showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";
import { editHostModal } from "../modals/ProxyHostModals.js";
import * as RedirectionHostModals from "../modals/RedirectionHostModals.js";
import { createCertificateActionButtons } from "../modals/CertificateModals.js";

export class NPMManager {
  constructor() {
    this.apiBase = "/npm-api";
    this.currentView = "proxy";
    this.refreshInterval = 30000;
    this.retryAttempts = 3;
    this.initialize();

    // Expose delegate functions for Proxy Hosts:
    this.editHost = this.editHost.bind(this);
    this.deleteHost = ProxyHostManager.deleteProxyHost;
    this.enableProxyHost = ProxyHostManager.enableProxyHost;
    this.disableProxyHost = ProxyHostManager.disableProxyHost;

    // Expose delegate functions for Redirection Hosts:
    this.editRedirectionHost = this.editRedirectionHost.bind(this);
    this.deleteRedirectionHost = RedirectionHostManager.deleteRedirectionHost;
    this.createRedirectionHost = RedirectionHostManager.createRedirectionHost;
    this.enableRedirectionHost = RedirectionHostManager.enableRedirectionHost;
    this.disableRedirectionHost = RedirectionHostManager.disableRedirectionHost;

    // Expose Certificate functions:
    this.renewCertificate = CertificateManager.renewCertificate;
    this.deleteCertificate = CertificateManager.deleteCertificate;
    this.downloadCertificate = CertificateManager.downloadCertificate;
    this.showNewCertificateModal = CertificateManager.showNewCertificateModal;
    this.showUploadCertificateModal =
      CertificateManager.showUploadCertificateModal;
    this.showValidateCertificateModal =
      CertificateManager.showValidateCertificateModal;

    // New function for uploading a new custom certificate.
    this.uploadNewCertificate = async function () {
      try {
        const modals = await import("../modals/CertificateModals.js");
        const certDetails = await modals.showUploadNewCertificateModal();
        await CertificateManager.uploadNewCertificate(certDetails);
      } catch (error) {
        console.error("Failed to upload new certificate", error);
      }
    };

    // Add the instance to the window object for global access
    if (typeof window.npmManager === "undefined") {
      window.npmManager = this;
    } else {
      // Merge with existing npmManager if it exists
      Object.assign(window.npmManager, this);
    }
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
      this.initCertificateActions();
    } catch (error) {
      showError("Failed to connect to NPM API");
      console.error("Init failed:", error);
    }
  }

  initCertificateActions() {
    // Add the certificate action buttons to the appropriate container
    const actionContainer = document.getElementById(
      "certificateActionsContainer",
    );
    if (actionContainer) {
      actionContainer.innerHTML = createCertificateActionButtons();
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

    // New certificate buttons
    const uploadBtn = document.getElementById("uploadCertificateBtn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        this.uploadNewCertificate();
      });
    }

    const newCertBtn = document.getElementById("newCertificateBtn");
    if (newCertBtn) {
      newCertBtn.addEventListener("click", () => {
        this.showNewCertificateModal();
      });
    }

    const validateCertBtn = document.getElementById("validateCertificateBtn");
    if (validateCertBtn) {
      validateCertBtn.addEventListener("click", () => {
        this.showValidateCertificateModal();
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

    // If we're switching to certificates view, initialize the certificate actions
    if (view === "certificates") {
      this.initCertificateActions();
    }
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

  async editHost(hostId) {
    try {
      const host = await makeRequest(
        this.apiBase,
        `/nginx/proxy-hosts/${hostId}`,
      );
      const updatedData = await editHostModal(host);
      await ProxyHostManager.editProxyHost(hostId, updatedData);
    } catch (error) {
      console.error("Failed to edit host", error);
    }
  }

  async editRedirectionHost(hostId) {
    try {
      const updatedData =
        await RedirectionHostModals.showEditRedirectionHostModal(hostId);
      await RedirectionHostManager.editRedirectionHost(hostId, updatedData);
    } catch (error) {
      console.error("Failed to edit redirection host", error);
      showError("Failed to edit redirection host");
    }
  }
}

// Initialize NPMManager when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Create a new instance of NPMManager, this will also add it to window.npmManager
  new NPMManager();
});
