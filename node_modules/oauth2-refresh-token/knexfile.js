module.exports = {
  test: {
    client: 'postgresql',
    connection: process.env.TEST_DATABASE_URL || 'postgres://postgres@localhost/refresh-token-test'
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};
