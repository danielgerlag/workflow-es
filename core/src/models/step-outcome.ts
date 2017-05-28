export class StepOutcome {
    public value: (data: any) => any;
    public nextStep: number;

    constructor() {
        this.value = x => null;
    }
}