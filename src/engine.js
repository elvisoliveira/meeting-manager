import localStorageDB from 'localstoragedb';
import { workbook as w } from './refs.workbook';

export default class Engine {
    lib = new localStorageDB('library', localStorage);
    constructor() {
        const self = this;
        const database = {
            meetings: ['label', 'date', 'data'],
            publishers: ['name'],
            assignments: ['meeting', 'assignment', 'type', 'number', 'assigned', 'partner', '_assigned', '_partner']
        }

        Object.keys(database).forEach(function(key) {
            if(!self.lib.tableExists(key))
                self.lib.createTable(key, database[key]);
        });
    }
    getPublisher(id) {
        const publisher = this.lib.queryAll('publishers', {
            query: {
                ID: id
            }
        }).find(Boolean);
        return publisher;
    }
    getMeeting(id) {
        const meeting = this.lib.queryAll('meetings', {
            query: {
                ID: id
            }
        }).find(Boolean);
        return meeting;
    }
    getAssignment(id) {
        const assignment = this.lib.queryAll('assignments', {
            query: {
                ID: id
            }
        }).find(Boolean);
        assignment.assigned = this.getPublisher(assignment.assigned);
        assignment.partner = this.getPublisher(assignment.partner);
        assignment.meeting = this.getMeeting(assignment.meeting);
        return assignment;
    }
    parseBoard(meetings) {
        const self = this;
        meetings.forEach((m) => { // meeting
            const date = m.week.replace(/\D/g, '');
            const meeting = self.lib.insertOrUpdate('meetings', { date }, {
                date,
                data: m,
                label: m.label,
            });

            if (m.message)
                return

            const meetingId = meeting[meeting.length - 1] || meeting;

            self.lib.deleteRows('assignments', { meeting: meetingId });

            const data = {
                SA: [],
                AA: [],
                DIS: [],
                CH: { name: m[w.CH] },
                CP: { name: m[w.CP] },
                BR: { name: m[w.BR].reader },
                OT: { name: m[w.OT].speaker },
                SG: { name: m[w.SG].hasOwnProperty('conductor') ? m[w.SG].conductor : m[w.SG] },
                LAC: m[w.LAC].map(p => ({ name: p.speaker }))
            };

            if(m.hasOwnProperty(w.CBS)) {
                data.CSC = { name: m[w.CBS].conductor };
                if(m[w.CBS].hasOwnProperty('reader'))
                    data.CSR = { name: m[w.CBS].reader };
            }

            if(m.hasOwnProperty(w.TA))
                data.TA = { name: m[w.TA].student };

            [w.IC, w.RV, w.BS].forEach((t) => {
                if (m.hasOwnProperty(t) && m[t].hasOwnProperty('student'))
                    data.SA.push({
                        name: m[t].student,
                        partner: m[t].hasOwnProperty('assistant') && m[t].assistant,
                        type: t,
                    });
                if (m.hasOwnProperty(t) && m[t].hasOwnProperty('assistant'))
                    data.AA.push({
                        name: m[t].assistant,
                        partner: m[t].hasOwnProperty('student') && m[t].student,
                        type: t
                    });
            });

            if(m[w.AYF])
                m[w.AYF].forEach((v) => {
                    if(v.hasOwnProperty('theme')) {
                        data.TA = {
                            name: v.assigned,
                            number: v.number
                        };
                    } else if(v.hasOwnProperty('assistant')) {
                        data.SA.push({
                            name: v.assigned,
                            partner: v.assistant,
                            type: v.title,
                            number: v.number
                        });
                        data.AA.push({
                            name: v.assistant,
                            partner: v.assigned,
                            type: v.title
                        });
                    } else {
                        data.DIS.push({
                            name: v.assigned
                        });
                    }
                });

            Object.keys(data).forEach((key) =>  {
                if(Array.isArray(data[key]))
                    data[key].forEach((info) => {
                        this.setAssignment(key, meetingId, info);
                    });
                else
                    this.setAssignment(key, meetingId, data[key]);
            });
        });

        self.lib.commit();
    }
    setAssignment(assignment, meetingId, info) {
        const assigned = this.setPublisher(info.name);
        const partner = this.setPublisher(info.partner);
        this.lib.insert('assignments', {
            meeting: meetingId,
            assignment,
            type: info.type,
            number: info.number,
            assigned: assigned[0],
            _assigned: assigned[1],
            partner: partner[0],
            _partner: partner[1],
        });
    }
    setPublisher(name) {
        const self = this;
        const publishers = [];
        if (name)
            String(name).split('|').forEach((name) => {
                const publisher = self.lib.insertOrUpdate('publishers', { name }, { name });
                publishers.push(publisher[publisher.length - 1] || publisher)
            });
        return publishers;
    }
}
