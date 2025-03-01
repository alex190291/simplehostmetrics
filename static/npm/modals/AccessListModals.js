import { closeModals } from "../NPMUtils.js";
import * as AccessListManager from "../managers/AccessListManager.js";

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
        clients: getClientsFromForm(form),
        items: getAuthItemsFromForm(form)
      };

      // Create or update the access list
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
  const clients = isEdit && accessList.clients ? accessList.clients : [];
  const items = isEdit && accessList.items ? accessList.items : [];

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
    
    <!-- Replace checkbox with toggle switch -->
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="pass_auth" name="pass_auth" ${passAuth ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">Pass Auth to Upstream</span>
      </label>
    </div>
    
    <div class="form-group">
      <label>Basic Authentication</label>
      <div id="authItemsList">
        ${generateAuthItemsHTML(items)}
      </div>
      <button type="button" class="btn btn-secondary" onclick="addNewAuthItem()">Add Authentication</button>
    </div>

    <div class="form-group">
      <label>Client IP Restrictions</label>
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

function generateAuthItemsHTML(items = []) {
  if (items.length === 0) {
    return generateAuthItemRow();
  }
  return items.map((item, index) => generateAuthItemRow(item, index)).join("");
}

function generateAuthItemRow(item = null, index = 0) {
  const username = item ? item.username : "";
  return `
    <div class="auth-item-row" data-index="${index}">
      <div class="form-group">
        <input type="text" name="auth_username_${index}" value="${username}" 
               placeholder="Username" required>
      </div>
      <div class="form-group">
        <input type="password" name="auth_password_${index}" 
               placeholder="Password" ${item ? "" : "required"}>
      </div>
      <button type="button" class="btn btn-danger" onclick="removeAuthItem(${index})">Remove</button>
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
  // Close modal functionality
  const closeButtons = form.querySelectorAll(".modal-close");
  closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("accessListModal").style.display = "none";
    });
  });

  // Add client row functionality
  window.addNewClient = () => {
    const clientsList = form.querySelector("#clientsList");
    const newIndex = clientsList.querySelectorAll(".client-row").length;
    const newRow = document.createElement("div");
    newRow.innerHTML = generateClientRow(null, newIndex);
    clientsList.appendChild(newRow.firstElementChild);
  };

  // Remove client row functionality
  window.removeClient = (index) => {
    const row = form.querySelector(`.client-row[data-index="${index}"]`);
    if (row) {
      row.remove();
      // Reindex the remaining rows
      const rows = form.querySelectorAll(".client-row");
      rows.forEach((row, idx) => {
        row.dataset.index = idx;
        row.querySelector("input[name^='client_address_']").name = `client_address_${idx}`;
        row.querySelector("select[name^='client_directive_']").name = `client_directive_${idx}`;
        row.querySelector("button").onclick = () => window.removeClient(idx);
      });
    }
  };

  // Add auth item row functionality
  window.addNewAuthItem = () => {
    const authItemsList = form.querySelector("#authItemsList");
    const newIndex = authItemsList.querySelectorAll(".auth-item-row").length;
    const newRow = document.createElement("div");
    newRow.innerHTML = generateAuthItemRow(null, newIndex);
    authItemsList.appendChild(newRow.firstElementChild);
  };

  // Remove auth item row functionality
  window.removeAuthItem = (index) => {
    const row = form.querySelector(`.auth-item-row[data-index="${index}"]`);
    if (row) {
      row.remove();
      // Reindex the remaining rows
      const rows = form.querySelectorAll(".auth-item-row");
      rows.forEach((row, idx) => {
        row.dataset.index = idx;
        row.querySelector("input[name^='auth_username_']").name = `auth_username_${idx}`;
        row.querySelector("input[name^='auth_password_']").name = `auth_password_${idx}`;
        row.querySelector("button").onclick = () => window.removeAuthItem(idx);
      });
    }
  };

  // If no auth items or clients, add an empty row for each
  const authItemsList = form.querySelector("#authItemsList");
  if (authItemsList.children.length === 0) {
    window.addNewAuthItem();
  }
  
  const clientsList = form.querySelector("#clientsList");
  if (clientsList.children.length === 0) {
    window.addNewClient();
  }
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

function getAuthItemsFromForm(form) {
  const items = [];
  const rows = form.querySelectorAll(".auth-item-row");
  
  rows.forEach((row) => {
    const index = row.dataset.index;
    const username = form.querySelector(`[name="auth_username_${index}"]`).value;
    const password = form.querySelector(`[name="auth_password_${index}"]`).value;
    
    if (username) {
      items.push({ username, password });
    }
  });

  return items;
}
