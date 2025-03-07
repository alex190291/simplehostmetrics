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
 * The InlineResponse2014 model module.
 * @module model/InlineResponse2014
 * @version 2.12.3
 */
export default class InlineResponse2014 {
  /**
   * Constructs a new <code>InlineResponse2014</code>.
   * Stream object
   * @alias module:model/InlineResponse2014
   * @class
   * @param id {Object} Unique identifier
   * @param createdOn {Object} Date and time of creation
   * @param modifiedOn {Object} Date and time of last update
   * @param ownerUserId {Object} User ID
   * @param incomingPort {Object} 
   * @param forwardingHost {Object} 
   * @param forwardingPort {Object} 
   * @param tcpForwarding {Object} 
   * @param udpForwarding {Object} 
   * @param enabled {Object} Is Enabled
   * @param meta {Object} 
   */
  constructor(id, createdOn, modifiedOn, ownerUserId, incomingPort, forwardingHost, forwardingPort, tcpForwarding, udpForwarding, enabled, meta) {
    this.id = id;
    this.createdOn = createdOn;
    this.modifiedOn = modifiedOn;
    this.ownerUserId = ownerUserId;
    this.incomingPort = incomingPort;
    this.forwardingHost = forwardingHost;
    this.forwardingPort = forwardingPort;
    this.tcpForwarding = tcpForwarding;
    this.udpForwarding = udpForwarding;
    this.enabled = enabled;
    this.meta = meta;
  }

  /**
   * Constructs a <code>InlineResponse2014</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/InlineResponse2014} obj Optional instance to populate.
   * @return {module:model/InlineResponse2014} The populated <code>InlineResponse2014</code> instance.
   */
  static constructFromObject(data, obj) {
    if (data) {
      obj = obj || new InlineResponse2014();
      if (data.hasOwnProperty('id'))
        obj.id = ApiClient.convertToType(data['id'], Object);
      if (data.hasOwnProperty('created_on'))
        obj.createdOn = ApiClient.convertToType(data['created_on'], Object);
      if (data.hasOwnProperty('modified_on'))
        obj.modifiedOn = ApiClient.convertToType(data['modified_on'], Object);
      if (data.hasOwnProperty('owner_user_id'))
        obj.ownerUserId = ApiClient.convertToType(data['owner_user_id'], Object);
      if (data.hasOwnProperty('incoming_port'))
        obj.incomingPort = ApiClient.convertToType(data['incoming_port'], Object);
      if (data.hasOwnProperty('forwarding_host'))
        obj.forwardingHost = ApiClient.convertToType(data['forwarding_host'], Object);
      if (data.hasOwnProperty('forwarding_port'))
        obj.forwardingPort = ApiClient.convertToType(data['forwarding_port'], Object);
      if (data.hasOwnProperty('tcp_forwarding'))
        obj.tcpForwarding = ApiClient.convertToType(data['tcp_forwarding'], Object);
      if (data.hasOwnProperty('udp_forwarding'))
        obj.udpForwarding = ApiClient.convertToType(data['udp_forwarding'], Object);
      if (data.hasOwnProperty('enabled'))
        obj.enabled = ApiClient.convertToType(data['enabled'], Object);
      if (data.hasOwnProperty('certificate_id'))
        obj.certificateId = ApiClient.convertToType(data['certificate_id'], Object);
      if (data.hasOwnProperty('meta'))
        obj.meta = ApiClient.convertToType(data['meta'], Object);
      if (data.hasOwnProperty('owner'))
        obj.owner = ApiClient.convertToType(data['owner'], Object);
      if (data.hasOwnProperty('certificate'))
        obj.certificate = ApiClient.convertToType(data['certificate'], Object);
    }
    return obj;
  }
}

/**
 * Unique identifier
 * @member {Object} id
 */
InlineResponse2014.prototype.id = undefined;

/**
 * Date and time of creation
 * @member {Object} createdOn
 */
InlineResponse2014.prototype.createdOn = undefined;

/**
 * Date and time of last update
 * @member {Object} modifiedOn
 */
InlineResponse2014.prototype.modifiedOn = undefined;

/**
 * User ID
 * @member {Object} ownerUserId
 */
InlineResponse2014.prototype.ownerUserId = undefined;

/**
 * @member {Object} incomingPort
 */
InlineResponse2014.prototype.incomingPort = undefined;

/**
 * @member {Object} forwardingHost
 */
InlineResponse2014.prototype.forwardingHost = undefined;

/**
 * @member {Object} forwardingPort
 */
InlineResponse2014.prototype.forwardingPort = undefined;

/**
 * @member {Object} tcpForwarding
 */
InlineResponse2014.prototype.tcpForwarding = undefined;

/**
 * @member {Object} udpForwarding
 */
InlineResponse2014.prototype.udpForwarding = undefined;

/**
 * Is Enabled
 * @member {Object} enabled
 */
InlineResponse2014.prototype.enabled = undefined;

/**
 * Certificate ID
 * @member {Object} certificateId
 */
InlineResponse2014.prototype.certificateId = undefined;

/**
 * @member {Object} meta
 */
InlineResponse2014.prototype.meta = undefined;

/**
 * User object
 * @member {Object} owner
 */
InlineResponse2014.prototype.owner = undefined;

/**
 * @member {Object} certificate
 */
InlineResponse2014.prototype.certificate = undefined;

