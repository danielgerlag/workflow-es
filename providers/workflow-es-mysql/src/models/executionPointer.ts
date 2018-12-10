import { Table, Column, Model, Default, PrimaryKey } from 'sequelize-typescript';

@Table
export class ExecutionPointer extends Model<ExecutionPointer> {

    @Column
    @PrimaryKey
    id: string;

    @Column
    stepId : number;

    @Column
    active : boolean;

    @Column
    sleepUntil: number;

    @Column
    persistenceData: any; //Is this a BLOOB data?

    @Column
    startTime: Date;

    @Column
    endTime: Date;

    @Column
    eventName: string;

    @Column
    eventKey: any; //Can I assume that this is a string once the eventKey in Event is a string?

    @Column
    eventPublished: boolean;

    @Column
    eventData: any; //Is this a BLOOB data?

    @Column
    outcome: any; //Is this a BLOOB data?

    @Column
    stepName: string;

    @Column
    @Default(0)
    retryCount: number;

    @Column
    children: string[] = []; //Do I need to define a Children type to handle this?

    @Column
    contextItem: any; //Is this a BLOOB data?

    @Column
    predecessorId: string;

    @Column
    scope: string[] = []; //Do I need to define a Scope type to handle this?

    @Column
    @Default(0)
    status: number;

}