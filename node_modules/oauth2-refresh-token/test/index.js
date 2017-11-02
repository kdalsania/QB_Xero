var expect = require('chai').expect,
    nock = require('nock');
    db = require('../knexfile').test,
    auth = { tokenHost: 'https://login.live.com', tokenPath: '/oauth20_token.srf' },
    client = { id: 'tom', secret: 'jeff' },
    index = require('..')(db, { auth, client }, 'initial_refresh_token');

describe('oauth2-refresh-token', function() {
  var authRequests;
  before(function() {
    authRequests = nock(auth.tokenHost).post(auth.tokenPath).reply(200, {
      refresh_token: 'new_refresh_token',
      access_token: 'new_access_token',
    }).post(auth.tokenPath, {
      refresh_token: 'new_refresh_token',
      grant_type: 'refresh_token',
      client_id: 'tom',
      client_secret: 'jeff'
    }).reply(200, {
      refresh_token: 'even_newer_refresh_token',
      access_token: 'even_newer_access_token'
    });
  });

  it('should give the latest access token, and keep refresh token updated', function(done) {
    index.refresh().then(function() {
      return index.getAccessToken().then(function(token) {
        expect(token).to.be.a('string');
        expect(token).to.equal('new_access_token');
      }).then(function() {
        return index.refresh();
      }).then(function() {
        return index.getAccessToken().then(function(token) {
          expect(token).to.be.a('string');
          expect(token).to.equal('even_newer_access_token');
          authRequests.done();
          done();
        });
      })
    }).catch(done);
  });

  after(function() {
    return index._knex.destroy();
  });
});
