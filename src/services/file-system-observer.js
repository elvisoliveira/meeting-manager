import { get, set } from 'idb-keyval';

export class FileSystemWatcher {
    constructor(dataProcessor, onDataChange) {
        this.dataProcessor = dataProcessor;
        this.onDataChange = onDataChange;
    }

    async setupPermissionsHandler() {
        const permissionsButton = document.getElementById('permissions');
        if (!permissionsButton) return;

        permissionsButton.addEventListener('click', () => {
            get('dir').then(async (handle) => {
                if ((await handle.requestPermission({ mode: 'read' })) === 'granted') location.reload();
            });
        });
    }

    async setupFileSystemObserver() {
        const dirHandle = await get('dir');
        if (!dirHandle) return;

        const hasPermission = await this.hasPermission(dirHandle);
        if (!hasPermission) {
            const permissionsButton = document.getElementById('permissions');
            if (permissionsButton)
                permissionsButton.setAttribute('style', 'display: block;');
            return;
        }

        if (typeof FileSystemObserver !== 'undefined') {
            const observer = new FileSystemObserver(async (records) => {
                observer.disconnect();

                for (const record of records) {
                    if (record.type !== 'modified') continue;

                    await record.changedHandle.getFile().then(async (file) => {
                        if (!['application/json'].includes(file.type)) return;

                        await file.text().then((json) => {
                            this.dataProcessor(JSON.parse(json));
                        }).then(() => {
                            set('dir', dirHandle);
                        });
                    });
                }

                this.onDataChange();
            });

            observer.observe(dirHandle, { recursive: false });
            console.log(observer);
        }
    }

    async hasPermission(handle) {
        return (await handle.queryPermission()) === 'granted';
    }
}