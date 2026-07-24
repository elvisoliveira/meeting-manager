import Engine from './core/engine';
import { registerHandlebarsHelpers } from './config/handlebars-helpers';
import { S89Service } from './services/s89-service';
import { FileLoader } from './services/file-loader';
import { DataGrid } from './services/data-grid';
import { UIHandlers } from './services/ui-handlers';
import { FileSystemWatcher } from './services/file-system-observer';
import { DataProcessor } from './services/data-processor';
import Tooltip from './services/tooltip';
import i18next from './config/i18n';

class MeetingManagerApp {
    constructor() {
        this.engine = new Engine();
        this.dataProcessor = new DataProcessor(this.engine);
        this.dataGrid = new DataGrid(this.engine);
        this.uiHandlers = new UIHandlers(this.engine);
        this.s89Service = new S89Service(this.engine);
        this.fileSystemObserver = new FileSystemWatcher(
            (data) => this.dataProcessor.processData(data),
            () => this.assembleDataGrid()
        );
        this.fileLoader = new FileLoader(
            (data) => this.dataProcessor.processData(data),
            () => this.assembleDataGrid()
        );
        this.init();
    }

    init() {
        registerHandlebarsHelpers(this.engine);
        document.addEventListener('DOMContentLoaded', () => {
            new Tooltip();
            this.assembleDataGrid();
        });
    }

    async assembleDataGrid() {
        try {
            const data = this.dataGrid.assembleData();
            await this.dataGrid.renderTable(data);

            if (data.length === 0) {
                this.fileLoader.setupDropArea();
                return;
            }

            await this.dataGrid.renderFilter();
            this.setupEventHandlers(data);
        } catch (err) {
            console.error('Failed to assemble data grid:', err);
            const boot = document.getElementById('boot');
            if (boot)
                boot.innerHTML = `
                    <div class="error-state">
                        <p>${i18next.t('ERROR_LOAD')}</p>
                        <pre class="text-danger small">${(err && err.message) || String(err)}</pre>
                    </div>
                `;
            if (typeof bootstrap !== 'undefined' && bootstrap.showToast)
                bootstrap.showToast({
                    body: i18next.t('ERROR_LOAD'),
                    toastClass: 'text-bg-danger'
                });
        }
    }

    setupEventHandlers(data) {
        // Setup all UI handlers
        this.uiHandlers.setupPrintHandler();
        this.uiHandlers.setupTableSorting();
        this.uiHandlers.setupRowModification();
        this.uiHandlers.setupClearDataHandler();
        this.uiHandlers.setupFilterHandlers();
        this.uiHandlers.setupLanguageHandler(() => this.assembleDataGrid(data));
        this.uiHandlers.setupDraggableBehavior();
        this.uiHandlers.setupPrintingBehavior();
        this.uiHandlers.setupKeyboardShortcuts();

        // Setup S89 service
        this.s89Service.setupS89FileHandler();

        // Setup file system observer
        this.fileSystemObserver.setupPermissionsHandler();
        this.fileSystemObserver.setupFileSystemObserver();
    }
}

// Initialize the application
new MeetingManagerApp();