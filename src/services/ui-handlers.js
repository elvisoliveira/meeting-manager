import TableSort from '../utils/table-sort';
import modRow from '../utils/mod-row';
import filter from '../utils/filter';
import i18next from '../config/i18n';

export class UIHandlers {
    constructor(engine) {
        this.engine = engine;
    }

    setupPrintHandler() {
        document.querySelector('i.fa-print')?.addEventListener('click', () => {
            const ids = Array.from(document.querySelectorAll('table input:checked')).map(input => input.value);
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
        document.querySelectorAll('#main tbody tr').forEach((row) => modRow(row));
    }

    setupClearDataHandler() {
        document.querySelector('button#clear')?.addEventListener('click', () => {
            if (confirm(i18next.t('SURE'))) {
                this.engine.destroy();
                location.reload();
            }
        });
    }

    setupFilterHandlers() {
        const filters = (new URL(window.location)).searchParams.get('filters');
        const checkboxes = document.querySelectorAll('#filters input[type=\'checkbox\']');

        checkboxes.forEach(checkboxInput => {
            if (typeof filters === 'string')
                checkboxInput.checked = atob(filters).split(',').includes(checkboxInput.value);

            checkboxInput.addEventListener('change', filter);
        });

        document.getElementById('threshold')?.addEventListener('input', filter);

        document.querySelectorAll('button#none, button#all').forEach(button =>
            button.addEventListener('click', (e) => {
                checkboxes.forEach(checkbox => {
                    checkbox.checked = (e.target.id || e.target.parentElement.id) === 'all';
                });
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

        const draggable = document.getElementById('draggable');
        if (!draggable) return;

        draggable.addEventListener('mousedown', function(e) {
            let offsetX = e.clientX - parseInt(window.getComputedStyle(this).left);
            let offsetY = e.clientY - parseInt(window.getComputedStyle(this).top);
            
            function mouseMoveHandler(e) {
                Object.assign(document.getElementById('draggable').style, {
                    top: (e.clientY - offsetY) + 'px',
                    left: (e.clientX - offsetX) + 'px',
                    right: 'unset',
                    bottom: 'unset'
                });
                ignore = true;
            }
            
            const reset = () => {
                window.removeEventListener('mousemove', mouseMoveHandler);
                window.removeEventListener('mouseup', reset);
            };
            
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', reset);
        });
    }

    setupTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle=\'tooltip\']');
        tooltipTriggerList.forEach((tooltipTriggerEl) => {
            const { allowList } = bootstrap.Tooltip.Default;
            allowList.table = [];
            allowList.thead = [];
            allowList.tbody = [];
            allowList.tr = [];
            allowList.td = [];

            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    setupPrintingBehavior() {
        document.querySelectorAll('#main thead input[type=\'checkbox\']').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selected = Array.from(document.querySelectorAll('#main thead input[type=\'checkbox\']:checked'))
                    .map(element => element.value);
                const printIcon = document.querySelector('i.fa-print');
                if (printIcon) {
                    printIcon.style.display = selected.length > 0 ? 'inline' : 'none';
                }
            });
        });
    }
}