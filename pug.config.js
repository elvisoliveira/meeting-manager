const pug = require('pug');

const partners = pug.compile(`
| {{#if this.partners}}
table.tooltip-table {{this.partners}}
| {{/if}}
`);

const tooltip = pug.compile(`
| {{#if this.type}}
|   <strong>{{this.type}}</strong><br />
| {{/if}}
| {{i18n this.assignment}}
| {{#if this._assigned}}
|   <br /> {{ i18n 'BY' }} {{ publisher this._assigned }}
| {{else if this._partner}}
|   <br /> {{ i18n 'WITH' }} {{ publisher this._partner }}
| {{else if this.partner}}
|   <br /> {{ i18n 'WITH' }} {{ publisher this.partner }}
| {{/if}}
`);

const columnBadge = pug.compile(`
| {{#if this.data.message}}
| {{this.data.message}}
| {{else}}
| {{ i18n \'WEEK\' }}: {{this.data.week}}
| {{/if}}
`);

module.exports = {
    locals: {
        partners: partners(),
        tooltip: tooltip(),
        columnBadge: columnBadge(),
        subtitles: require('./src/refs/subtitles.js').subtitles
    }
};