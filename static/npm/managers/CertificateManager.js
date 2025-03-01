// /static/npm/managers/CertificateManager.js
import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

// Helper to wrap a promise with a timeout.
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout exceeded")), timeoutMs),
    ),
  ]);
}

export async function renewCertificate(certId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/certificates/${certId}/renew`,
      "POST",
    );
    showSuccess("Certificate renewal initiated");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to renew certificate");
  }
}

export async function deleteCertificate(certId) {
  if (!confirm("Are you sure you want to delete this certificate?")) return;
  try {
    await makeRequest("/npm-api", `/nginx/certificates/${certId}`, "DELETE");
    showSuccess("Certificate deleted successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to delete certificate");
  }
}

export async function createCertificate(certData) {
  try {
    // Ensure proper structure for the API based on documentation
    const apiPayload = {
      provider: certData.provider,
      nice_name: certData.nice_name,
      domain_names: certData.domain_names,
      meta: {
        ...certData.meta,
        letsencrypt_agree: true
      }
    };
    
    // If DNS challenge is enabled, handle it specially
    const isDnsChallenge = certData.meta.dns_challenge;
    
    if (isDnsChallenge) {
      apiPayload.meta.dns_challenge = true;
      
      if (certData.meta.dns_provider) {
        apiPayload.meta.dns_provider = certData.meta.dns_provider;
      }
      
      if (certData.meta.dns_provider_credentials) {
        apiPayload.meta.dns_provider_credentials = certData.meta.dns_provider_credentials;
      }
      
      // Get the propagation wait time
      const propagationSeconds = certData.meta.propagation_seconds 
        ? parseInt(certData.meta.propagation_seconds, 10) 
        : 30; // Default to 30 seconds
      
      apiPayload.meta.propagation_seconds = propagationSeconds;
      
      // Show a notification about the DNS challenge
      showSuccess(`Creating certificate with DNS challenge. This may take up to ${propagationSeconds} seconds...`);
    }
    
    // Make the API request
    const response = await makeRequest(
      "/npm-api",
      "/nginx/certificates",
      "POST",
      apiPayload
    );
    
    const certificateId = response.id;
    
    // If it's a DNS challenge, we need to monitor the certificate status
    if (isDnsChallenge && certificateId) {
      // Show initial progress message
      showSuccess("Certificate request submitted. Waiting for DNS validation...");
      
      // Wait for the certificate to be fully created
      await monitorCertificateStatus(certificateId, certData.meta.propagation_seconds || 30);
    } else {
      showSuccess("Certificate created successfully");
    }
    
    // Reload the certificates view
    await Views.loadCertificates();
    
    return response.id;
  } catch (error) {
    console.error("Certificate creation error:", error);
    showError("Failed to create certificate: " + (error.message || "Unknown error"));
    throw error;
  }
}

/**
 * Monitor certificate status during DNS challenge
 * @param {number} certificateId - ID of the certificate to monitor
 * @param {number} maxWaitTime - Maximum time to wait in seconds
 */
async function monitorCertificateStatus(certificateId, maxWaitTime = 60) {
  // Convert to milliseconds and define interval
  const maxWaitMs = maxWaitTime * 1000;
  const checkIntervalMs = 5000; // Check every 5 seconds
  
  // Create progress indicator
  const progressIndicator = document.createElement('div');
  progressIndicator.className = 'dns-challenge-progress';
  progressIndicator.innerHTML = `
    <div class="progress-container">
      <div class="progress-bar"></div>
      <div class="progress-text">Waiting for DNS propagation... (<span class="time-left">${maxWaitTime}</span>s remaining)</div>
    </div>
  `;
  document.body.appendChild(progressIndicator);
  
  // Start monitoring
  const startTime = Date.now();
  let checkCount = 0;
  let lastStatus = null;
  
  try {
    while (Date.now() - startTime < maxWaitMs) {
      // Update progress bar
      const elapsedMs = Date.now() - startTime;
      const progressPercent = Math.min(100, (elapsedMs / maxWaitMs) * 100);
      const timeLeft = Math.max(0, Math.ceil((maxWaitMs - elapsedMs) / 1000));
      
      progressIndicator.querySelector('.progress-bar').style.width = `${progressPercent}%`;
      progressIndicator.querySelector('.time-left').textContent = timeLeft;
      
      // Check certificate status
      try {
        const certificate = await makeRequest("/npm-api", `/nginx/certificates/${certificateId}`);
        
        if (certificate.meta?.letsencrypt_certificate?.cn) {
          // Certificate is successfully created
          progressIndicator.remove();
          showSuccess("Certificate successfully issued and validated!");
          return true;
        }
        
        // Check for specific error status
        if (certificate.meta?.error && certificate.meta.error !== lastStatus) {
          lastStatus = certificate.meta.error;
          progressIndicator.querySelector('.progress-text').textContent = 
            `Status: ${certificate.meta.error}`;
        }
      } catch (checkError) {
        console.warn("Error checking certificate status:", checkError);
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
      checkCount++;
    }
    
    // If we reach here, the timeout was exceeded
    progressIndicator.remove();
    
    // Make one final check to see if the certificate was created despite timeout
    try {
      const finalCheck = await makeRequest("/npm-api", `/nginx/certificates/${certificateId}`);
      if (finalCheck.meta?.letsencrypt_certificate?.cn) {
        showSuccess("Certificate successfully issued and validated!");
        return true;
      }
    } catch (finalCheckError) {
      console.warn("Error on final certificate check:", finalCheckError);
    }
    
    // If we still don't have success, show guidance
    showError(
      "Certificate validation timeout. This doesn't mean the certificate failed - " +
      "it may still be processing. Check the certificate status in a few minutes."
    );
    
    return false;
  } catch (error) {
    // Clean up on error
    progressIndicator.remove();
    throw error;
  }
}

export async function updateCertificate(certId, certData) {
  try {
    await makeRequest(
      "/npm-api", 
      `/nginx/certificates/${certId}`, 
      "PUT", 
      certData
    );
    
    showSuccess("Certificate updated successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to update certificate: " + (error.message || "Unknown error"));
    throw error;
  }
}

export async function validateCertificate(formData) {
  try {
    await makeRequest(
      "/npm-api",
      "/nginx/certificates/validate",
      "POST",
      formData,
    );
    showSuccess("Certificate validated successfully");
  } catch (error) {
    showError("Certificate validation failed: " + (error.message || "Unknown error"));
  }
}

// Fixed to properly test HTTP reachability
export async function testHttpReach(domains) {
  try {
    // Properly encode the domains parameter as described in the API docs
    const encodedDomains = JSON.stringify(domains);
    
    const response = await fetch(`/npm-api/nginx/certificates/test-http?domains=${encodeURIComponent(encodedDomains)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "HTTP reachability test failed");
    }
    
    const results = await response.json();
    
    // Format the response to show test results in a readable format
    let successCount = 0;
    let message = "HTTP Reachability Results:\n\n";
    
    for (const [domain, status] of Object.entries(results)) {
      if (status === "ok") {
        message += `✓ ${domain}: Successful\n`;
        successCount++;
      } else if (status.startsWith("other:")) {
        message += `✗ ${domain}: Failed - ${status.substring(6)}\n`;
      } else if (status === "404") {
        message += `! ${domain}: Reachable but Not Found (404)\n`;
        successCount++; // Count as reachable even though it's 404
      } else {
        message += `✗ ${domain}: Failed - ${status}\n`;
      }
    }
    
    message += `\nSummary: ${successCount} of ${domains.length} domain(s) reachable.`;
    
    if (successCount === domains.length) {
      showSuccess(message);
    } else if (successCount > 0) {
      showSuccess(message); // Using success notification but with mixed results
    } else {
      showError(message); // All failed
    }
    
    return results;
  } catch (error) {
    showError("HTTP reachability test failed: " + (error.message || "Unknown error"));
    throw error;
  }
}

export async function downloadCertificate(certId) {
  try {
    const url = `/npm-api/nginx/certificates/${certId}/download`;
    window.location.href = url;
  } catch (error) {
    showError("Failed to download certificate");
  }
}

export async function uploadCertificate(certId, formData) {
  try {
    // Create a new FormData object for the actual API call
    const apiFormData = new FormData();
    
    // Get the files from the form
    const certFile = formData.get("certificate");
    const keyFile = formData.get("certificate_key");
    
    if (!certFile || !keyFile) {
      throw new Error("Both certificate and key file are required");
    }
    
    // Add files to the API formData
    apiFormData.append("certificate", certFile);
    apiFormData.append("certificate_key", keyFile);
    
    // Use fetch directly since we're dealing with multipart/form-data
    const response = await fetch(`/npm-api/nginx/certificates/${certId}/upload`, {
      method: "POST",
      body: apiFormData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Upload failed");
    }
    
    showSuccess("Certificate uploaded successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to upload certificate: " + (error.message || "Unknown error"));
    throw error;
  }
}

// New method to handle uploading a completely new certificate
export async function uploadNewCertificate(formData) {
  try {
    // First create the certificate metadata
    const niceName = formData.get("certificate_name");
    const domainNames = formData.get("domain_names")
      .split(",")
      .map(domain => domain.trim())
      .filter(domain => domain);
    
    if (!niceName || domainNames.length === 0) {
      throw new Error("Certificate name and at least one domain are required");
    }
    
    // Create the certificate first
    const certData = {
      provider: "other", 
      nice_name: niceName,
      domain_names: domainNames,
      meta: {}
    };
    
    // Create the certificate
    const createResponse = await makeRequest(
      "/npm-api",
      "/nginx/certificates",
      "POST",
      certData
    );
    
    const newCertId = createResponse.id;
    
    if (!newCertId) {
      throw new Error("Failed to create certificate record");
    }
    
    // Now upload the certificate files to the newly created certificate
    await uploadCertificate(newCertId, formData);
    
    showSuccess("Certificate created and uploaded successfully");
    await Views.loadCertificates();
  } catch (error) {
    showError("Failed to upload new certificate: " + (error.message || "Unknown error"));
    throw error;
  }
}
