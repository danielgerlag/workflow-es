import { Sequelize } from 'sequelize-typescript';
import { Event } from './models/event';
import { Subscription } from './models/subscription';
import { Workflow } from './models/workflow';

export async function initializeSequelize(connectionString) {
  const sequelize = new Sequelize(connectionString);

  await sequelize.addModels([Event, Subscription, Workflow]);

  return sequelize;
}