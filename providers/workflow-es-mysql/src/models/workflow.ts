import { Table, Column, Model, HasMany, PrimaryKey } from 'sequelize-typescript';
import { ExecutionPointer } from './executionPointer'

@Table
export class Workflow extends Model<Workflow> {
    
    @Column
    @PrimaryKey
    id : string;

    @Column
    workflowDefinitionId : string;

    @Column
    version : number;

    @Column
    description : string;

    @Column
    nextExecution : number;

    @Column
    status : number;

    @Column
    data : any; //Is this a BLOOB data?

    @Column
    createTime : Date;

    @Column
    completeTime : Date;

    @HasMany(() => ExecutionPointer)
    executionPointers : ExecutionPointer[];


    
}