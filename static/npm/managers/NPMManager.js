// /static/npm/managers/NPMManager.js
import * as ProxyHostModals from "../modals/ProxyHostModals.js";
import * as ProxyHostManager from "./ProxyHostManager.js";
import * as RedirectionHostManager from "./RedirectionHostManager.js";
import * as RedirectionHostModals from "../modals/RedirectionHostModals.js";
import * as ReportManager from "./ReportManager.js";
import * as CertificateManager from "./CertificateManager.js";
import * as AccessListManager from "./AccessListManager.js";
import { makeRequest } from "../NPMService.js";
import { showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export class NPMManager {
  constructor() {
    this.apiBase = "/npm-api";
    this.currentView = "proxy";
    this.refreshInterval = 30000;
    this.retryAttempts = 3;
    this.initialize();

    // Update the proxy host modal function to handle errors properly
    this.editProxyHostModal = async (hostId) => {
      try {
        const modal = await ProxyHostModals.editProxyHostModal(hostId);
        const updatedData = await modal;
        await ProxyHostManager.editProxyHost(hostId, updatedData);
      } catch (error) {
        // Only show error if it wasn't a user cancellation
        if (error.message !== "Edit cancelled by user") {
          console.error("Failed to edit proxy host", error);
          showError("Failed to edit proxy host");
        }
      }
    };

    this.editRedirectionHostModal = async (hostId) => {
      try {
        const updatedData = await RedirectionHostModals.editRedirectionHostModal(hostId);
        await RedirectionHostManager.editRedirectionHost(hostId, updatedData);
      } catch (error) {
        // Only show error if it wasn't a user cancellation
        if (error.message !== "Edit cancelled by user") {
          console.error("Failed to edit redirection host", error);
          showError("Failed to edit redirection host");
        }
      }
    };

    // Update access list modal function
    this.editAccessListModal = async (listId) => {
      try {
        const accessList = await AccessListManager.getAccessList(listId);
        const modals = await import("../modals/AccessListModals.js");
        modals.populateAccessListForm(accessList);
        document.getElementById("accessListModal").style.display = "flex";
      } catch (error) {
        console.error("Failed to edit access list", error);
        showError("Failed to open access list edit form");
      }
    };

    // Add delete access list function
    this.deleteAccessList = AccessListManager.deleteAccessList;

    // Expose Certificate functions:
    this.renewCertificate = CertificateManager.renewCertificate;
    this.deleteCertificate = CertificateManager.deleteCertificate;
    this.downloadCertificate = CertificateManager.downloadCertificate;

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
        import("../modals/ProxyHostModals.js").then((modals) => {
          modals.populateAddHostForm();
          document.getElementById("addHostModal").style.display = "flex";
        });
      });
    }
    const addNewRedirBtn = document.getElementById("addNewBtn");
    if (addNewBtn) {
      addNewBtn.addEventListener("click", () => {
        import("../modals/RedirectionHostModals.js").then((modals) => {
          modals.populateAddRedirectionHostForm();
          document.getElementById("addRedirectionHostModal").style.display = "flex";
        });
      });
    }

    // New upload button for custom certificates.
    const uploadBtn = document.getElementById("uploadCertificateBtn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        this.uploadNewCertificate();
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
}
