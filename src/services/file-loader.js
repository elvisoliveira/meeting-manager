import samplesData from '../../samples.json';
import i18next from '../config/i18n';

export class FileLoader {
    constructor(dataProcessor, onFilesLoaded) {
        this.dataProcessor = dataProcessor;
        this.onFilesLoaded = onFilesLoaded;
        this.setupDragAndDrop();
    }

    async loadFiles(files) {
        const jsonFiles = Array.from(files).filter((f) => f.type === 'application/json');

        try {
            await Promise.all(jsonFiles.map((file) => new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = (e) => {
                    try {
                        const json = new TextDecoder().decode(e.target.result);
                        this.dataProcessor(JSON.parse(json));
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
                r.onerror = () => reject(r.error);
                r.readAsArrayBuffer(file);
            })));
            this.onFilesLoaded();
        } catch (err) {
            console.error('Failed to load file:', err);
            if (typeof bootstrap !== 'undefined')
                bootstrap.showToast({
                    body: `${i18next.t('ERROR_LOAD')}: ${err.message || err}`,
                    toastClass: 'text-bg-danger'
                });
        }
    }

    setupDragAndDrop() {
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.loadFiles(e.dataTransfer.files);
        });
    }

    setupDropArea() {
        const dropArea = document.querySelector('.drag-area');
        if (!dropArea) return;

        const dragText = dropArea.querySelector('.header');
        const defaultText = dragText?.textContent;
        const input = dropArea.querySelector('input');

        dropArea.querySelector('#browse').onclick = async () => {
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker();
                const fileTasks = [];
                for await (const entry of dirHandle.values())
                    fileTasks.push((async () => {
                        if (entry.kind === "directory")
                            return;
                        const file = await entry.getFile();
                        if (file.type !== 'application/json') return;
                        const json = await file.text();
                        this.dataProcessor(JSON.parse(json));
                    })());
                await Promise.all(fileTasks);
                const { set } = await import('idb-keyval');
                await set('dir', dirHandle);
                location.reload();
                return;
            }
            input.click();
        };

        input.addEventListener('change', () => {
            dropArea.classList.add('active');
            this.loadFiles(input.files);
        });

        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('active');
            if (dragText) dragText.textContent = i18next.t('DROP_RELEASE');
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('active');
            if (dragText && defaultText) dragText.textContent = defaultText;
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.loadFiles(e.dataTransfer.files);
        });

        dropArea.querySelector('span#sample')?.addEventListener('click', () => {
            this.dataProcessor(samplesData);
            this.onFilesLoaded();
        });
    }
}