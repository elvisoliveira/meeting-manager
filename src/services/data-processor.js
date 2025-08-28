export class DataProcessor {
    constructor(engine) {
        this.engine = engine;
    }

    processData(data) {
        if (data.meetings) {
            this.engine.parseBoard(data.meetings);
        }

        if (data.absences) {
            this.engine.parseExceptions(data.absences);
        }

        ['congregation', 'time'].forEach((entry) => {
            if (data[entry]) {
                this.engine.setInfo(entry, data[entry]);
            }
        });
    }
}