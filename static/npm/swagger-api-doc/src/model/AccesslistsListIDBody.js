/*
 * Nginx Proxy Manager API
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: 2.12.3
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 3.0.67
 *
 * Do not edit the class manually.
 *
 */
import ApiClient from '../ApiClient';

/**
 * The AccesslistsListIDBody model module.
 * @module model/AccesslistsListIDBody
 * @version 2.12.3
 */
export default class AccesslistsListIDBody {
  /**
   * Constructs a new <code>AccesslistsListIDBody</code>.
   * @alias module:model/AccesslistsListIDBody
   * @class
   */
  constructor() {
  }

  /**
   * Constructs a <code>AccesslistsListIDBody</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/AccesslistsListIDBody} obj Optional instance to populate.
   * @return {module:model/AccesslistsListIDBody} The populated <code>AccesslistsListIDBody</code> instance.
   */
  static constructFromObject(data, obj) {
    if (data) {
      obj = obj || new AccesslistsListIDBody();
      if (data.hasOwnProperty('name'))
        obj.name = ApiClient.convertToType(data['name'], Object);
      if (data.hasOwnProperty('satisfy_any'))
        obj.satisfyAny = ApiClient.convertToType(data['satisfy_any'], Object);
      if (data.hasOwnProperty('pass_auth'))
        obj.passAuth = ApiClient.convertToType(data['pass_auth'], Object);
      if (data.hasOwnProperty('items'))
        obj.items = ApiClient.convertToType(data['items'], Object);
      if (data.hasOwnProperty('clients'))
        obj.clients = ApiClient.convertToType(data['clients'], Object);
    }
    return obj;
  }
}

/**
 * @member {Object} name
 */
AccesslistsListIDBody.prototype.name = undefined;

/**
 * @member {Object} satisfyAny
 */
AccesslistsListIDBody.prototype.satisfyAny = undefined;

/**
 * @member {Object} passAuth
 */
AccesslistsListIDBody.prototype.passAuth = undefined;

/**
 * @member {Object} items
 */
AccesslistsListIDBody.prototype.items = undefined;

/**
 * @member {Object} clients
 */
AccesslistsListIDBody.prototype.clients = undefined;

