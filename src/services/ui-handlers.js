import TableSort from '../utils/table-sort';
import RowModifier from '../utils/row-modifier';
import filter from '../utils/filter';
import i18next from '../config/i18n';

export class UIHandlers {
    constructor(engine) {
        this.engine = engine;
    }

    setupPrintHandler() {
        document.querySelector('i.fa-print')?.addEventListener('click', () => {
            const ids = Array.from(document.querySelectorAll('table#main input:checked')).map(input => input.value);
            const params = new URLSearchParams(ids.map(d => ['date', d]));
            window.open(`board.html?${params.toString()}`, '_blank');
        });
    }

    setupTableSorting() {
        document.querySelectorAll('label.sort, i.fa-sort').forEach(label =>
            label.addEventListener('click', () => {
                const table = label.closest('table');
                const tbody = table.querySelector('tbody');
                const columnHeader = label.closest('th');
                const columnIndex = Array.from(label.closest('tr').children).indexOf(columnHeader);
                Array.from(tbody.querySelectorAll('tr'))
                    .sort(TableSort(columnIndex, columnHeader.asc = !columnHeader.asc))
                    .forEach(tr => tbody.appendChild(tr));
            })
        );
    }

    setupRowModification() {
        document.querySelectorAll('#main tbody tr').forEach((row) => RowModifier.process(row));
    }

    setupClearDataHandler() {
        document.querySelector('button#clear')?.addEventListener('click', () => {
            if (confirm(i18next.t('RESET_DATA_CONFIRM'))) {
                this.engine.destroy();
                location.reload();
            }
        });
    }

    setupFilterHandlers() {
        const self = this;
        const params = (new URL(window.location)).searchParams;
        const filters = params.get('filters');
        const threshold = params.get('threshold');
        const columns = params.get('columns');
        const checkboxes = document.querySelectorAll('#filters input[type=\'checkbox\']');

        checkboxes.forEach(checkboxInput => {
            if (typeof filters === 'string') {
                checkboxInput.checked = atob(filters).split(',').includes(checkboxInput.value);
                self.setupRowModification();
            }

            checkboxInput.addEventListener('change', () => {
                self.setupRowModification();
                filter();
            });
        });

        const thresholdInput = document.getElementById('threshold');
        if (thresholdInput) {
            if (threshold !== null && !Number.isNaN(+threshold))
                thresholdInput.value = threshold;
            thresholdInput.addEventListener('input', filter);
        }

        if (columns) 
            try {
                const dates = atob(columns).split(',');
                document.querySelectorAll('#main thead input[type=\'checkbox\']').forEach((c) => {
                    c.checked = dates.includes(c.value);
                });
            } catch (e) {
                console.warn('Invalid columns param:', e);
            }
        

        document.querySelectorAll('button#none, button#all').forEach(button =>
            button.addEventListener('click', (e) => {
                checkboxes.forEach(checkbox => {
                    checkbox.checked = (e.target.id || e.target.parentElement.id) === 'all';
                });
                self.setupRowModification();
                filter();
            })
        );

        filter();
    }

    setupLanguageHandler(onLanguageChange) {
        const language = document.getElementById('language');
        if (!language) return;

        language.addEventListener('change', (e) => {
            const modal = document.getElementById('filters');
            modal.addEventListener('hidden.bs.modal', onLanguageChange);
            i18next.changeLanguage(e.target.value)
                .then(() => bootstrap.Modal.getInstance(modal).hide());
        });

        language.value = i18next.language;
    }

    setupDraggableBehavior() {
        let ignore = false;

        window.addEventListener('click', (event) => {
            if (ignore) event.stopPropagation();
            ignore = false;
        }, true);

        const handle = document.getElementById('draggable');
        const container = document.getElementById('floating-actions');
        if (!handle || !container) return;

        handle.addEventListener('mousedown', (e) => {
            const rect = container.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const move = (ev) => {
                Object.assign(container.style, {
                    top: (ev.clientY - offsetY) + 'px',
                    left: (ev.clientX - offsetX) + 'px',
                    right: 'unset',
                    bottom: 'unset'
                });
                ignore = true;
            };

            const reset = () => {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', reset);
            };

            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', reset);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const isTyping = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            );

            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) bootstrap.Modal.getInstance(openModal)?.hide();
                return;
            }

            if (isTyping) return;

            const filtersModal = document.getElementById('filters');
            if (e.key === '?' || (e.key === ',' && (e.ctrlKey || e.metaKey))) {
                if (filtersModal) {
                    e.preventDefault();
                    bootstrap.Modal.getOrCreateInstance(filtersModal).show();
                }
            } else if (e.key === 'p' && !e.ctrlKey && !e.metaKey)
                document.querySelector('i.fa-print')?.click();
            else if (e.key === '/')
                if (filtersModal) {
                    e.preventDefault();
                    bootstrap.Modal.getOrCreateInstance(filtersModal).show();
                    filtersModal.addEventListener('shown.bs.modal', () => {
                        document.getElementById('threshold')?.focus();
                    }, { once: true });
                }
            
        });
    }

    setupPrintingBehavior() {
        const table = document.getElementById('main');
        if (!table) return;
        const headerCheckboxes = table.querySelectorAll('thead input[type=\'checkbox\']');

        const updatePrintIcon = () => {
            const selected = Array.from(headerCheckboxes).filter(c => c.checked);
            const printIcon = document.querySelector('i.fa-print');
            if (printIcon)
                printIcon.style.display = selected.length > 0 ? 'inline' : 'none';
        };

        const updateColumnHighlight = () => {
            headerCheckboxes.forEach((checkbox) => {
                const headerCell = checkbox.closest('th');
                if (!headerCell) return;
                const colIndex = Array.from(headerCell.parentNode.children).indexOf(headerCell);
                const on = checkbox.checked;
                headerCell.classList.toggle('col-on', on);
                table.querySelectorAll('tbody tr').forEach((row) => {
                    const cell = row.children[colIndex];
                    if (cell) cell.classList.toggle('col-on', on);
                });
            });
        };

        headerCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updatePrintIcon();
                updateColumnHighlight();
            });
        });

        updatePrintIcon();
        updateColumnHighlight();
    }
}