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
 * The DeadhostsHostIDBody model module.
 * @module model/DeadhostsHostIDBody
 * @version 2.12.3
 */
export default class DeadhostsHostIDBody {
  /**
   * Constructs a new <code>DeadhostsHostIDBody</code>.
   * @alias module:model/DeadhostsHostIDBody
   * @class
   */
  constructor() {
  }

  /**
   * Constructs a <code>DeadhostsHostIDBody</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/DeadhostsHostIDBody} obj Optional instance to populate.
   * @return {module:model/DeadhostsHostIDBody} The populated <code>DeadhostsHostIDBody</code> instance.
   */
  static constructFromObject(data, obj) {
    if (data) {
      obj = obj || new DeadhostsHostIDBody();
      if (data.hasOwnProperty('domain_names'))
        obj.domainNames = ApiClient.convertToType(data['domain_names'], Object);
      if (data.hasOwnProperty('certificate_id'))
        obj.certificateId = ApiClient.convertToType(data['certificate_id'], Object);
      if (data.hasOwnProperty('ssl_forced'))
        obj.sslForced = ApiClient.convertToType(data['ssl_forced'], Object);
      if (data.hasOwnProperty('hsts_enabled'))
        obj.hstsEnabled = ApiClient.convertToType(data['hsts_enabled'], Object);
      if (data.hasOwnProperty('hsts_subdomains'))
        obj.hstsSubdomains = ApiClient.convertToType(data['hsts_subdomains'], Object);
      if (data.hasOwnProperty('http2_support'))
        obj.http2Support = ApiClient.convertToType(data['http2_support'], Object);
      if (data.hasOwnProperty('advanced_config'))
        obj.advancedConfig = ApiClient.convertToType(data['advanced_config'], Object);
      if (data.hasOwnProperty('meta'))
        obj.meta = ApiClient.convertToType(data['meta'], Object);
    }
    return obj;
  }
}

/**
 * Domain Names separated by a comma
 * @member {Object} domainNames
 */
DeadhostsHostIDBody.prototype.domainNames = undefined;

/**
 * Certificate ID
 * @member {Object} certificateId
 */
DeadhostsHostIDBody.prototype.certificateId = undefined;

/**
 * Is SSL Forced
 * @member {Object} sslForced
 */
DeadhostsHostIDBody.prototype.sslForced = undefined;

/**
 * Is HSTS Enabled
 * @member {Object} hstsEnabled
 */
DeadhostsHostIDBody.prototype.hstsEnabled = undefined;

/**
 * Is HSTS applicable to all subdomains
 * @member {Object} hstsSubdomains
 */
DeadhostsHostIDBody.prototype.hstsSubdomains = undefined;

/**
 * HTTP2 Protocol Support
 * @member {Object} http2Support
 */
DeadhostsHostIDBody.prototype.http2Support = undefined;

/**
 * @member {Object} advancedConfig
 */
DeadhostsHostIDBody.prototype.advancedConfig = undefined;

/**
 * @member {Object} meta
 */
DeadhostsHostIDBody.prototype.meta = undefined;

