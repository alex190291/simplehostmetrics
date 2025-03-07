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
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD.
    define(['expect.js', '../../src/index'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    factory(require('expect.js'), require('../../src/index'));
  } else {
    // Browser globals (root is window)
    factory(root.expect, root.NginxProxyManagerApi);
  }
}(this, function(expect, NginxProxyManagerApi) {
  'use strict';

  var instance;

  beforeEach(function() {
    instance = new NginxProxyManagerApi.TokensApi();
  });

  describe('(package)', function() {
    describe('TokensApi', function() {
      describe('refreshToken', function() {
        it('should call refreshToken successfully', function(done) {
          // TODO: uncomment refreshToken call and complete the assertions
          /*

          instance.refreshToken(function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2007);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('requestToken', function() {
        it('should call requestToken successfully', function(done) {
          // TODO: uncomment, update parameter values for requestToken call and complete the assertions
          /*

          instance.requestToken(body, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2007);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
    });
  });

}));
