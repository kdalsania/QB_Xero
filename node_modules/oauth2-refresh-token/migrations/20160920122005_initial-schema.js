
exports.up = function(knex, Promise) {
  return knex.schema.createTable('tokens', function (table) {
    table.increments();
    table.string('refresh_token', 512);
    table.string('access_token', 1024);
    table.timestamps(true, true);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('tokens');
};
