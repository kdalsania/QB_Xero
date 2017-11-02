var knex = require('knex')(require('../knexfile.js').test);

beforeEach(function() {
  return knex('tokens').del().catch(function(err) {
    // We may have not run migrations just yet (they are auto-run in index.js).
    if (/.*relation.*does not exist/.test(err.message)) return Promise.resolve();
    return err;
  });
});

after(function() {
  return knex.destroy();
});
