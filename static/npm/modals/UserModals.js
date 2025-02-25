// /static/npm/modals/UserModals.js
import { closeModals } from "./common.js";

export function showCreateUserModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("userModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="nickname">Nickname</label>
        <input type="text" id="nickname" name="nickname" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="roles">Roles (comma-separated)</label>
        <input type="text" id="roles" name="roles">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="is_disabled" name="is_disabled">
          Is Disabled
        </label>
      </div>
      <div class="form-group">
        <label for="auth">Auth (JSON: {type, secret})</label>
        <textarea id="auth" name="auth" placeholder='{"type": "password", "secret": ""}'></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Create User</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        name: form.querySelector("#name").value,
        nickname: form.querySelector("#nickname").value,
        email: form.querySelector("#email").value,
        roles: form
          .querySelector("#roles")
          .value.split(",")
          .map((r) => r.trim()),
        is_disabled: form.querySelector("#is_disabled").checked,
        auth: JSON.parse(
          form.querySelector("#auth").value ||
            '{"type": "password", "secret": ""}',
        ),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}

export function showEditUserModal(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await fetch(`/npm-api/users/${userID}`).then((res) =>
        res.json(),
      );
      const modal = document.getElementById("userModal");
      const form = modal.querySelector("form");
      form.innerHTML = `
        <input type="hidden" name="id" value="${user.id}">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" value="${user.name}" required>
        </div>
        <div class="form-group">
          <label for="nickname">Nickname</label>
          <input type="text" id="nickname" name="nickname" value="${user.nickname}" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="${user.email}" required>
        </div>
        <div class="form-group">
          <label for="roles">Roles (comma-separated)</label>
          <input type="text" id="roles" name="roles" value="${(user.roles || []).join(", ")}">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="is_disabled" name="is_disabled" ${user.is_disabled ? "checked" : ""}>
            Is Disabled
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update User</button>
          <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
        </div>
      `;
      modal.style.display = "block";
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          name: form.querySelector("#name").value,
          nickname: form.querySelector("#nickname").value,
          email: form.querySelector("#email").value,
          roles: form
            .querySelector("#roles")
            .value.split(",")
            .map((r) => r.trim()),
          is_disabled: form.querySelector("#is_disabled").checked,
        };
        modal.style.display = "none";
        resolve(data);
      };
    } catch (error) {
      reject(error);
    }
  });
}
