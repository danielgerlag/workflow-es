import { Table, Model, Column, Default, PrimaryKey, DataType } from 'sequelize-typescript'

@Table({
    timestamps: false,
    freezeTableName: true
})
export class Event extends Model<Event> {
    
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV1,
        primaryKey: true
    })
    id: string;    
    
    @Column
    eventName: string;
    
    @Column
    eventKey: string;
    
    @Column(DataType.TEXT)
    get eventData(): any {
        return JSON.parse(this.getDataValue('eventData'));
    };
    set eventData(eventData: any) {
        if (eventData) {
            this.setDataValue('eventData', JSON.stringify(eventData));
        }
    }
    
    @Column
    eventTime: Date;
    
    @Column({
        defaultValue: false
    })
    isProcessed: boolean;
}