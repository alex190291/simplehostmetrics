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
    instance = new NginxProxyManagerApi.RedirectionHostsApi();
  });

  describe('(package)', function() {
    describe('RedirectionHostsApi', function() {
      describe('createRedirectionHost', function() {
        it('should call createRedirectionHost successfully', function(done) {
          // TODO: uncomment, update parameter values for createRedirectionHost call and complete the assertions
          /*

          instance.createRedirectionHost(body, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2012);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('deleteRedirectionHost', function() {
        it('should call deleteRedirectionHost successfully', function(done) {
          // TODO: uncomment, update parameter values for deleteRedirectionHost call and complete the assertions
          /*

          instance.deleteRedirectionHost(hostID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(Object);
            // expect(data).to.be(null);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('disableRedirectionHost', function() {
        it('should call disableRedirectionHost successfully', function(done) {
          // TODO: uncomment, update parameter values for disableRedirectionHost call and complete the assertions
          /*

          instance.disableRedirectionHost(hostID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(Object);
            // expect(data).to.be(null);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('enableRedirectionHost', function() {
        it('should call enableRedirectionHost successfully', function(done) {
          // TODO: uncomment, update parameter values for enableRedirectionHost call and complete the assertions
          /*

          instance.enableRedirectionHost(hostID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(Object);
            // expect(data).to.be(null);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('getRedirectionHost', function() {
        it('should call getRedirectionHost successfully', function(done) {
          // TODO: uncomment, update parameter values for getRedirectionHost call and complete the assertions
          /*

          instance.getRedirectionHost(hostID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2012);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('getRedirectionHosts', function() {
        it('should call getRedirectionHosts successfully', function(done) {
          // TODO: uncomment, update parameter values for getRedirectionHosts call and complete the assertions
          /*
          var opts = {};

          instance.getRedirectionHosts(opts, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(Object);
            // expect(data).to.be(null);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('updateRedirectionHost', function() {
        it('should call updateRedirectionHost successfully', function(done) {
          // TODO: uncomment, update parameter values for updateRedirectionHost call and complete the assertions
          /*

          instance.updateRedirectionHost(body, hostID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2012);

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
