import { Table, Model, Column, PrimaryKey, BelongsTo} from 'sequelize-typescript'
import { Workflow } from './workflow'

@Table
export class Subscription extends Model<Subscription> {
    
    @Column
    @PrimaryKey
    id: string;
    
    @BelongsTo(() => Workflow)
    workflowId: Workflow;
    
    @Column
    stepId: number;
    
    @Column
    eventName: string;
    
    @Column
    eventKey: any; //Can I assume that this is a string once the eventKey in Event is a string?
    
    @Column
    subscribeAsOf: Date;
}