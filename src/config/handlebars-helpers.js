import * as Handlebars from 'handlebars';

export function registerHandlebarsHelpers(engine) {
    Handlebars.registerHelper('includes', (elem, list) => 
        list && list.includes(elem) ? 'absence' : ''
    );
    Handlebars.registerHelper('lowercase', (str) => 
        (str && typeof str === 'string' && str.toLowerCase()) || ''
    );
    Handlebars.registerHelper('publisher', (id) => 
        engine.getPublisher(id).name
    );
}