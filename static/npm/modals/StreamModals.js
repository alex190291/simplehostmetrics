// /static/npm/modals/StreamModals.js
import { closeModals } from "../NPMUtils.js";

export function populateStreamHostForm(stream = null) {
  const form = document.getElementById("streamHostForm");
  if (!form) {
    console.error("Stream host form not found");
    return;
  }

  form.innerHTML = generateStreamFormHTML(stream);
  setupStreamForm(form, !!stream);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      const formData = new FormData(form);
      // Use EXACTLY the field names from the documentation
      const data = {
        incoming_port: parseInt(formData.get("incoming_port")),
        forwarding_host: formData.get("forwarding_host"),
        forwarding_port: parseInt(formData.get("forwarding_port")),
        tcp_forwarding: formData.has("tcp_forwarding"),
        udp_forwarding: formData.has("udp_forwarding"),
        enabled: formData.has("enabled"),
        certificate_id: 0, // Add this field as required by the documentation
        meta: {}  // Required empty object
      };

      console.log("Sending stream data:", JSON.stringify(data)); // Debug log

      // Create or update the stream
      const StreamManager = await import("../managers/StreamManager.js");
      if (stream) {
        await StreamManager.editStream(stream.id, data);
      } else {
        await StreamManager.createStream(data);
      }

      document.getElementById("streamHostModal").style.display = "none";
    } catch (error) {
      console.error("Form submission error:", error);
      alert("An error occurred: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = stream ? "Update" : "Create";
    }
  };
}

function generateStreamFormHTML(stream = null) {
  const isEdit = stream !== null;
  // Map API response fields to form field names properly
  const incomingPort = isEdit ? stream.listen_port || stream.incoming_port : "";
  const forwardingHost = isEdit ? stream.forward_ip || stream.forwarding_host : "";
  const forwardingPort = isEdit ? stream.forward_port || stream.forwarding_port : "";
  const tcpForwarding = isEdit ? stream.tcp || stream.tcp_forwarding : true;
  const udpForwarding = isEdit ? stream.udp || stream.udp_forwarding : false;
  const enabled = isEdit ? stream.enabled : true;

  return `
    <div class="form-group">
      <label for="incoming_port">Incoming Port</label>
      <input type="number" id="incoming_port" name="incoming_port" value="${incomingPort}" required min="1" max="65535">
    </div>
    <div class="form-group">
      <label for="forwarding_host">Forward Host</label>
      <input type="text" id="forwarding_host" name="forwarding_host" value="${forwardingHost}" required>
    </div>
    <div class="form-group">
      <label for="forwarding_port">Forward Port</label>
      <input type="number" id="forwarding_port" name="forwarding_port" value="${forwardingPort}" required min="1" max="65535">
    </div>
    
    <!-- Replace checkboxes with toggle switches -->
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="tcp_forwarding" name="tcp_forwarding" ${tcpForwarding ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">TCP Forwarding</span>
      </label>
    </div>
    
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="udp_forwarding" name="udp_forwarding" ${udpForwarding ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">UDP Forwarding</span>
      </label>
    </div>
    
    <div class="form-group toggle">
      <label>
        <span class="toggle-switch">
          <input type="checkbox" id="enabled" name="enabled" ${enabled ? "checked" : ""}>
          <span class="slider"></span>
        </span>
        <span class="toggle-label">Enabled</span>
      </label>
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn-primary">${isEdit ? "Update" : "Create"} Stream</button>
      <button type="button" class="btn-secondary modal-close">Cancel</button>
    </div>
  `;
}

function setupStreamForm(form) {
  // Add any additional form setup logic here if needed
}
