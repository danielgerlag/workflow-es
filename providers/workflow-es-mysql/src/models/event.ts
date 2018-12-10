import { Table, Model, Column, PrimaryKey } from 'sequelize-typescript'

@Table
export class Event extends Model<Event> {
    
    @Column
    @PrimaryKey
    id: string;    
    
    @Column
    eventName: string;
    
    @Column
    eventKey: string;
    
    @Column
    eventData: any; //Is this a BLOOB data?
    
    @Column
    eventTime: Date;
    
    @Column
    isProcessed: boolean;
}