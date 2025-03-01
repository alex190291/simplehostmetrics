// /static/npm/NPMUtils.js
export function showNotification(message, type, duration = 3000) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 100);
  
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, duration);
  } else {
    // For persistent notifications, add a close button
    const closeBtn = document.createElement("span");
    closeBtn.className = "notification-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    });
    notification.appendChild(closeBtn);
    return notification; // Return the notification element for potential later removal
  }
}

export function showError(message) {
  showNotification(message, "error");
}

export function showSuccess(message, persistent = false) {
  return showNotification(message, "success", persistent ? 0 : 3000);
}

export function showInfo(message, persistent = false) {
  return showNotification(message, "info", persistent ? 0 : 3000);
}

/**
 * Populates a select element with available SSL certificates
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {string|number} selectedValue - The value to preselect (certificate ID)
 */
export async function populateCertificateDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/certificates");
    if (!response.ok) {
      console.error("Failed to load certificates", response.statusText);
      return;
    }
    const certificates = await response.json();
    selectElement.innerHTML = "";
    certificates.forEach((cert) => {
      const option = document.createElement("option");
      option.value = cert.id;
      option.textContent =
        cert.nice_name ||
        (cert.domain_names ? cert.domain_names.join(", ") : "") ||
        cert.provider ||
        cert.id;
      if (cert.id == selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
    const optionNoDns = document.createElement("option");
    optionNoDns.value = "new_nodns";
    optionNoDns.textContent = "Request New Certificate (No DNS Challenge)";
    selectElement.appendChild(optionNoDns);
    const optionDns = document.createElement("option");
    optionDns.value = "new_dns";
    optionDns.textContent = "Request New Certificate (DNS Challenge)";
    selectElement.appendChild(optionDns);
  } catch (error) {
    console.error("Failed to load certificates", error);
  }
}

/**
 * Creates a certificate for a set of domain names
 * @param {Array} domainNames - Array of domain names for the certificate
 * @param {string|boolean} certOption - 'new_dns', 'new_nodns', or false if not creating new cert
 * @returns {Promise<number>} - ID of the created certificate
 */
export async function handleCertificateCreation(domainNames, certOption) {
  // If not creating a new certificate, return the existing option
  if (typeof certOption === 'number' || !certOption.startsWith("new_")) {
    return certOption;
  }

  try {
    const useDnsChallenge = certOption === "new_dns";
    const certPayload = {
      provider: "letsencrypt",
      domain_names: domainNames,
    };

    // Handle DNS challenge if selected
    if (useDnsChallenge) {
      try {
        const dnsData = await openDnsChallengeModal();
        certPayload.dns_challenge = {
          provider: dnsData.provider,
          credentials: dnsData.credentials,
          wait_time: dnsData.wait_time,
        };
      } catch (err) {
        console.error("Failed to configure DNS challenge", err);
        throw err;
      }
    }

    // Create certificate
    const response = await fetch("/npm-api/nginx/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(certPayload),
    });

    if (!response.ok) throw new Error("Certificate creation failed");
    const { id } = await response.json();
    return id;
  } catch (error) {
    console.error("Certificate creation error:", error);
    throw error;
  }
}

/**
 * Opens a modal to configure DNS provider for certificate DNS challenge
 * @returns {Promise<Object>} - DNS provider configuration data
 */
export function openDnsChallengeModal() {
  return new Promise((resolve, reject) => {
    let modal = document.getElementById("dnsChallengeModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "dnsChallengeModal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-content">
          <h2>Select DNS Provider</h2>
          <div id="dnsProviderOptions"></div>
          <div class="form-group">
            <label for="dnsCredentials">API Credentials</label>
            <textarea id="dnsCredentials" name="dnsCredentials" rows="4" placeholder="Enter credentials exactly as required"></textarea>
          </div>
          <div class="form-group">
            <label for="dnsWaitTime">Waiting Time (seconds)</label>
            <input type="number" id="dnsWaitTime" name="dnsWaitTime" value="20" min="5">
          </div>
          <div class="form-actions">
            <button id="dnsConfirm" class="btn btn-primary">Confirm</button>
            <button id="dnsCancel" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.style.display = "flex";

    // Load DNS provider options
    fetch("/static/npm/json/certbot-dns-plugins.json")
      .then((res) => res.json())
      .then((plugins) => {
        const optionsDiv = modal.querySelector("#dnsProviderOptions");
        optionsDiv.innerHTML = "";
        const select = document.createElement("select");
        select.id = "dnsProviderSelect";
        for (const key in plugins) {
          const opt = document.createElement("option");
          opt.value = key;
          opt.textContent = plugins[key].name;
          select.appendChild(opt);
        }
        optionsDiv.appendChild(select);

        modal.querySelector("#dnsConfirm").onclick = () => {
          const provider = document.getElementById("dnsProviderSelect").value;
          const credentials = document
            .getElementById("dnsCredentials")
            .value.trim();
          const wait_time = parseInt(
            document.getElementById("dnsWaitTime").value,
            10,
          );
          modal.style.display = "none";
          resolve({
            provider: provider,
            credentials: credentials,
            wait_time: wait_time,
          });
        };
        modal.querySelector("#dnsCancel").onclick = () => {
          modal.style.display = "none";
          reject(new Error("DNS challenge canceled by user."));
        };
      })
      .catch((err) => {
        modal.style.display = "none";
        reject(err);
      });
  });
}

/**
 * Parses DNS provider credentials from template based on provider key
 * @param {string} provider - DNS provider key
 * @param {Object} credentials - User-provided credentials
 * @returns {string} - Formatted credentials string
 */
export async function formatDnsCredentials(provider, credentials) {
  try {
    // Load the provider template
    const response = await fetch("/static/npm/json/certbot-dns-plugins.json");
    const providers = await response.json();
    
    if (!providers[provider]) {
      return credentials; // Return as-is if provider not found
    }

    // Get the template for this provider
    const template = providers[provider].credentials;
    
    // Return the credentials as they are if they already match the format
    if (credentials.includes('=')) {
      return credentials;
    }
    
    // Try to extract the template variable
    const matches = template.match(/=(.*?)(\n|$)/g);
    if (!matches || matches.length === 0) {
      return credentials;
    }
    
    // Create a simple credential string by replacing the template value
    return template.replace(/=(.*?)(\n|$)/g, `=${credentials}$2`);
  } catch (error) {
    console.error("Error formatting DNS credentials:", error);
    return credentials;
  }
}

// Switching tabs in modals
export function switchTab(tabName, btn) {
  document.querySelectorAll(".tab-content").forEach(function (el) {
    el.style.display = "none";
  });
  const target = document.getElementById(tabName + "Tab");
  if (target) {
    target.style.display = "block";
  }
  document.querySelectorAll(".tab-link").forEach(function (link) {
    link.classList.remove("active");
  });
  btn.classList.add("active");
}

// Close modals
export function closeModals() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.style.display = "none";
  });
}

// Populates Dropdown with Access Lists
export async function populateAccessListDropdown(selectElement, selectedValue = "") {
  try {
    const response = await fetch("/npm-api/nginx/access-lists");
    if (!response.ok) {
      console.error("Failed to load access lists", response.statusText);
      return;
    }
    const accessLists = await response.json();
    selectElement.innerHTML = '<option value="">None</option>';
    accessLists.forEach((list) => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      if (list.id == selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load access lists", error);
  }
}

// Ensure this code runs on page load to set up global handler
document.addEventListener('DOMContentLoaded', () => {
  // Create global npmManager object
  if (!window.npmManager) {
    window.npmManager = {};
  }
  
  // When ready, import all managers
  Promise.all([
    import('./managers/CertificateManager.js'),
    import('./modals/CertificateModals.js')
  ]).then(([certManager, certModals]) => {
    // Certificate functions
    window.npmManager.renewCertificate = certManager.renewCertificate;
    window.npmManager.deleteCertificate = certManager.deleteCertificate;
    window.npmManager.downloadCertificate = certManager.downloadCertificate;
    window.npmManager.uploadCertificate = (certId) => certModals.showUploadCertificateModal(certId);
  }).catch(err => {
    console.error('Failed to load managers:', err);
  });
});

export async function makeRequest(
  apiBase,
  endpoint,
  method = "GET",
  body = null,
  retryAttempts = 3,
) {
  const url = `${apiBase}${endpoint}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Request error (attempt ${attempt + 1}):`, error);
      if (attempt < retryAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
}
