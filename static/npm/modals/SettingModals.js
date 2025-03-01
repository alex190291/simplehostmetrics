// /static/npm/modals/SettingModals.js
import { closeModals } from "./NPMUtils.js";

export function editSettingModal(setting) {
  return new Promise((resolve) => {
    const modal = document.getElementById("settingModal");
    const form = modal.querySelector("form");
    form.innerHTML = `
      <input type="hidden" name="id" value="${setting.id}">
      <div class="form-group">
        <label for="value">Value</label>
        <select id="value" name="value" required>
          <option value="congratulations" ${setting.value === "congratulations" ? "selected" : ""}>Congratulations</option>
          <option value="404" ${setting.value === "404" ? "selected" : ""}>404</option>
          <option value="444" ${setting.value === "444" ? "selected" : ""}>444</option>
          <option value="redirect" ${setting.value === "redirect" ? "selected" : ""}>Redirect</option>
          <option value="html" ${setting.value === "html" ? "selected" : ""}>HTML</option>
        </select>
      </div>
      <div class="form-group">
        <label for="meta">Meta (JSON)</label>
        <textarea id="meta" name="meta" placeholder='{}'>${JSON.stringify(setting.meta || {})}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Update Setting</button>
        <button type="button" class="btn-secondary" onclick="closeModals()">Cancel</button>
      </div>
    `;
    modal.style.display = "block";
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = {
        value: form.querySelector("#value").value,
        meta: JSON.parse(form.querySelector("#meta").value || "{}"),
      };
      modal.style.display = "none";
      resolve(data);
    };
  });
}
