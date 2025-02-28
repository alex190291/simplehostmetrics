// /static/npm/managers/RedirectionHostManager.js
const Axios = window.axios;

class RedirectionHostManager {
  /**
   * Get all redirection hosts with optional query parameters
   * 
   * @param {Object} query
   * @returns {Promise}
   */
  getAll(query) {
    return Axios.get("/api/nginx/redirection-hosts" + this._getQuery(query));
  }

  /**
   * Get a specific redirection host
   * 
   * @param {Integer} id 
   * @param {Object} query 
   * @returns {Promise}
   */
  get(id, query) {
    return Axios.get("/api/nginx/redirection-hosts/" + id + this._getQuery(query));
  }

  /**
   * Create a new redirection host
   * 
   * @param {Object} data 
   * @returns {Promise}
   */
  create(data) {
    return Axios.post("/api/nginx/redirection-hosts", data);
  }

  /**
   * Update an existing redirection host
   * 
   * @param {Integer} id 
   * @param {Object} data 
   * @returns {Promise}
   */
  update(id, data) {
    return Axios.put("/api/nginx/redirection-hosts/" + id, data);
  }

  /**
   * Delete a redirection host
   * 
   * @param {Integer} id 
   * @returns {Promise}
   */
  delete(id) {
    return Axios.delete("/api/nginx/redirection-hosts/" + id);
  }

  /**
   * Enable a redirection host
   * 
   * @param {Integer} id 
   * @returns {Promise}
   */
  enable(id) {
    return Axios.post("/api/nginx/redirection-hosts/" + id + "/enable");
  }

  /**
   * Disable a redirection host
   * 
   * @param {Integer} id 
   * @returns {Promise}
   */
  disable(id) {
    return Axios.post("/api/nginx/redirection-hosts/" + id + "/disable");
  }

  /**
   * Helper for building query string
   * 
   * @param {Object} query
   * @returns {String}
   * @private
   */
  _getQuery(query) {
    let result = "";
    
    if (query) {
      const params = [];
      
      if (query.expand && query.expand.length) {
        params.push("expand=" + query.expand.join(","));
      }
      
      if (params.length) {
        result = "?" + params.join("&");
      }
    }
    
    return result;
  }
}

export default new RedirectionHostManager();
