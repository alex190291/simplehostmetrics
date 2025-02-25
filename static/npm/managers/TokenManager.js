// /static/npm/managers/TokenManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";

export async function refreshToken() {
  try {
    const tokenData = await makeRequest("/npm-api", "/tokens");
    showSuccess("Token refreshed");
    return tokenData;
  } catch (error) {
    showError("Failed to refresh token");
  }
}

export async function requestToken(identity, secret, scope) {
  try {
    const body = { identity, secret };
    if (scope) body.scope = scope;
    const tokenData = await makeRequest("/npm-api", "/tokens", "POST", body);
    showSuccess("Token requested successfully");
    return tokenData;
  } catch (error) {
    showError("Failed to request token");
  }
}
