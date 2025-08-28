import * as Handlebars from 'handlebars';
import { subtitles } from '../refs/subtitles';
import i18next from '../config/i18n';

export class DataGrid {
    constructor(engine) {
        this.engine = engine;
    }

    assembleData() {
        const data = [];

        this.engine.lib.queryAll('publishers', {
            sort: [['name', 'ASC']]
        }).forEach((publisher) => {
            publisher.meetings = this.engine.lib.queryAll('meetings', {
                sort: [['date', 'ASC']]
            });
            const partners = [];
            
            publisher.meetings.forEach((meeting, i) => {
                const assignments = this.engine.lib.queryAll('assignments', {
                    query: {
                        meeting: meeting.ID,
                        assigned: publisher.ID
                    }
                });
                
                if (assignments.length) {
                    assignments.forEach((assignment, ii) => {
                        if (assignment._assigned)
                            assignments[ii].assignment = 'S';
                        else if (assignment.partner)
                            partners.push({
                                assignment: i18next.t(assignment.assignment),
                                type: assignment.type,
                                publisher: this.engine.getPublisher(assignment.partner).name,
                                meeting: this.engine.getMeeting(assignment.meeting)
                            });
                    });
                    partners.sort((a, b) => a.date - b.date);
                }
                
                this.engine.lib.queryAll('assignments', {
                    query: {
                        meeting: meeting.ID,
                        _assigned: publisher.ID
                    }
                }).forEach((substitution) => {
                    delete substitution._assigned;
                    assignments.push(substitution);
                });
                
                publisher.meetings[i].assignments = assignments;
            });
            
            publisher.partners = partners.reverse().flatMap(i => {
                const date = i.meeting.data.week.replace('-', '/');
                const year = parseInt(date.substring(0, 4));
                return `<tr>
                    <td>${i.publisher}</td>
                    <td>${i.assignment}</td>
                    <td>${year < 2024 ? i18next.t(i.type.toUpperCase()) : i.type}</td>
                    <td>${date}</td>
                </tr>`;
            }).join('');
            
            data.push(publisher);
        });

        return data;
    }

    async renderTable(data) {
        const response = await fetch('table.hbs.html');
        const html = await response.text();
        
        boot.innerHTML = Handlebars.compile(html)({
            data,
            subtitles,
            meetings: this.engine.lib.queryAll('meetings', {
                sort: [['date', 'ASC']]
            })
        });
    }

    async renderFilter() {
        const response = await fetch('filter.hbs.html');
        const html = await response.text();
        
        boot.insertAdjacentHTML('beforeend', Handlebars.compile(html)({
            subtitles
        }));
    }
}