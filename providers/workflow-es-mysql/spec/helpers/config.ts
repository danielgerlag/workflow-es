import { Sequelize } from 'sequelize-typescript';

export function getConnectionString() {
    return "mysql://root:bonamassa@127.0.0.1:3306/tests";
}

export async function createTestSchema() {
    var sequelize = new Sequelize('mysql://root:bonamassa@127.0.0.1:3306');
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`tests\``);
    await sequelize.close();
}