export class FileLoader {
    constructor(dataProcessor, onFilesLoaded) {
        this.dataProcessor = dataProcessor;
        this.onFilesLoaded = onFilesLoaded;
        this.setupDragAndDrop();
    }

    loadFiles(files) {
        Array.from(files).forEach((file) => {
            if (!['application/json'].includes(file.type))
                return;

            const r = new FileReader();
            r.onload = (e) => {
                const file = e.target.result;
                const json = new TextDecoder().decode(file);
                this.dataProcessor(JSON.parse(json));
            };
            r.readAsArrayBuffer(file);
        });

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
                window.showDirectoryPicker().then(async (dirHandle) => {
                    for await (const entry of dirHandle.values())
                        entry.getFile().then(async (file) => {
                            if (!['application/json'].includes(file.type))
                                return;
                            file.text().then((json) => this.dataProcessor(JSON.parse(json)));
                        });
                    const { set } = await import('idb-keyval');
                    set('dir', dirHandle).then(() => location.reload());
                });
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