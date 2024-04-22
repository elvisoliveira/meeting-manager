import * as Handlebars from 'handlebars';
import dayjs from 'dayjs';
import custom from 'dayjs/plugin/customParseFormat';
import localStorageDB from 'localstoragedb';

dayjs.extend(custom);

const time = dayjs('19:15', 'HH:mm');

const TimeManager = {
    time,
    updateTime(minutes) {
        if (!minutes) {
            this.time = time; // Reset
        } else {
            const temp = this.time;
            this.time = this.time.add(minutes, 'minutes');
            return temp.format('HH:mm');
        }
    }
};

Handlebars.registerHelper('time', function (minutes) {
    return TimeManager.updateTime(minutes);
});

document.addEventListener('DOMContentLoaded', () => {
    const params = new URL(location.href).searchParams;
    const meetings = (new localStorageDB('library', localStorage)).queryAll('meetings', {
        query: function(r) {
            return Array.from(params.getAll('date')).includes(r.date);
        }
    });
    fetch('board.hbs').then((response) => response.text().then((html) => {
        document.getElementById('boot').innerHTML = Handlebars.compile(html)({
            meetings: meetings.map(a => a.data)
        });
    }));
});