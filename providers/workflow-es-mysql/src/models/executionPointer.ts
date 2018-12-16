import { Table, Column, Model, Default, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({
    timestamps: false,
    freezeTableName: true
})
export class ExecutionPointer extends Model<ExecutionPointer> {

    @Default(DataType.UUIDV1)
    @Column(DataType.UUID)
    @PrimaryKey
    id: string;

    @Column
    stepId : number;

    @Column
    active : boolean;

    @Column
    sleepUntil: number;

    @Column(DataType.TEXT)
    get persistenceData(): any {
        return JSON.parse(this.getDataValue('persistenceData'));
    };
    set persistenceData(data: any) {
        this.setDataValue('persistenceData', data);
    }

    @Column
    startTime: Date;

    @Column
    endTime: Date;

    @Column
    eventName: string;

    @Column(DataType.TEXT)
    get eventKey(): any {
        return JSON.parse(this.getDataValue('eventKey'));
    };
    set eventKey(data: any) {
        this.setDataValue('eventKey', data);
    }

    @Column
    eventPublished: boolean;

    @Column(DataType.TEXT)
    get eventData(): any {
        return JSON.parse(this.getDataValue('eventData'));
    };
    set eventData(data: any) {
        this.setDataValue('eventData', data);
    }

    @Column(DataType.TEXT)
    get outcome(): any {
        return JSON.parse(this.getDataValue('outcome'));
    };
    set outcome(data: any) {
        this.setDataValue('outcome', data);
    }

    @Column
    stepName: string;

    @Column
    @Default(0)
    retryCount: number;

    @Column(DataType.TEXT)
    get children(): string[] {
        return JSON.parse(this.getDataValue('children'));
    };
    set children(data: string[]) {
        this.setDataValue('children', data);
    }

    @Column(DataType.TEXT)
    get contextItem(): any {
        return JSON.parse(this.getDataValue('contextItem'));
    };
    set contextItem(data: any) {
        this.setDataValue('contextItem', data);
    }

    @Column
    predecessorId: string;
    
    @Column(DataType.TEXT)
    get scope(): string[] {
        return JSON.parse(this.getDataValue('scope'));
    };
    set scope(data: string[]) {
        this.setDataValue('scope', data);
    }

    @Column
    @Default(0)
    status: number;

}