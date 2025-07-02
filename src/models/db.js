const { Sequelize } = require('sequelize');
let sequelize;

if (process.env.NODE_ENV === 'test' || !process.env.DB_HOST) {
  sequelize = new Sequelize('sqlite::memory:', { logging: false });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME   || 'posdb',
    process.env.DB_USER   || 'posuser',
    process.env.DB_PASS   || 'pospass',
    {
      host: process.env.DB_HOST,
      dialect: 'postgres',
      logging: false
    }
  );
}

module.exports = sequelize;