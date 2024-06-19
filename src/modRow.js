import i18next from "./i18n";

export default function modRow (row) {
    // Select all <td> elements from the row and reverse their order
    const columns = Array.from(row.querySelectorAll('td')).reverse();

    let count = 0;

    // Iterate over each column until a <span> is found
    columns.every((column) => {
        if (column.querySelector('span'))
            return false; // Stop iteration if a <span> is found

        column.innerText = '-'; // Replace column text with '-'
        count++;
        return true; // Continue iteration
    });

    // Update the text of the first column with the count minus one
    if (columns.length > 0)
        columns[0].innerText = count - 1;

    row.querySelector('i.hide').addEventListener('click', () => row.style.display = 'none');
    row.querySelector('i.copy').addEventListener('click', () => {
        const name = row.querySelector('th').innerText.trim();
        navigator.clipboard.writeText(name).then(() => bootstrap.showToast({
            body: i18next.t('COPIED'),
            toastClass: 'text-bg-info'
        }));
    });
}
