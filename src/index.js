import { get, set } from 'idb-keyval';
import { subtitles } from './refs.subtitles';
import { fingerprints } from './refs.fingerprints';
import * as Handlebars from 'handlebars';
import * as pdfjsLib from 'pdfjs-dist';
import TableSort from './table.sort';
import Engine from './engine.js';
import S89 from './S89.js';

const engine = new Engine();

Handlebars.registerHelper('lowercase', (str) => (str && typeof str === 'string' && str.toLowerCase()) || '');
Handlebars.registerHelper('publisher', (id) => engine.getPublisher(id).name);

document.getS89 = function(id) {
    if(!document.S89) {
        bootstrap.showToast({
            body: 'S89 form not loaded',
            toastClass: "text-bg-danger"
        });
        return;
    }

    const assingment = engine.getAssignment(id);

    if(!subtitles[assingment.assignment].S89) {
        bootstrap.showToast({
            body: 'S89 form not nedded',
            toastClass: "text-bg-danger"
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

const filter = function() {
    const selected = Array.from(document.querySelectorAll('input[type=\'checkbox\']:checked')).map(element => element.value);
    const url = new URL(window.location);
    url.searchParams.set('filters', selected);
    window.history.pushState(null, '', url.toString());
    document.querySelectorAll('#main tbody tr').forEach((row) => {
        const columns = Array.from(row.querySelectorAll('td')).reverse();
        const unnasignedWeeks = columns[0].innerText;
        const threshold = document.getElementById('threshold').value;
        const show = Array.from(row.querySelectorAll('span')).some((badge) => {
            return selected.includes(badge.innerText.trim());
        });
        row.style.display = +unnasignedWeeks <= +threshold && show ? 'table-row' : 'none';
    });
    document.querySelector('#main tfoot tr').style.display = document.querySelectorAll('tr[style*=\'display: table-row\']').length ? 'none' : 'table-row';
}

const loadFiles = (files) => {
    Array.from(files).forEach((file) => {
        if(!['application/json'].includes(file.type))
            return;

        const r = new FileReader();
        r.onload = function(e) {
            const file = e.target.result;
            const json = new TextDecoder().decode(file);
            engine.parseBoard(JSON.parse(json).meetings);
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
                assignments.forEach((assingment) => {
                    if(assingment.partner) {
                        partners.push({
                            publisher: engine.getPublisher(assingment.partner).name,
                            meeting: engine.getMeeting(assingment.meeting)
                        });
                    }
                });
                partners.sort(function (a, b) {
                    return a.date - b.date;
                });
            }
            publisher.meetings[i].assignments = assignments;
        });
        publisher.partners = partners.reverse().flatMap(i => `<tr><td>${i.publisher}</td><td>${i.meeting.data.week.replace('-', '/')}</td></tr>`).join('');
        data.push(publisher);
    });

    await fetch('template.hbs').then((response) => response.text().then((html) => {
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
                    for await (const entry of dirHandle.values()) {
                        entry.getFile().then(async (file) => {
                            if (!['application/json'].includes(file.type))
                                return;
                            file.text().then((json) => engine.parseBoard(JSON.parse(json).meetings));
                        })
                    }
                    set('dir', dirHandle).then(() => location.reload());
                });
                return;
            }
            input.click();
        };

        input.addEventListener('change', function() {
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

        dropArea.querySelector('span#sample').addEventListener('click', function() {
            for (const [key, value] of Object.entries(require('../samples/*.json'))) {
                engine.parseBoard(value.meetings);
            }
            window.document.dispatchEvent(new Event('DOMContentLoaded', {
                bubbles: true,
                cancelable: true
            }));
        });

        return;
    }

    boot.scrollTo(document.body.getElementsByTagName('table').item(0).scrollWidth , 0);

    await fetch('filter.hbs').then((response) => response.text().then((html) => {
        document.querySelector('div.modal-body').insertAdjacentHTML('afterbegin', Handlebars.compile(html)({
            subtitles
        }));
    }));

    document.querySelector('i.fa-print').addEventListener('click', (() => {
        const ids = [];
        Array.from(document.querySelectorAll('table input:checked')).forEach((input) => {
            ids.push(input.value);
        });
        const params = new URLSearchParams(ids.map(d => ['date', d]));
        window.open(`board.html?${params.toString()}`, '_blank');
    }));

    // table
    document.querySelectorAll('label.sort, i.fa-sort').forEach(label => label.addEventListener('click', (() => {
        const table = label.closest('table');
        const tbody = table.querySelector('tbody');
        const columnHeader = label.parentNode;
        const columnIndex = Array.from(label.closest('tr').children).indexOf(columnHeader);
        Array.from(tbody.querySelectorAll('tr')).sort(TableSort(columnIndex, columnHeader.asc = !columnHeader.asc)).forEach(tr => tbody.appendChild(tr));
    })));

    document.querySelectorAll('#main tbody tr').forEach((row) => {
        let columns = Array.from(row.querySelectorAll('td')).reverse();
        let count = 0;
        columns.every((column) => {
            if(column.querySelector('span')) {
                return false;
            }
            column.innerText = '-';
            count++;
            return true;
        });
        columns[0].innerText = count - 1;
        row.querySelector('i.fa-minus-square').addEventListener('click', function() {
            row.style.display = 'none';
        });
        row.querySelector('i.fa-copy').addEventListener('click', function() {
            navigator.clipboard.writeText(this.parentElement.textContent.trim());
        });
    });

    // clear data
    document.querySelector('button#clear').addEventListener('click', function() {
        if(confirm('Are you sure?')) {
            localStorage.clear();
            location.reload();
        }
    });

    // filter
    const filters = (new URL(window.location)).searchParams.get('filters');
    const checkboxes = document.querySelectorAll('#filters input[type=\'checkbox\']');
    checkboxes.forEach(checkboxInput => {
        if(typeof filters === 'string') {
            checkboxInput.checked = filters.split(',').includes(checkboxInput.value);
        }
        checkboxInput.addEventListener('change', filter);
    });

    document.querySelector('input[type=\'number\']').addEventListener('input', filter);

    for (const button of document.querySelectorAll('button#none, button#all')) {
        button.addEventListener('click', function() {
            for (const checkbox of checkboxes) {
                checkbox.checked = this.id === 'all';
            }
            filter();
        });
    }

    filter();

    // draggable
    let ignore = false;

    window.addEventListener ('click', function (event) {
        if (ignore) event.stopPropagation();
        ignore = false;
    }, true);

    document.getElementById('draggable').addEventListener('mousedown', function(e) {
        var offsetX = e.clientX - parseInt(window.getComputedStyle(this).left);
        var offsetY = e.clientY - parseInt(window.getComputedStyle(this).top);
        function mouseMoveHandler(e) {
            Object.assign(document.getElementById('draggable').style, {
                top: (e.clientY - offsetY) + 'px',
                left: (e.clientX - offsetX) + 'px',
                right: 'unset',
                bottom: 'unset'
            });
            ignore = true;
        }
        function reset() {
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', reset);
        }
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', reset);
    });

    // tooltip
    ([].slice.call(document.querySelectorAll('[data-bs-toggle=\'tooltip\']'))).map(function (tooltipTriggerEl) {
        bootstrap.Tooltip.Default.allowList.table = [];
        bootstrap.Tooltip.Default.allowList.thead = [];
        bootstrap.Tooltip.Default.allowList.tbody = [];
        bootstrap.Tooltip.Default.allowList.tr = [];
        bootstrap.Tooltip.Default.allowList.td = [];
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // hover
    document.querySelectorAll('span[helper]').forEach((data) => {
        data.addEventListener('mouseover', function() {
            const helper = data.getAttribute('helper');
            document.querySelectorAll('tbody th').forEach((row) => {
                if(row.innerText == helper) {
                    const index = Array.from(data.closest('tr').childNodes).indexOf(data.parentNode);
                    const cols = Array.from(row.parentNode.childNodes);
                    cols[index].id = 'red';
                }
            });
            this.addEventListener('mouseout', function() {
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

    document.querySelector('input#S89[type=file]').addEventListener('change', function() {
        const self = this;
        const reader = new FileReader();
        reader.onload = function() {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            pdfjsLib.getDocument({
                data: new Uint8Array(this.result)
            }).promise.then(doc => {
                if(!fingerprints.some(r => r.every((value, index) => doc.fingerprints[index] == value))) {
                    bootstrap.showToast({
                        body: 'You need to get the .pdf file from the official sources',
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
                            .then((json) => engine.parseBoard(JSON.parse(json).meetings))
                            .then(() => set('dir', dirHandle)
                            .then(() => location.reload()));
                    });
                }
            });
            observer.observe(dirHandle, {
                recursive: false
            });
            console.log(observer);
        });
    });
});

async function hasPermission(handle) {
    if ((await handle.queryPermission()) === 'granted')  return true; // Permission already granted
    return false; // Permission denied
}
