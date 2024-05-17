const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

const comparer = (idx, asc) => (a, b) => {
    const valueA = getCellValue(asc ? a : b, idx);
    const valueB = getCellValue(asc ? b : a, idx);

    // Handle empty values or non-numeric values
    if (valueA === '' || valueB === '' || isNaN(valueA) || isNaN(valueB))
        return valueA.toString().localeCompare(valueB);

    // Numeric comparison
    return valueA - valueB;
};

export default function TableSort(idx, asc) {
    return comparer(idx, asc);
}
