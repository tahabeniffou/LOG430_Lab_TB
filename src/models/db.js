const { Sequelize } = require('sequelize');
let sequelize;

if (process.env.NODE_ENV === 'test' || !process.env.POSTGRES_HOST) {
  sequelize = new Sequelize('sqlite::memory:', { logging: false });
} else {
  sequelize = new Sequelize(
    process.env.POSTGRES_DB   || 'posdb',
    process.env.POSTGRES_USER || 'posuser',
    process.env.POSTGRES_PASSWORD || 'pospass',
    {
      host: process.env.POSTGRES_HOST,
      dialect: 'postgres',
      logging: false
    }
  );
}

module.exports = sequelize;