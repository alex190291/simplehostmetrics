// /static/npm/NPMUtils.js
export function showNotification(message, type) {
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

export function showError(message) {
  showNotification(message, "error");
}

export function showSuccess(message) {
  showNotification(message, "success");
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
