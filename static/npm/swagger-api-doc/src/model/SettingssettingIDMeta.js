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
 * The SettingssettingIDMeta model module.
 * @module model/SettingssettingIDMeta
 * @version 2.12.3
 */
export default class SettingssettingIDMeta {
  /**
   * Constructs a new <code>SettingssettingIDMeta</code>.
   * @alias module:model/SettingssettingIDMeta
   * @class
   */
  constructor() {
  }

  /**
   * Constructs a <code>SettingssettingIDMeta</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/SettingssettingIDMeta} obj Optional instance to populate.
   * @return {module:model/SettingssettingIDMeta} The populated <code>SettingssettingIDMeta</code> instance.
   */
  static constructFromObject(data, obj) {
    if (data) {
      obj = obj || new SettingssettingIDMeta();
      if (data.hasOwnProperty('redirect'))
        obj.redirect = ApiClient.convertToType(data['redirect'], Object);
      if (data.hasOwnProperty('html'))
        obj.html = ApiClient.convertToType(data['html'], Object);
    }
    return obj;
  }
}

/**
 * @member {Object} redirect
 */
SettingssettingIDMeta.prototype.redirect = undefined;

/**
 * @member {Object} html
 */
SettingssettingIDMeta.prototype.html = undefined;

