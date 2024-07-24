import { get, set } from 'idb-keyval';
import { subtitles } from './refs/subtitles';
import { fingerprints } from './refs/fingerprints';

import * as Handlebars from 'handlebars';
import * as pdfjsLib from 'pdfjs-dist';

import S89 from './S89';
import Engine from './engine';
import TableSort from './table.sort';

import modRow from './modRow';
import filter from './filter';
import i18next from './i18n';

const engine = new Engine();

Handlebars.registerHelper('includes', (elem, list) => list && list.includes(elem) ? 'absence' : '');
Handlebars.registerHelper('lowercase', (str) => (str && typeof str === 'string' && str.toLowerCase()) || '');
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

    // Each column represents a meeting
    // Add sorting capabilities to each individual column
    document.querySelectorAll('label.sort, i.fa-sort').forEach(label => label.addEventListener('click', () => {
        const table = label.closest('table');
        const tbody = table.querySelector('tbody');
        const columnHeader = label.closest('th');
        const columnIndex = Array.from(label.closest('tr').children).indexOf(columnHeader);
        Array.from(tbody.querySelectorAll('tr')).sort(TableSort(columnIndex, columnHeader.asc = !columnHeader.asc)).forEach(tr => tbody.appendChild(tr));
    }));

    // Each row represents a publisher
    // Add hypen to every unassigned meeting after the last assingment (assignment threshold)
    // Add behavior for hiding rows and copying the publisher name
    document.querySelectorAll('#main tbody tr').forEach((row) => modRow(row));

    // clear data
    document.querySelector('button#clear').addEventListener('click', () => {
        if(confirm(i18next.t('SURE'))) {
            engine.destroy();
            location.reload();
        }
    });

    // Filter
    const filters = (new URL(window.location)).searchParams.get('filters');

    const checkboxes = document.querySelectorAll('#filters input[type=\'checkbox\']');

    checkboxes.forEach(checkboxInput => {
        if(typeof filters === 'string')
            checkboxInput.checked = atob(filters).split(',').includes(checkboxInput.value);

        checkboxInput.addEventListener('change', filter);
    });

    document.getElementById('threshold').addEventListener('input', filter);

    for (const button of document.querySelectorAll('button#none, button#all'))
        button.addEventListener('click', (e) => {
            for (const checkbox of checkboxes)
                checkbox.checked = (e.target.id || e.target.parentElement.id) === 'all';

            filter();
        });

    filter();

    // Defined language change behavior
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

    // Draggable behavior
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

    // Tooltip behavior
    ([].slice.call(document.querySelectorAll('[data-bs-toggle=\'tooltip\']'))).map((tooltipTriggerEl) => {
        const { allowList } = bootstrap.Tooltip.Default;
        allowList.table = [];
        allowList.thead = [];
        allowList.tbody = [];
        allowList.tr = [];
        allowList.td = [];

        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Printing behavior
    document.querySelectorAll('#main thead input[type=\'checkbox\']').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selected = Array.from(document.querySelectorAll('#main thead input[type=\'checkbox\']:checked')).map(element => element.value);
            document.querySelector('i.fa-print').style.display = selected.length > 0 ? 'inline' : 'none';
        });
    });

    // S89 Setup
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

    // FileSystemObserver setup
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
