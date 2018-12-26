import { Table, Model, Column, Default, PrimaryKey, BelongsTo, DataType} from 'sequelize-typescript'
import { Workflow } from './workflow'

@Table({
    timestamps: false,
    freezeTableName: true
})
export class Subscription extends Model<Subscription> {
    
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV1,
        primaryKey: true
    })
    id: string;
    
    @Column
    workflowId: string;
    
    @Column
    stepId: number;
    
    @Column
    eventName: string;

    @Column(DataType.TEXT)
    get eventKey(): any {
        return JSON.parse(this.getDataValue('eventKey'));
    };
    set eventKey(data: any) {
        this.setDataValue('eventKey', JSON.stringify(data));
    }
    
    @Column
    subscribeAsOf: Date;
}