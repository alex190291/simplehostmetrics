// /static/npm/managers/UserManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

export async function loadUsers() {
  try {
    await Views.loadUsers();
  } catch (error) {
    showError("Failed to load users");
  }
}

export async function createUser(userData) {
  try {
    await makeRequest("/npm-api", "/users", "POST", userData);
    showSuccess("User created successfully");
    await Views.loadUsers();
  } catch (error) {
    showError("Failed to create user");
  }
}

export async function updateUser(userID, userData) {
  try {
    await makeRequest("/npm-api", `/users/${userID}`, "PUT", userData);
    showSuccess("User updated successfully");
    await Views.loadUsers();
  } catch (error) {
    showError("Failed to update user");
  }
}

export async function deleteUser(userID) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    await makeRequest("/npm-api", `/users/${userID}`, "DELETE");
    showSuccess("User deleted successfully");
    await Views.loadUsers();
  } catch (error) {
    showError("Failed to delete user");
  }
}

export async function updateUserAuth(userID, type, current, secret) {
  try {
    await makeRequest("/npm-api", `/users/${userID}/auth`, "PUT", {
      type,
      current,
      secret,
    });
    showSuccess("User authentication updated successfully");
  } catch (error) {
    showError("Failed to update user authentication");
  }
}

export async function updateUserPermissions(userID, permissions) {
  try {
    await makeRequest(
      "/npm-api",
      `/users/${userID}/permissions`,
      "PUT",
      permissions,
    );
    showSuccess("User permissions updated successfully");
  } catch (error) {
    showError("Failed to update user permissions");
  }
}

export async function loginAsUser(userID) {
  try {
    const result = await makeRequest(
      "/npm-api",
      `/users/${userID}/login`,
      "POST",
    );
    showSuccess("Logged in as user successfully");
    return result;
  } catch (error) {
    showError("Failed to login as user");
  }
}
