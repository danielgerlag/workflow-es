import { Table, Column, Default, Model, HasMany, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({
    timestamps: false,
    freezeTableName: true
})
export class Workflow extends Model<Workflow> {
    
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV1,
        primaryKey: true
    })
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
        this.setDataValue('data', JSON.stringify(data));
    }

    @Column
    createTime : Date;

    @Column
    completeTime : Date;

    @Column(DataType.TEXT)
    get executionPointers(): any {
        return JSON.parse(this.getDataValue('executionPointers'));
    };
    set executionPointers(data: any) {
        this.setDataValue('executionPointers', JSON.stringify(data));
    }
}