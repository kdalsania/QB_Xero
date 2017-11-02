oauth2-refresh-token
=============

Makes managing oauth2 access and refresh tokens easy.  Call `refresh()` to refresh the access token (and store the latest refresh token.)
Call `getAccessToken()` to get the latest access token.  It will not auto-refresh if the access token has expired... You need to do this.

Usage:
```javascript
var refreshToken = require('oauth2-token-refresh')('postgres://somedbserver/somedb', credentials, 'initial refresh token');

refreshToken.refresh(); //returns a promise
refreshToken.getAccessToken().then(function(result) {
  console.log(result);
});
```
`credentials` are passed through to  [`simple-oath2`](https://github.com/lelylan/simple-oauth2) and take the form:

```javascript
// Set the configuration settings
const credentials = {
  client: {
    id: '<client-id>',
    secret: '<client-secret>'
  },
  auth: {
    tokenHost: 'https://api.oauth.com'
  }
}
```

## Local dev
```
docker-compose run psql psql -h postgres -c 'create database "refresh-token-test"' -U postgres
docker-compose run node npm test
```
