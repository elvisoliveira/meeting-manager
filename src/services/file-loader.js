export class FileLoader {
    constructor(dataProcessor, onFilesLoaded) {
        this.dataProcessor = dataProcessor;
        this.onFilesLoaded = onFilesLoaded;
        this.setupDragAndDrop();
    }

    async loadFiles(files) {
        const jsonFiles = Array.from(files).filter((f) => f.type === 'application/json');

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
    }

    setupDragAndDrop() {
        document.addEventListener('dragstart', () => {
            console.log('dragstart');
        });

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

        const dragText = document.querySelector('.header');
        const input = dropArea.querySelector('input');

        dropArea.querySelector('.button').onclick = async () => {
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker();
                const fileTasks = [];
                for await (const entry of dirHandle.values())
                    fileTasks.push((async () => {
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
            dragText.textContent = 'Release to Upload';
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('active');
            dragText.textContent = 'Drag & Drop';
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.loadFiles(e.dataTransfer.files);
        });

        dropArea.querySelector('span#sample')?.addEventListener('click', () => {
            this.dataProcessor(require('../../samples.json'));
            this.onFilesLoaded();
        });
    }
}