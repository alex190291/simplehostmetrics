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
import NginxcertificatesMeta from './NginxcertificatesMeta';

/**
 * The NginxCertificatesBody model module.
 * @module model/NginxCertificatesBody
 * @version 2.12.3
 */
export default class NginxCertificatesBody {
  /**
   * Constructs a new <code>NginxCertificatesBody</code>.
   * @alias module:model/NginxCertificatesBody
   * @class
   * @param provider {Object} 
   */
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Constructs a <code>NginxCertificatesBody</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/NginxCertificatesBody} obj Optional instance to populate.
   * @return {module:model/NginxCertificatesBody} The populated <code>NginxCertificatesBody</code> instance.
   */
  static constructFromObject(data, obj) {
    if (data) {
      obj = obj || new NginxCertificatesBody();
      if (data.hasOwnProperty('provider'))
        obj.provider = ApiClient.convertToType(data['provider'], Object);
      if (data.hasOwnProperty('nice_name'))
        obj.niceName = ApiClient.convertToType(data['nice_name'], Object);
      if (data.hasOwnProperty('domain_names'))
        obj.domainNames = ApiClient.convertToType(data['domain_names'], Object);
      if (data.hasOwnProperty('meta'))
        obj.meta = NginxcertificatesMeta.constructFromObject(data['meta']);
    }
    return obj;
  }
}

/**
 * @member {Object} provider
 */
NginxCertificatesBody.prototype.provider = undefined;

/**
 * Nice Name for the custom certificate
 * @member {Object} niceName
 */
NginxCertificatesBody.prototype.niceName = undefined;

/**
 * Domain Names separated by a comma
 * @member {Object} domainNames
 */
NginxCertificatesBody.prototype.domainNames = undefined;

/**
 * @member {module:model/NginxcertificatesMeta} meta
 */
NginxCertificatesBody.prototype.meta = undefined;

