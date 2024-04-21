import { PDFLib } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

const fields = {
    name: {
        id: 1,
        type: "Text_SanSerif"
    },
    assistant: {
        id: 2,
        type: "Text_SanSerif"
    },
    date: {
        id: 3,
        type: "Text_SanSerif"
    },
    part_number: {
        id: 4,
        type: "Text_SanSerif"
    },
    main_hall: {
        id: 5,
        type: "CheckBox"
    },
    auxiliary_classroom_1: {
        id: 6,
        type: "CheckBox"
    },
    auxiliary_classroom_2: {
        id: 7,
        type: "CheckBox"
    }
};

export default class S89 {
    constructor(doc) {
        this.id = 900;
        this.name = '';
        this.assistant = '';
        this.date = '';
        this.part_number = '';
        this.main_hall = false;
        this.auxiliary_classroom_1 = false;
        this.auxiliary_classroom_2 = false;
        this.annotations = {};
        doc.getPage(1).then(content => content.getAnnotations()).then(annotations => {
            annotations.forEach(annotation => {
                this.annotations[annotation.fieldName] = annotation.id;
            });
        })
        this.doc = doc;
    }
    save() {
        Object.entries(fields).forEach(([name, info]) => {
            const id = this.annotations[`${this.id}_${info.id}_${info.type}`];
            this.doc.annotationStorage.setValue(id, {
                value: this[name]
            });
        });
        return this.doc.saveDocument();
    }
    savePDF() {
        const self = this;
        // Fix for PDF readers lacking the appearance dictionary (NeedAppearances)
        this.save().then(byteArray => PDFLib.PDFDocument.load(byteArray).then(pdf => {
            pdf.save().then(file => require('downloadjs')(file, `${self.date} - ${self.name}.pdf`, 'application/pdf'));
        }));
    }
    saveImage() {
        const self = this;
        self.save().then(data => {
            pdfjsLib.getDocument({
                data,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/'
            }).promise.then(doc => {
                doc.getPage(1).then(page => {
                    const viewport = page.getViewport({
                        scale: 1.5
                    });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    page.render({
                        viewport,
                        canvasContext: canvas.getContext('2d')
                    }).promise.then(() => require('downloadjs')(canvas.toDataURL(), `${self.date} - ${self.name}.png`, 'image/png'));
                });
            });
        });
    }
}
