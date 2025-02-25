// /static/npm/managers/SettingManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function editSetting(settingID, updatedData) {
  try {
    await makeRequest("/npm-api", `/settings/${settingID}`, "PUT", updatedData);
    showSuccess("Setting updated successfully");
    await Views.loadSettings();
  } catch (error) {
    showError("Failed to update setting");
  }
}

export async function updateSetting(settingID, newValue, meta) {
  try {
    await makeRequest("/npm-api", `/settings/${settingID}`, "PUT", {
      value: newValue,
      meta,
    });
    showSuccess("Setting updated successfully");
    await Views.loadSettings();
  } catch (error) {
    showError("Failed to update setting");
  }
}
