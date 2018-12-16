import { Table, Column, Default, Model, HasMany, PrimaryKey, DataType } from 'sequelize-typescript';
import { ExecutionPointer } from './executionPointer'

@Table({
    timestamps: false,
    freezeTableName: true
})
export class Workflow extends Model<Workflow> {
    
    @Default(DataType.UUIDV1)
    @Column(DataType.UUID)
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

    @Column(DataType.TEXT)
    get data(): any {
        return JSON.parse(this.getDataValue('data'));
    };
    set data(data: any) {
        this.setDataValue('data', data);
    }

    @Column
    createTime : Date;

    @Column
    completeTime : Date;

    @HasMany(() => ExecutionPointer)
    executionPointers : ExecutionPointer[];


    
}