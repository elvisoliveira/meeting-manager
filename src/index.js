import { get, set } from 'idb-keyval';
import { subtitles } from './refs/subtitles';
import { fingerprints } from './refs/fingerprints';
import { translation } from './translation';

import * as Handlebars from 'handlebars';
import * as pdfjsLib from 'pdfjs-dist';

import TableSort from './table.sort';
import Engine from './engine.js';
import S89 from './S89.js';

import i18next from 'i18next';
import detector from "i18next-browser-languagedetector";
import registerI18nHelper from 'handlebars-i18next';

registerI18nHelper(Handlebars, i18next);

i18next.use(detector).init(translation);

const engine = new Engine();

Handlebars.registerHelper('lowercase', (str) => (str && typeof str === 'string' && str.toLowerCase()) || '');
Handlebars.registerHelper('includes', (elem, list) => list && list.includes(elem) ? 'absence' : '');
Handlebars.registerHelper('publisher', (id) => engine.getPublisher(id).name);

document.getS89 = (id) => {
    if(!document.S89) {
        bootstrap.showToast({
            body: i18next.t('S_89_UNLOADED'),
            toastClass: 'text-bg-danger'
        });
        return;
    }

    const assingment = engine.getAssignment(id);

    if(!subtitles[assingment.assignment].S89) {
        bootstrap.showToast({
            body: i18next.t('S_89_UNNEEDED'),
            toastClass: 'text-bg-danger'
        });
        return;
    }

    document.S89.name = assingment.assigned.name;
    document.S89.assistant = assingment.partner?.name;
    document.S89.date = assingment.meeting.label;
    document.S89.part_number = assingment.number && String(assingment.number);
    document.S89.main_hall = true;

    switch(document.querySelector('select#output').value) {
        case 'pdf':
            document.S89.savePDF();
            break;
        case 'png':
            document.S89.saveImage();
            break;
    }
}

const filter = () => {
    const main = document.getElementById('main'); // main table
    const form = document.getElementById('filters');

    const selectedOnes = Array.from(form.querySelectorAll('input[type=\'checkbox\']:checked')).map(e => e.value);

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
    main.querySelector('tfoot tr').style.display = document.querySelectorAll('tr[style*=\'display: table-row\']').length ? 'none' : 'table-row';
}

const loadFiles = (files) => {
    Array.from(files).forEach((file) => {
        if(!['application/json'].includes(file.type))
            return;

        const r = new FileReader();
        r.onload = (e) => {
            const file = e.target.result;
            const json = new TextDecoder().decode(file);
            dataProccess(JSON.parse(json));
        };
        r.readAsArrayBuffer(file);
    });

    location.reload();
}

document.addEventListener('dragstart', () => {
    console.log('dragstart');
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    loadFiles(e.dataTransfer.files);
});

document.addEventListener('DOMContentLoaded', async () => {
    const data = [];

    engine.lib.queryAll('publishers', {
        sort: [['name', 'ASC']]
    }).forEach((publisher) => {
        publisher.meetings = engine.lib.queryAll('meetings', {
            sort: [['date', 'ASC']]
        });
        const partners = [];
        publisher.meetings.forEach((meeting, i) => {
            const assignments = engine.lib.queryAll('assignments', {
                query: {
                    meeting: meeting.ID,
                    assigned: publisher.ID
                }
            });
            if(assignments.length) {
                assignments.forEach((assingment, ii) => {
                    if(assingment._assigned)
                        assignments[ii].assignment = 'S';
                    else if(assingment.partner)
                        partners.push({
                            publisher: engine.getPublisher(assingment.partner).name,
                            meeting: engine.getMeeting(assingment.meeting)
                        });
                });
                partners.sort((a, b) => a.date - b.date);
            }
            engine.lib.queryAll('assignments', {
                query: {
                    meeting: meeting.ID,
                    _assigned: publisher.ID
                }
            }).forEach((substitution) => {
                delete substitution._assigned;
                assignments.push(substitution);
            });
            publisher.meetings[i].assignments = assignments;
        });
        publisher.partners = partners.reverse().flatMap(i => `<tr><td>${i.publisher}</td><td>${i.meeting.data.week.replace('-', '/')}</td></tr>`).join('');
        data.push(publisher);
    });

    DOMContentLoaded(data);
});

const DOMContentLoaded = async (data) => {

    await fetch('table.hbs.html').then((response) => response.text().then((html) => {
        boot.innerHTML = Handlebars.compile(html)({
            data,
            subtitles,
            meetings: engine.lib.queryAll('meetings', {
                sort: [['date', 'ASC']]
            })
        });
    }));

    if(data.length === 0) {

        const dropArea = document.querySelector('.drag-area');
        const dragText = document.querySelector('.header');
        const input = dropArea.querySelector('input');

        dropArea.querySelector('.button').onclick = async () => {
            if ('showDirectoryPicker' in window) {
                window.showDirectoryPicker().then(async (dirHandle) => {
                    for await (const entry of dirHandle.values())
                        entry.getFile().then(async (file) => {
                            if (!['application/json'].includes(file.type))
                                return;
                            file.text().then((json) => dataProccess(JSON.parse(json)));
                        })
                    set('dir', dirHandle).then(() => location.reload());
                });
                return;
            }
            input.click();
        };

        input.addEventListener('change', function () {
            dropArea.classList.add('active');

            loadFiles(this.files);
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

            loadFiles(e.dataTransfer.files);
        });

        dropArea.querySelector('span#sample').addEventListener('click', () => {
            dataProccess(require('../samples.json'));
            window.document.dispatchEvent(new Event('DOMContentLoaded', {
                bubbles: true,
                cancelable: true
            }));
        });

        return;
    }

    boot.scrollTo(document.body.getElementsByTagName('table').item(0).scrollWidth , 0);

    await fetch('filter.hbs.html').then((response) => response.text().then((html) => {
        boot.insertAdjacentHTML('beforeend', Handlebars.compile(html)({
            subtitles
        }));
    }));

    document.querySelector('i.fa-print').addEventListener('click', (() => {
        const ids = Array.from(document.querySelectorAll('table input:checked')).map(input => input.value);
        const params = new URLSearchParams(ids.map(d => ['date', d]));
        window.open(`board.html?${params.toString()}`, '_blank');
    }));

    // table
    document.querySelectorAll('label.sort, i.fa-sort').forEach(label => label.addEventListener('click', () => {
        const table = label.closest('table');
        const tbody = table.querySelector('tbody');
        const columnHeader = label.closest('th');
        const columnIndex = Array.from(label.closest('tr').children).indexOf(columnHeader);
        Array.from(tbody.querySelectorAll('tr')).sort(TableSort(columnIndex, columnHeader.asc = !columnHeader.asc)).forEach(tr => tbody.appendChild(tr));
    }));

    document.querySelectorAll('#main tbody tr').forEach((row) => {
        let columns = Array.from(row.querySelectorAll('td')).reverse();
        let count = 0;
        columns.every((column) => {
            if(column.querySelector('span'))
                return false;
            column.innerText = '-';
            count++;
            return true;
        });
        columns[0].innerText = count - 1;
        row.querySelector('i.hide').addEventListener('click', () => row.style.display = 'none');
        row.querySelector('i.copy').addEventListener('click', () => {
            navigator.clipboard.writeText(row.querySelector('th').innerText.trim()).then(() => bootstrap.showToast({
                body: i18next.t('COPIED'),
                toastClass: 'text-bg-info'
            }));
        });
    });

    // clear data
    document.querySelector('button#clear').addEventListener('click', () => {
        if(confirm(i18next.t('SURE'))) {
            engine.destroy();
            location.reload();
        }
    });

    // filter
    const filters = (new URL(window.location)).searchParams.get('filters');

    const checkboxes = document.querySelectorAll('#filters input[type=\'checkbox\']');

    checkboxes.forEach(checkboxInput => {
        if(typeof filters === 'string')
            checkboxInput.checked = atob(filters).split(',').includes(checkboxInput.value);
        checkboxInput.addEventListener('change', filter);
    });

    document.getElementById('threshold').addEventListener('input', filter);

    const language = document.getElementById('language');
    language.addEventListener('change', (e) => {
        const modal = document.getElementById('filters');
        modal.addEventListener('hidden.bs.modal', () => {
            DOMContentLoaded(data);
        });
        i18next.changeLanguage(e.target.value)
            .then(() => bootstrap.Modal.getInstance(modal).hide());
    });
    language.value = i18next.language;

    for (const button of document.querySelectorAll('button#none, button#all'))
        button.addEventListener('click', (e) => {
            for (const checkbox of checkboxes)
                checkbox.checked = (e.target.id || e.target.parentElement.id) === 'all';
            filter();
        });

    filter();

    // draggable
    let ignore = false;

    window.addEventListener ('click', (event) => {
        if (ignore) event.stopPropagation();
        ignore = false;
    }, true);

    document.getElementById('draggable').addEventListener('mousedown', function(e) {
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
        }
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', reset);
    });

    // tooltip
    ([].slice.call(document.querySelectorAll('[data-bs-toggle=\'tooltip\']'))).map((tooltipTriggerEl) => {
        const { allowList } = bootstrap.Tooltip.Default;
        allowList.table = [];
        allowList.thead = [];
        allowList.tbody = [];
        allowList.tr = [];
        allowList.td = [];

        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // hover
    document.querySelectorAll('span[helper]').forEach((data) => {
        data.addEventListener('mouseover', () => {
            const helper = data.getAttribute('helper');
            document.querySelectorAll('tbody th').forEach((row) => {
                if(row.innerText == helper) {
                    const index = Array.from(data.closest('tr').childNodes).indexOf(data.parentNode);
                    const cols = Array.from(row.parentNode.childNodes);
                    cols[index].id = 'red';
                }
            });
            this.addEventListener('mouseout', () => {
                document.getElementById('red')?.removeAttribute('id');
            });
        });
    });

    // printing
    document.querySelectorAll('#main thead input[type=\'checkbox\']').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selected = Array.from(document.querySelectorAll('#main thead input[type=\'checkbox\']:checked')).map(element => element.value);
            document.querySelector('i.fa-print').style.display = selected.length > 0 ? 'inline' : 'none';
        });
    });

    document.querySelector('input#S89[type=file]').addEventListener('change', function () {
        const self = this;
        const reader = new FileReader();
        reader.onload = function () {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            pdfjsLib.getDocument({
                data: new Uint8Array(this.result)
            }).promise.then(doc => {
                if(!fingerprints.some(r => r.every((value, index) => doc.fingerprints[index] == value))) {
                    bootstrap.showToast({
                        body: i18next.t('S_89_CHECK'),
                        toastClass: 'text-bg-danger'
                    });
                    self.value = '';
                    return;
                }
                document.S89 = new S89(doc);
            });
        }
        reader.readAsArrayBuffer(this.files[0]);
    }, false);

    document.getElementById('permissions').addEventListener('click', () => {
        get('dir').then(async (handle) => {
            if ((await handle.requestPermission({ mode: 'read' })) === 'granted') // Prompt user for permission
                location.reload();
        });
    });

    get('dir').then((dirHandle) => {
        if(!dirHandle)
            return;

        // https://github.com/whatwg/fs/blob/main/proposals/FileSystemObserver.md
        hasPermission(dirHandle).then((hasPermission) => {
            if(!hasPermission) {
                document.getElementById('permissions').setAttribute('style', 'display: block;'); return;
            }
            const observer = new FileSystemObserver((records) => {
                for (const record of records) {
                    if (record.type !== 'modified')
                        return;

                    record.changedHandle.getFile().then(async (file) => {
                        if (!['application/json'].includes(file.type))
                            return;

                        file.text()
                            .then((json) => dataProccess(JSON.parse(json)))
                            .then(() => set('dir', dirHandle).then(() => location.reload()));
                    });
                }
            });
            observer.observe(dirHandle, {
                recursive: false
            });
            console.log(observer);
        });
    });
};

const dataProccess = (data) => {
    if(data.meetings)
        engine.parseBoard(data.meetings);

    if(data.absences)
        engine.parseExceptions(data.absences);

    ['congregation', 'time'].forEach((entry) => {
        if(data[entry])
            engine.setInfo(entry, data[entry])
    });
}

const hasPermission = async (handle) => {
    if ((await handle.queryPermission()) === 'granted')  return true; // Permission already granted
    return false; // Permission denied
}
