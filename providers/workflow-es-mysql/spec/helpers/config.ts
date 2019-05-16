import { Sequelize } from 'sequelize';

export function getConnectionString() {
    return "mysql://root:test-password@127.0.0.1:3308/tests";
}

export async function createTestSchema() {
    var sequelize = new Sequelize('mysql://root:test-password@127.0.0.1:3308');
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`tests\``);
    await sequelize.close();
}