// /static/npm/modals/AccessListModals.js
import { makeRequest } from "../NPMService.js";
import { closeModals } from "./common.js";

export function showCreateAccessListModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("accessListModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="name">List Name</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="satisfy_any" name="satisfy_any">
          Satisfy Any
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="pass_auth" name="pass_auth">
          Pass Authentication
        </label>
      </div>
      <div class="form-group">
        <label for="items">Items (JSON Array)</label>
        <textarea id="items" name="items" placeholder='[{"username": "user", "password": "pass"}]'></textarea>
      </div>
      <div class="form-group">
        <label for="clients">Clients (JSON Array)</label>
        <textarea id="clients" name="clients" placeholder='[{"address": "1.2.3.4", "directive": "allow"}]'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create Access List</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        name: form.querySelector("#name").value,
        satisfy_any: form.querySelector("#satisfy_any").checked,
        pass_auth: form.querySelector("#pass_auth").checked,
        items: JSON.parse(form.querySelector("#items").value || "[]"),
        clients: JSON.parse(form.querySelector("#clients").value || "[]"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showEditAccessListModal(listId) {
  return new Promise(async (resolve, reject) => {
    try {
      const list = await makeRequest(
        "/npm-api",
        `/nginx/access-lists/${listId}`,
      );
      const modal = document.getElementById("accessListModal");
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${list.id}">
        <div class="form-group">
          <label for="name">List Name</label>
          <input type="text" id="name" name="name" value="${list.name}" required>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="satisfy_any" name="satisfy_any" ${list.satisfy_any ? "checked" : ""}>
            Satisfy Any
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="pass_auth" name="pass_auth" ${list.pass_auth ? "checked" : ""}>
            Pass Authentication
          </label>
        </div>
        <div class="form-group">
          <label for="items">Items (JSON Array)</label>
          <textarea id="items" name="items">${JSON.stringify(list.items || [])}</textarea>
        </div>
        <div class="form-group">
          <label for="clients">Clients (JSON Array)</label>
          <textarea id="clients" name="clients">${JSON.stringify(list.clients || [])}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update Access List</button>
          <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          name: form.querySelector("#name").value,
          satisfy_any: form.querySelector("#satisfy_any").checked,
          pass_auth: form.querySelector("#pass_auth").checked,
          items: JSON.parse(form.querySelector("#items").value || "[]"),
          clients: JSON.parse(form.querySelector("#clients").value || "[]"),
        };
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      reject(error);
    }
  });
}
