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
    instance = new NginxProxyManagerApi.StreamsApi();
  });

  describe('(package)', function() {
    describe('StreamsApi', function() {
      describe('createStream', function() {
        it('should call createStream successfully', function(done) {
          // TODO: uncomment, update parameter values for createStream call and complete the assertions
          /*

          instance.createStream(body, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2014);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('deleteStream', function() {
        it('should call deleteStream successfully', function(done) {
          // TODO: uncomment, update parameter values for deleteStream call and complete the assertions
          /*

          instance.deleteStream(streamID, function(error, data, response) {
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
      describe('disableStream', function() {
        it('should call disableStream successfully', function(done) {
          // TODO: uncomment, update parameter values for disableStream call and complete the assertions
          /*

          instance.disableStream(streamID, function(error, data, response) {
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
      describe('enableStream', function() {
        it('should call enableStream successfully', function(done) {
          // TODO: uncomment, update parameter values for enableStream call and complete the assertions
          /*

          instance.enableStream(streamID, function(error, data, response) {
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
      describe('getStream', function() {
        it('should call getStream successfully', function(done) {
          // TODO: uncomment, update parameter values for getStream call and complete the assertions
          /*

          instance.getStream(streamID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2014);

            done();
          });
          */
          // TODO: uncomment and complete method invocation above, then delete this line and the next:
          done();
        });
      });
      describe('getStreams', function() {
        it('should call getStreams successfully', function(done) {
          // TODO: uncomment, update parameter values for getStreams call and complete the assertions
          /*
          var opts = {};

          instance.getStreams(opts, function(error, data, response) {
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
      describe('updateStream', function() {
        it('should call updateStream successfully', function(done) {
          // TODO: uncomment, update parameter values for updateStream call and complete the assertions
          /*

          instance.updateStream(body, streamID, function(error, data, response) {
            if (error) {
              done(error);
              return;
            }
            // TODO: update response assertions
            expect(data).to.be.a(NginxProxyManagerApi.InlineResponse2014);

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
