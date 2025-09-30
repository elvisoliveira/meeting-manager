import localStorageDB from 'localstoragedb';
import { workbook as w } from '../refs/workbook';

export default class Engine {
    constructor() {
        const database = {
            info: ['label', 'value'],
            meetings: ['label', 'date', 'data'],
            publishers: ['name', 'absences'],
            assignments: ['meeting', 'assignment', 'type', 'number', 'assigned', 'partner', '_assigned', '_partner']
        };

        this.lib = new localStorageDB('library', localStorage);

        for (const [key, fields] of Object.entries(database))
            if (!this.lib.tableExists(key))
                this.lib.createTable(key, fields);
    }
    getPublisher(ID) {
        if (!ID) return null;
        const publisher = this.lib.queryAll('publishers', {
            query: { ID }
        }).find(Boolean);
        return publisher;
    }
    getMeeting(ID) {
        if (!ID) return null;
        const meeting = this.lib.queryAll('meetings', {
            query: { ID }
        }).find(Boolean);
        return meeting;
    }
    getAssignment(ID) {
        if (!ID) return null;
        const assignment = this.lib.queryAll('assignments', {
            query: { ID }
        }).find(Boolean);
        if (!assignment) return null;
        assignment.assigned = this.getPublisher(assignment.assigned);
        assignment.partner = this.getPublisher(assignment.partner);
        assignment.meeting = this.getMeeting(assignment.meeting);
        return assignment;
    }
    parseBoard(meetings) {
        for (const m of meetings) { // meeting
            const date = m.week.replace(/\D/g, '');
            const meeting = this.lib.insertOrUpdate('meetings', { date }, {
                date,
                data: m,
                label: m.label,
            });

            if (m.message) continue;

            const meetingId = meeting[meeting.length - 1] || meeting;

            this.lib.deleteRows('assignments', { meeting: meetingId });

            const data = {
                SA: [],
                AA: [],
                AT: [],
                DIS: [],
                CH: { name: m[w.CH] },
                CP: { name: m[w.CP] },
                BR: { name: m[w.BR].reader, number: 3 },
                OT: { name: m[w.OT].speaker },
                SG: { name: ('conductor' in m[w.SG]) ? m[w.SG].conductor : m[w.SG] },
                LAC: m[w.LAC].map(p => ({ name: p.speaker }))
            };

            if (w.CBS in m) {
                data.CSC = { name: m[w.CBS].conductor };
                if ('reader' in m[w.CBS])
                    data.CSR = { name: m[w.CBS].reader };
            }

            if (w.TA in m)
                data.TA = { name: m[w.TA].student };

            [w.IC, w.RV, w.BS].forEach((t) => {
                if (t in m && 'student' in m[t])
                    data.SA.push({
                        name: m[t].student,
                        partner: ('assistant' in m[t]) && m[t].assistant,
                        type: t,
                    });
                if (t in m && 'assistant' in m[t])
                    data.AA.push({
                        name: m[t].assistant,
                        partner: ('student' in m[t]) && m[t].student,
                        type: t
                    });
            });

            if (m[w.AT])
                m[w.AT].forEach((v) => {
                    data.AT.push({
                        name: v
                    });
                });

            if (m[w.AYF])
                m[w.AYF].forEach((v) => {
                    if ('theme' in v && !('assistant' in v))
                        data.TA = {
                            name: v.assigned,
                            number: v.number
                        };
                    else if ('assistant' in v) {
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
                    }
                    else
                        data.DIS.push({
                            name: v.assigned
                        });
                });

            // Process assignments more efficiently
            for (const [key, value] of Object.entries(data))
                if (Array.isArray(value))
                    for (const info of value)
                        this.setAssignment(key, meetingId, info);
                else if (value)
                    this.setAssignment(key, meetingId, value);
        }

        this.lib.commit();
    }
    parseExceptions(absences) {
        for (const [key, value] of Object.entries(absences))
            this.lib.update('publishers', { name: key }, (r) => {
                r.absences = value.map((e) => e.replace(/\D/g, ''));
                return r;
            });
        this.lib.commit();
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
    setInfo(label, value) {
        this.lib.insertOrUpdate('info', { label }, {
            label,
            value
        });
        this.lib.commit();
    }
    setPublisher(name) {
        const publishers = [];
        if (name)
            String(name).split('|').forEach((publisherName) => {
                const trimmedName = publisherName.trim();
                if (trimmedName) {
                    const publisher = this.lib.insertOrUpdate('publishers', { name: trimmedName }, { name: trimmedName });
                    publishers.push(publisher[publisher.length - 1] || publisher);
                }
            });
        return publishers;
    }
    destroy() {
        this.lib.drop('library');
    }
}