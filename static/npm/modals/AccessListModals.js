// /static/npm/modals/AccessListModals.js
import { closeModals } from "../common.js";

export function populateAccessListForm(accessList = null) {
  const form = document.getElementById("accessListForm");
  if (!form) {
    console.error("Access list form not found");
    return;
  }

  form.innerHTML = generateAccessListFormHTML(accessList);
  setupAccessListForm(form, !!accessList);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      const data = {
        name: formData.get("name"),
        satisfy_any: formData.get("satisfy_any") === "true",
        pass_auth: formData.has("pass_auth"),
        clients: getClientsFromForm(form)
      };

      // Create or update the access list
      const AccessListManager = await import("../managers/AccessListManager.js");
      if (accessList) {
        await AccessListManager.updateAccessList(accessList.id, data);
      } else {
        await AccessListManager.createAccessList(data);
      }

      document.getElementById("accessListModal").style.display = "none";
    } catch (error) {
      console.error("Form submission error:", error);
      alert("An error occurred: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = accessList ? "Update" : "Create";
    }
  };
}

function generateAccessListFormHTML(accessList = null) {
  const isEdit = accessList !== null;
  const name = isEdit ? accessList.name : "";
  const satisfyAny = isEdit ? accessList.satisfy_any : false;
  const passAuth = isEdit ? accessList.pass_auth : false;
  const clients = isEdit ? accessList.clients : [];

  return `
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" name="name" value="${name}" required>
    </div>
    <div class="form-group">
      <label for="satisfy_any">Authorization</label>
      <select id="satisfy_any" name="satisfy_any">
        <option value="true" ${satisfyAny ? "selected" : ""}>Satisfy Any</option>
        <option value="false" ${!satisfyAny ? "selected" : ""}>Satisfy All</option>
      </select>
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" id="pass_auth" name="pass_auth" ${passAuth ? "checked" : ""}>
        Pass Auth to Upstream
      </label>
    </div>
    <div class="form-group">
      <label>Clients</label>
      <div id="clientsList">
        ${generateClientsHTML(clients)}
      </div>
      <button type="button" class="btn btn-secondary" onclick="addNewClient()">Add Client</button>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn-primary">${isEdit ? "Update" : "Create"} Access List</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

function generateClientsHTML(clients = []) {
  if (clients.length === 0) {
    return generateClientRow();
  }
  return clients.map((client, index) => generateClientRow(client, index)).join("");
}

function generateClientRow(client = null, index = 0) {
  const address = client ? client.address : "";
  const directive = client ? client.directive : "allow";

  return `
    <div class="client-row" data-index="${index}">
      <div class="form-group">
        <input type="text" name="client_address_${index}" value="${address}" 
               placeholder="IP/CIDR or Domain" required>
      </div>
      <div class="form-group">
        <select name="client_directive_${index}">
          <option value="allow" ${directive === "allow" ? "selected" : ""}>Allow</option>
          <option value="deny" ${directive === "deny" ? "selected" : ""}>Deny</option>
        </select>
      </div>
      <button type="button" class="btn btn-danger" onclick="removeClient(${index})">Remove</button>
    </div>
  `;
}

function setupAccessListForm(form) {
  // Add client row functionality
  window.addNewClient = () => {
    const clientsList = form.querySelector("#clientsList");
    const newIndex = clientsList.children.length;
    const newRow = document.createElement("div");
    newRow.innerHTML = generateClientRow(null, newIndex);
    clientsList.appendChild(newRow.firstElementChild);
  };

  // Remove client row functionality
  window.removeClient = (index) => {
    const row = form.querySelector(`.client-row[data-index="${index}"]`);
    if (row) {
      row.remove();
    }
  };
}

function getClientsFromForm(form) {
  const clients = [];
  const rows = form.querySelectorAll(".client-row");
  
  rows.forEach((row) => {
    const index = row.dataset.index;
    const address = form.querySelector(`[name="client_address_${index}"]`).value;
    const directive = form.querySelector(`[name="client_directive_${index}"]`).value;
    
    if (address) {
      clients.push({ address, directive });
    }
  });

  return clients;
}
