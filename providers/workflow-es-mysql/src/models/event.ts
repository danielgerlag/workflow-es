import { Table, Model, Column, Default, PrimaryKey, DataType } from 'sequelize-typescript'

@Table({
    timestamps: false,
    freezeTableName: true
})
export class Event extends Model<Event> {
    
    @Default(DataType.UUIDV1)
    @Column(DataType.UUID)
    @PrimaryKey
    id: string;    
    
    @Column
    eventName: string;
    
    @Column
    eventKey: string;
    
    @Column(DataType.TEXT)
    get eventData(): any {
        return JSON.parse(this.getDataValue('eventData'));
    };
    set eventData(data: any) {
        this.setDataValue('eventData', data);
    }
    
    @Column
    eventTime: Date;
    
    @Column
    isProcessed: boolean;
}