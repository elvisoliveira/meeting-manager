import localStorageDB from 'localstoragedb';
import * as Handlebars from 'handlebars';

Handlebars.registerHelper('lowercase', function (str) {
    return (str && typeof str === 'string' && str.toLowerCase()) || '';
});

//
const subtitles = {
    S: {
        label: "Substituted by",
        color: "IndianRed"
    },
    CH: {
        label: "Chairman",
        color: "Pink"
    },
    SG: {
        label: "Spiritual Gems",
        color: "Violet"
    },
    CP: {
        label: "Closing Prayer",
        color: "Salmon"
    },
    OT: {
        label: "Opening Talk",
        color: "Aquamarine"
    },
    BR: {
        label: "Bible Reading",
        color: "Tomato"
    },
    CSC: {
        label: "Congregation Bible Study Conductor",
        color: "Orange"
    },
    CSR: {
        label: "Congregation Bible Study Reader",
        color: "Gold"
    },
    SA: {
        label: "Student Assignment",
        color: "SkyBlue"
    },
    AA: {
        label: "Assistant Assignment",
        color: "LightGreen"
    },
    TA: {
        label: "Talk",
        color: "CadetBlue"
    },
    DIS: {
        label: "Discussion",
        color: "RosyBrown"
    },
    LAC: {
        label: "Living as Christians",
        color: "RosyBrown"
    }
};

// json fields
const IC = 'initial_call';
const RV = 'return_visit';
const BS = 'bible_study';
const TA = 'talk';
const CH = 'chairman';
const BR = 'bible_reading';
const CP = 'closing_prayer';
const OT = 'opening_talk';
const SG = 'spiritual_gems';
const LAC = 'living_as_christians';
const CBS = 'congregation_bible_study';
const AYF = 'apply_yourself_to_the_field_ministry';

const comparer = (idx, asc) => (a, b) => ((v1, v2) => v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2))(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

const filter = function() {
    const selected = Array.from(document.querySelectorAll("input[type='checkbox']:checked")).map(element => element.value);
    document.querySelectorAll('tbody tr').forEach((row) => {
        const columns = Array.from(row.querySelectorAll('td')).reverse();
        const unnasignedWeeks = columns[0].innerText;
        const threshold = document.getElementById('threshold').value;
        const show = Array.from(row.querySelectorAll('span')).some((badge) => {
            return selected.includes(badge.innerText.trim());
        });
        row.style.display = +unnasignedWeeks <= +threshold && show ? 'table-row' : 'none';
    });
    document.querySelector('tfoot tr').style.display = document.querySelectorAll('tr[style*="display: table-row"]').length ? 'none' : 'table-row';
}

const database = {
    meetings: ['label', 'date', 'data'],
    publishers: ['name'],
    assignments: ['meeting', 'assignment', 'type', 'assigned', 'substituted']
}

const lib = new localStorageDB('library', localStorage);

Object.keys(database).forEach(function(key) {
    if(!lib.tableExists(key))
        lib.createTable(key, database[key]);
});

document.addEventListener('dragstart', () => {
    console.log('dragstart');
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();

    Array.from(e.dataTransfer.files).forEach((file) => {
        if(!['application/json'].includes(file.type))
            return;

        const r = new FileReader();
        r.onload = parseBoard;
        r.readAsArrayBuffer(file);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const data = [];
    lib.queryAll('publishers', {
        sort: [['name', 'ASC']]
    }).forEach((publisher) => {
        publisher.meetings = lib.queryAll('meetings', {
            sort: [['date', 'ASC']]
        });
        publisher.meetings.forEach((meeting, i) => {
            publisher.meetings[i].assignment = lib.queryAll('assignments', {
                query: {
                    meeting: meeting.ID,
                    assigned: publisher.ID
                }
            });
        });
        data.push(publisher);
    });

    const boot = document.getElementById('boot');
    boot.innerHTML = Handlebars.compile(document.getElementById('template').innerHTML)({
        data,
        subtitles,
        meetings: lib.queryAll('meetings', {
            sort: [['date', 'ASC']]
        })
    });
    boot.scrollTo(document.body.getElementsByTagName('table').item(0).scrollWidth , 0);

    document.querySelector('div.modal-body').insertAdjacentHTML("afterbegin", Handlebars.compile(document.getElementById('filter').innerHTML)({
        subtitles
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
        Array.from(tbody.querySelectorAll('tr')).sort(comparer(columnIndex, columnHeader.asc = !columnHeader.asc)).forEach(tr => tbody.appendChild(tr));
    })));

    document.querySelectorAll('tbody tr').forEach((row) => {
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
        row.querySelector('i').addEventListener('click', function() {
            row.style.display = 'none';
        });
    });

    // filter
    const checkboxes = document.querySelectorAll('#filters input[type="checkbox"]');
    checkboxes.forEach(checkboxInput => {
        checkboxInput.addEventListener('change', filter);
    });

    document.querySelector('input[type="number"]').addEventListener('input', filter);

    for (const button of document.querySelectorAll('button#none, button#all')) {
        button.addEventListener('click', function() {
            for (const checkbox of checkboxes) {
                checkbox.checked = this.id === 'all';
            }
            filter();
        });
    }
    filter();

    // 

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
    ([].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))).map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

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
});

const parseBoard = function(e) {
    const file = e.target.result;
    const json = new TextDecoder().decode(file);
    JSON.parse(json).meetings.forEach((m) => { // meeting
        if (m.message)
            return

        const date = m.week.replace(/\D/g, '');
        const meeting = lib.insertOrUpdate('meetings', { date }, {
            date,
            data: m,
            label: m.label,
        });
        const meetingId = meeting[meeting.length - 1] || meeting;

        lib.deleteRows('assignments', { meeting: meetingId });

        const data = {
            SA: [],
            AA: [],
            DIS: [],
            CH: { name: m[CH] },
            CP: { name: m[CP] },
            BR: { name: m[BR].reader },
            OT: { name: m[OT].speaker },
            SG: { name: m[SG].hasOwnProperty('conductor') ? m[SG].conductor : m[SG] },
            LAC: m[LAC].map(p => ({ name: p.speaker }))
        };

        if(m.hasOwnProperty(CBS)) {
            data.CSC = { name: m[CBS].conductor };
            if(m[CBS].hasOwnProperty('reader'))
                data.CSR = { name: m[CBS].reader };
        }

        if(m.hasOwnProperty(TA))
            data.TA = { name: m[TA].student };

        [IC, RV, BS].forEach((t) => {
            if (m.hasOwnProperty(t) && m[t].hasOwnProperty('student'))
                data.SA.push({
                    name: m[t].student,
                    type: t
                });
            if (m.hasOwnProperty(t) && m[t].hasOwnProperty('assistant'))
                data.AA.push({
                    name: m[t].assistant,
                    type: t
                });
        });

        if(m[AYF])
            m[AYF].forEach((v) => {
                if(v.hasOwnProperty('theme')) {
                    data.TA = {
                        name: v.assigned
                    };
                } else if(v.hasOwnProperty('assistant')) {
                    data.SA.push({
                        name: v.assigned,
                        type: v.title
                    });
                    data.AA.push({
                        name: v.assistant,
                        type: v.title
                    });
                } else {
                    data.DIS.push({
                        name: v.assigned
                    });
                }
            });

        Object.keys(data).forEach((key) =>  {
            if(Array.isArray(data[key]))
                data[key].forEach((info) => {
                    assign(key, meetingId, info);
                });
            else
                assign(key, meetingId, data[key]);
        });
    });

    lib.commit();
}

const assign = function(assignment, meetingId, info) {
    const publishers = [];
    String(info.name || '@TODO').split('|').forEach((name) => {
        const publisher = lib.insertOrUpdate('publishers', { name }, { name });
        publishers.push(publisher[publisher.length - 1] || publisher)
    });
    lib.insert('assignments', {
        meeting: meetingId,
        assignment,
        type: info.type,
        assigned: publishers[0],
        substituted: publishers[1]
    });
}
