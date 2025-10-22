import * as Handlebars from 'handlebars';

import dayjs from 'dayjs';
import custom from 'dayjs/plugin/customParseFormat';
import localStorageDB from 'localstoragedb';

import i18next from 'i18next';
import detector from "i18next-browser-languagedetector";
import registerI18nHelper from 'handlebars-i18next';

import { translation } from '../config/translation';
import { songs } from '../refs/songs';

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

Handlebars.registerHelper('timer', (minutes) => TimeManager.updateTime(minutes));

Handlebars.registerHelper('d', (e) => String(e).split('|').find(Boolean));

Handlebars.registerHelper('song', (number) => {
    const currentLanguage = i18next.language;
    const songsForLanguage = songs[currentLanguage] || songs['pt']; // fallback to Portuguese
    const song = songsForLanguage.find(song => song.number === parseInt(number));
    return song.title || '';
});

const updateInnerText = (selector, translationKey) => {
    const element = document.querySelector(selector);
    if (element)
        element.textContent = i18next.t(translationKey);
};

const layoutType = document.querySelector('select[name="layoutType"]');

document.addEventListener('DOMContentLoaded', () => {
    const params = new URL(location.href).searchParams;
    const meetings = lib.queryAll('meetings', {
        query: (r) => Array.from(params.getAll('date')).includes(r.date),
        sort: [['date', 'ASC']]
    });

    const boot = document.getElementById('boot');
    const layout = params.get('layout') || 'default';

    layoutType.value = layout;

    fetch(`layout.${layout}.hbs.html`).then((response) => response.text().then((html) => {
        boot.classList.add(layout);
        boot.innerHTML = Handlebars.compile(html)({
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

document.querySelector('#padding input').addEventListener('change', (e) => {
    const value = e.target.value;
    document.querySelectorAll('table.meeting td').forEach(el => {
        el.style.padding = `${value}px 5px`;
    });
});

document.querySelector('#header select').addEventListener('change', (e) => {
    const elm = document.querySelector('thead');
    elm.removeAttribute("class");
    elm.classList.add(e.target.value);
});

document.querySelector('#footer select').addEventListener('change', (e) => {
    const value = e.target.value;
    document.querySelectorAll('tfoot').forEach(el => {
        el.removeAttribute("class");
        el.classList.add(value);
    });
});

document.querySelector('#dividers select').addEventListener('change', (e) => {
    const value = e.target.value;
    document.querySelectorAll('td.hr').forEach(el => {
        const elm = el.closest('tr');
        elm.removeAttribute("class");
        elm.classList.add(value);
    });
});

layoutType.addEventListener('change', (e) => {
    const url = new URL(window.location);
    url.searchParams.set('layout', e.target.value);
    window.location.href = url.toString();
});

[
    ['#layoutType label', 'TYPE'],
    ['#borderSpacing label', 'BORDER_SPACING'],
    ['#padding label', 'PADDING'],
    ['#footer label', 'FOOTER'],
    ['#header label', 'HEADER'],
    ['#dividers label', 'DIVIDERS'],
    ['#layout', 'LAYOUT'],
    ['#print', 'PRINT']
].forEach(([selector, translationKey]) => {
    updateInnerText(selector, translationKey);
});
