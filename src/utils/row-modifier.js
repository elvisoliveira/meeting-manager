import i18next from "../config/i18n";

export default class RowModifier {
    constructor(row) {
        this.row = row;
        this.form = document.getElementById('filters');
    }

    /**
     * Main method to process the row
     */
    process() {
        const selectedFilters = this.getSelectedFilters();
        const columns = this.getColumnsReversed();

        this.clearDashOnlyColumns(columns);
        const absenceCount = this.calculateAbsences(columns, selectedFilters);

        this.updateAbsenceCount(columns, absenceCount);
        this.attachEventListeners();
    }

    /**
     * Get selected filter values from checkboxes
     */
    getSelectedFilters() {
        if (!this.form) return [];

        return Array.from(this.form.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
    }

    /**
     * Get all td elements from the row in reverse order
     */
    getColumnsReversed() {
        return Array.from(this.row.querySelectorAll('td')).reverse();
    }

    /**
     * Clear columns that contain only a dash character
     */
    clearDashOnlyColumns(columns) {
        columns.forEach(column => {
            if (column.textContent && column.textContent.trim() === '-')
                column.textContent = '';
        });
    }

    /**
     * Calculate the number of absences based on columns and filters
     */
    calculateAbsences(columns, selectedFilters) {
        let count = 0;

        columns.every((column) => {
            if (this.shouldStopCounting(column, selectedFilters))
                return false; // Stop iteration

            this.normalizeEmptyColumn(column);
            count++;
            return true; // Continue iteration
        });

        return count - 1; // Subtract 1 as per original logic
    }

    /**
     * Determine if we should stop counting absences for this column
     */
    shouldStopCounting(column, selectedFilters) {
        // Handle single filter case - ignore substitutions
        if (selectedFilters.length === 1)
            return column.querySelector(`span.${selectedFilters[0]}`);

        // Handle multiple filters - stop if any span found (except substitutions)
        return column.querySelector('span:not(.S)');
    }

    /**
     * Replace empty column content with dash
     */
    normalizeEmptyColumn(column) {
        if (!column.textContent || column.textContent.trim() === '')
            column.textContent = '-';
    }

    /**
     * Update the first column with the absence count
     */
    updateAbsenceCount(columns, count) {
        if (columns.length > 0)
            columns[0].textContent = count;
    }

    /**
     * Attach event listeners to row elements
     */
    attachEventListeners() {
        this.addEventListenerOnce('i.hide', 'click', () => this.hideRow());
        this.addEventListenerOnce('i.copy', 'click', () => this.copyName());
    }

    /**
     * Add event listener only once to prevent duplicates
     */
    addEventListenerOnce(selector, event, handler) {
        const element = this.row.querySelector(selector);
        if (element && !element.hasAttribute('data-listener-added')) {
            element.addEventListener(event, handler);
            element.setAttribute('data-listener-added', 'true');
        }
    }

    /**
     * Hide the current row
     */
    hideRow() {
        this.row.style.display = 'none';
    }

    /**
     * Copy the person's name to clipboard
     */
    async copyName() {
        try {
            const nameElement = this.row.querySelector('th');
            if (!nameElement) return;

            const name = nameElement.textContent.trim();
            await navigator.clipboard.writeText(name);

            if (typeof bootstrap !== 'undefined')
                bootstrap.showToast({
                    body: i18next.t('COPIED'),
                    toastClass: 'text-bg-info'
                });
        } catch (error) {
            console.error('Failed to copy name:', error);
        }
    }

    /**
     * Static method to process a row (maintains backward compatibility)
     */
    static process(row) {
        const modifier = new RowModifier(row);
        modifier.process();
    }
}

// Export the class and maintain backward compatibility
export { RowModifier };