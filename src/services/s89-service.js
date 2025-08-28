import * as pdfjsLib from 'pdfjs-dist';
import { subtitles } from '../refs/subtitles';
import { fingerprints } from '../refs/fingerprints';
import S89 from '../core/S89';
import i18next from '../config/i18n';

export class S89Service {
    constructor(engine) {
        this.engine = engine;
        this.setupGlobalS89Handler();
    }

    setupGlobalS89Handler() {
        document.getS89 = (id) => {
            if (!document.S89) {
                bootstrap.showToast({
                    body: i18next.t('S_89_UNLOADED'),
                    toastClass: 'text-bg-danger'
                });
                return;
            }

            const assignment = this.engine.getAssignment(id);

            if (!subtitles[assignment.assignment].S89) {
                bootstrap.showToast({
                    body: i18next.t('S_89_UNNEEDED'),
                    toastClass: 'text-bg-danger'
                });
                return;
            }

            document.S89.name = assignment.assigned.name;
            document.S89.assistant = assignment.partner?.name;
            document.S89.date = assignment.meeting.label;
            document.S89.part_number = assignment.number && String(assignment.number);
            document.S89.main_hall = true;

            switch (document.querySelector('select#output').value) {
                case 'pdf':
                    document.S89.savePDF();
                    break;
                case 'png':
                    document.S89.saveImage();
                    break;
            }
        };
    }

    setupS89FileHandler() {
        document.querySelector('input#S89[type=file]').addEventListener('change', function () {
            const self = this;
            const reader = new FileReader();
            reader.onload = function () {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
                pdfjsLib.getDocument({
                    data: new Uint8Array(this.result)
                }).promise.then(doc => {
                    if (!fingerprints.some(r => r.every((value, index) => doc.fingerprints[index] == value))) {
                        bootstrap.showToast({
                            body: i18next.t('S_89_CHECK'),
                            toastClass: 'text-bg-danger'
                        });
                        self.value = '';
                        return;
                    }
                    document.S89 = new S89(doc);
                });
            };
            reader.readAsArrayBuffer(this.files[0]);
        }, false);
    }
}