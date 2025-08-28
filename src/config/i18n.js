import i18next from 'i18next';
import detector from "i18next-browser-languagedetector";
import registerI18nHelper from 'handlebars-i18next';

import { translation } from './translation';

import * as Handlebars from 'handlebars';

registerI18nHelper(Handlebars, i18next);

i18next.use(detector).init(translation);

export default i18next;