export default function filter () {
    const main = document.getElementById('main'); // main table
    const form = document.getElementById('filters');

    const selectedOnes = Array.from(form.querySelectorAll('input[type=\'checkbox\']:checked')).map(e => e.value);

    main.querySelectorAll('.single').forEach(span => span.classList.remove('single'));
    if (selectedOnes.length === 1)
        main.querySelectorAll(`span.${selectedOnes[0]}`).forEach(span => span.closest('td').classList.add('single'));


    const url = new URL(window.location);
    url.searchParams.set('filters', btoa(selectedOnes));

    // Set filters as a param on the URL
    window.history.pushState({}, '', url.toString());

    // Hide rows according to the threshold range
    const threshold = +form.querySelector('#threshold').value;

    main.querySelectorAll('tbody tr').forEach((row) => {
        // Get all td elements and reverse the array
        const columns = Array.from(row.querySelectorAll('td')).reverse();

        // Get the value of unassigned weeks from the first column
        const unassignedWeeks = +columns[0]?.innerText || 0;

        // Check if any of the badges match the selected ones
        const badges = row.querySelectorAll('span');
        const hasSelectedBadge = Array.from(badges).some((badge) => selectedOnes.includes(badge.innerText.trim()));

        // Determine whether to show or hide the row based on the conditions
        const shouldShow = unassignedWeeks <= threshold && hasSelectedBadge;

        row.style.display = shouldShow ? 'table-row' : 'none';
    });

    // Shows empty tablem message
    main.querySelector('tfoot tr').style.display = document.querySelectorAll('tbody tr[style*=\'display: table-row\']').length ? 'none' : 'table-row';

    // Once filtered, scroll to the current week
    boot.scrollTo(document.body.getElementsByTagName('table').item(0).scrollWidth , 0);
}

