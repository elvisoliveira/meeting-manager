import * as Handlebars from 'handlebars';

import dayjs from 'dayjs';
import custom from 'dayjs/plugin/customParseFormat';
import localStorageDB from 'localstoragedb';

import i18next from 'i18next';
import detector from "i18next-browser-languagedetector";
import registerI18nHelper from 'handlebars-i18next';

import { translation } from './translation';

const lib = new localStorageDB('library', localStorage);

registerI18nHelper(Handlebars, i18next);

i18next.use(detector).init(translation);

dayjs.extend(custom);

const time = dayjs(lib.queryAll('info', {
    query: {
        label: 'time'
    }
}).find(Boolean).value, 'HH:mm');

const TimeManager = {
    time,
    updateTime(minutes) {
        if (!minutes)
            this.time = time; // reset
        else {
            const temp = this.time;
            this.time = this.time.add(minutes, 'minutes');
            return temp.format('HH:mm');
        }
    }
};

Handlebars.registerHelper('time', (minutes) => TimeManager.updateTime(minutes));

Handlebars.registerHelper('d', (e) => String(e).split('|').find(Boolean));

const updateInnerText = (selector, translationKey) => {
    const element = document.querySelector(selector);
    if (element)
        element.textContent = i18next.t(translationKey);
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URL(location.href).searchParams;
    const meetings = lib.queryAll('meetings', {
        query: (r) => Array.from(params.getAll('date')).includes(r.date),
        sort: [['date', 'ASC']]
    });

    fetch('board.hbs.html').then((response) => response.text().then((html) => {
        document.getElementById('boot').innerHTML = Handlebars.compile(html)({
            meetings: meetings.map(a => a.data)
        });
    }));

    document.title = `${i18next.t('MIDWEEK_MEETING')}`;
    updateInnerText('#label', 'MIDWEEK_MEETING');

    document.getElementById('name').textContent = lib.queryAll('info', {
        query: {
            label: 'congregation'
        }
    }).find(Boolean).value;
});

document.getElementById('print').addEventListener('click', () => {
    window.print();
});

document.querySelector('#borderSpacing input').addEventListener('change', (e) => {
    const value = e.target.value;
    document.querySelectorAll('table.meeting').forEach(el => {
        el.style.borderSpacing = `0 ${value}px`;
    });
});

updateInnerText('#borderSpacing label', 'BORDER_SPACING');
updateInnerText('#layout', 'LAYOUT');
updateInnerText('#print', 'PRINT');