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

const getInfoValue = (label) => {
    const info = lib.queryAll('info', { query: { label } }).find(Boolean);
    return info?.value || '';
};

const time = dayjs(getInfoValue('time'), 'HH:mm');

const TimeManager = {
    time,
    updateTime(minutes) {
        if (!minutes || minutes === 0) {
            this.time = time; // reset
            return;
        }

        const temp = this.time;
        this.time = this.time.add(minutes, 'minutes');
        return temp.format('HH:mm');
    },
    getCurrentTime() {
        return this.time.format('HH:mm');
    },
    reset() {
        this.time = time;
    }
};

Handlebars.registerHelper('timer', (minutes, additionalMinutes) => {
    const parsedMinutes = parseInt(minutes + (additionalMinutes || 0), 10);
    return isNaN(parsedMinutes) ? TimeManager.getCurrentTime() : TimeManager.updateTime(parsedMinutes);
});

Handlebars.registerHelper('d', (e) => String(e).split('|').find(Boolean));

Handlebars.registerHelper('song', (number) => {
    if (!number) return '';

    const currentLanguage = i18next.language;
    const songsForLanguage = songs[currentLanguage] || songs['pt']; // fallback to Portuguese
    const song = songsForLanguage?.find(song => song.number === parseInt(number, 10));
    return song?.title || '';
});

Handlebars.registerHelper('songObject', (number) => {
    if (!number) return null;

    const currentLanguage = i18next.language;
    const songsForLanguage = songs[currentLanguage] || songs['pt']; // fallback to Portuguese
    return songsForLanguage?.find(song => song.number === parseInt(number, 10)) || null;
});

const updateInnerText = (selector, translationKey) => {
    const element = document.querySelector(selector);
    if (element)
        element.textContent = i18next.t(translationKey);
};

const addEventListenerSafe = (selector, event, handler) => {
    const element = document.querySelector(selector);
    if (element)
        element.addEventListener(event, handler);
};

const layoutType = document.querySelector('select[name="layoutType"]');

const initializeApp = async () => {
    try {
        const params = new URL(location.href).searchParams;
        const meetings = lib.queryAll('meetings', {
            query: (r) => Array.from(params.getAll('date')).includes(r.date),
            sort: [['date', 'ASC']]
        });

        const boot = document.getElementById('boot');
        const layout = params.get('layout') || 'default';

        if (layoutType)
            layoutType.value = layout;

        if (boot) {
            const response = await fetch(`layout.${layout}.hbs.html`);
            if (!response.ok)
                throw new Error(`Failed to load layout: ${response.status}`);

            const html = await response.text();
            boot.innerHTML = Handlebars.compile(html)({
                meetings: meetings.map(a => a.data)
            });

            document.querySelectorAll('.schedule').forEach(el => {
                el.classList.add(layout);
            });
        }

        document.title = i18next.t('MIDWEEK_MEETING');
        updateInnerText('#label', 'MIDWEEK_MEETING');

        const nameElement = document.getElementById('name');
        if (nameElement)
            nameElement.textContent = getInfoValue('congregation');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);

// Event handlers
const handlePrint = () => window.print();

const handleBorderSpacing = (e) => {
    const value = e.target.value;
    document.querySelectorAll('table.meeting').forEach(el => {
        el.style.borderSpacing = `0 ${value}px`;
    });
};

const handlePadding = (e) => {
    const value = e.target.value;
    document.querySelectorAll('table.meeting td').forEach(el => {
        el.style.padding = `${value}px 5px`;
    });
};

const handleSpacing = (e) => {
    const value = e.target.value;
    document.querySelectorAll('table.meeting').forEach(el => {
        el.style.marginTop = `${value}px`;
    });
};

const handleHeaderChange = (e) => {
    const elm = document.querySelector('thead');
    if (elm)
        elm.className = e.target.value;
};

const handleFooterChange = (e) => {
    const value = e.target.value;
    document.querySelectorAll('tfoot').forEach(el => {
        el.className = value;
    });
};

const handleDividersChange = (e) => {
    const value = e.target.value;
    document.querySelectorAll('td.hr').forEach(el => {
        const elm = el.closest('tr');
        if (elm)
            elm.className = value;
    });
};

const handleLayoutChange = (e) => {
    const url = new URL(window.location);
    url.searchParams.set('layout', e.target.value);
    window.location.href = url.toString();
};

// Attach event listeners
addEventListenerSafe('#print', 'click', handlePrint);
addEventListenerSafe('#borderSpacing input', 'change', handleBorderSpacing);
addEventListenerSafe('#padding input', 'change', handlePadding);
addEventListenerSafe('#spacing input', 'change', handleSpacing);
addEventListenerSafe('#header select', 'change', handleHeaderChange);
addEventListenerSafe('#footer select', 'change', handleFooterChange);
addEventListenerSafe('#dividers select', 'change', handleDividersChange);

if (layoutType)
    layoutType.addEventListener('change', handleLayoutChange);

// Translation mappings
const TRANSLATION_MAPPINGS = [
    ['#layoutType label', 'TYPE'],
    ['#borderSpacing label', 'BORDER_SPACING'],
    ['#padding label', 'PADDING'],
    ['#footer label', 'FOOTER'],
    ['#header label', 'HEADER'],
    ['#spacing label', 'SPACING'],
    ['#dividers label', 'DIVIDERS'],
    ['#layout', 'LAYOUT'],
    ['#print', 'PRINT']
];

// Apply translations
const applyTranslations = () => {
    TRANSLATION_MAPPINGS.forEach(([selector, translationKey]) => {
        updateInnerText(selector, translationKey);
    });
};

// Initialize translations
applyTranslations();
