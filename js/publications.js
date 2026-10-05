/* Reads standard braced/quoted BibTeX entries; no external dependencies. */
function parseBib(source) {
    let pos = 0;
    const entries = [];
    function skip() {
        while (pos < source.length) {
            if (/\s/.test(source[pos])) pos++;
            else if (source[pos] === '%') {
                while (pos < source.length && source[pos] !== '\n') pos++;
            } else break;
        }
    }
    function value() {
        skip();
        const opening = source[pos];
        if (opening !== '{' && opening !== '"') {
            const start = pos;
            while (pos < source.length && !/[,}\)]/.test(source[pos])) pos++;
            return source.slice(start, pos).trim();
        }
        pos++;
        let result = '', depth = 0;
        while (pos < source.length) {
            const char = source[pos++];
            if (char === '\\' && pos < source.length) {
                result += char + source[pos++];
                continue;
            }
            if (opening === '{') {
                if (char === '{') depth++;
                if (char === '}') {
                    if (depth === 0) return result;
                    depth--;
                }
            } else {
                if (char === '"' && depth === 0) return result;
                if (char === '{') depth++;
                if (char === '}') depth--;
            }
            result += char;
        }
        throw new Error('Unclosed BibTeX field.');
    }
    while (pos < source.length) {
        skip();
        if (pos >= source.length) break;
        if (source[pos++] !== '@') continue;
        const typeMatch = source.slice(pos).match(/^([a-z]+)/i);
        if (!typeMatch) throw new Error('Invalid BibTeX entry type.');
        const type = typeMatch[1].toLowerCase();
        pos += typeMatch[0].length;
        skip();
        const open = source[pos++];
        if (open !== '{' && open !== '(') throw new Error('Missing BibTeX entry delimiter.');
        const close = open === '{' ? '}' : ')';
        if (['comment', 'preamble', 'string'].includes(type)) {
            // Skip non-publication entries, including nested braces.
            let depth = 1, quoted = false;
            while (pos < source.length && depth) {
                const char = source[pos++];
                if (char === '\\') { pos++; continue; }
                if (char === '"') quoted = !quoted;
                if (!quoted && char === open) depth++;
                if (!quoted && char === close) depth--;
            }
            continue;
        }
        const keyStart = pos;
        while (pos < source.length && source[pos] !== ',' && source[pos] !== close) pos++;
        const entry = { type, key: source.slice(keyStart, pos).trim() };
        if (source[pos] !== ',') throw new Error('Missing BibTeX fields.');
        pos++;
        while (true) {
            skip();
            if (source[pos] === close) { pos++; break; }
            const fieldMatch = source.slice(pos).match(/^([\w-]+)\s*=/);
            if (!fieldMatch) throw new Error('Invalid BibTeX field.');
            const field = fieldMatch[1].toLowerCase();
            pos += fieldMatch[0].length;
            entry[field] = value();
            skip();
            if (source[pos] === ',') pos++;
            else if (source[pos] !== close) throw new Error('Missing BibTeX field separator.');
        }
        if (!entry.title || !entry.author || !entry.year) throw new Error('Publication requires title, author, and year.');
        entries.push(entry);
    }
    return entries.sort(comparePublications);
}
function plainText(value = '') {
    // Decode common BibTeX accents before removing capitalization braces.
    const accents = { "'": '\u0301', '`': '\u0300', '^': '\u0302', '~': '\u0303', '"': '\u0308', '=': '\u0304', '.': '\u0307', 'c': '\u0327', 'v': '\u030c', 'u': '\u0306' };
    return value.replace(/\\(['`^~"=.cvu])\s*\{?([A-Za-z])\}?/g, (_, mark, letter) => (letter + accents[mark]).normalize('NFC'))
        .replace(/[{}]/g, '').replace(/\\&/g, '&').replace(/\\_/g, '_').replace(/\\%/g, '%').replace(/--/g, '–').replace(/\s+/g, ' ').trim();
}
// Use the start of the conference period, rather than the BibTeX import date.
function publicationDate(entry) {
    const year = Number(entry.year);
    if (!entry.booktitle) return Date.UTC(year, 0, 1);
    const explicit = entry.conference_date || entry.eventdate;
    if (explicit) {
        const iso = explicit.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }
    let description = plainText(entry.booktitle);
    // When an event was moved, prefer its rescheduled period in the supplied record.
    const moved = description.match(/rescheduled\s+(?:for|to)\s+(.+)/i);
    if (moved) description = moved[1];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthPattern = `(${months.join('|')})`;
    const monthFirst = new RegExp(`\\b${monthPattern}\\s+(\\d{1,2})(?:\\s*[-–]\\s*(?:${monthPattern}\\s+)?\\d{1,2})?,?\\s+(\\d{4})\\b`, 'i');
    const dayFirst = new RegExp(`\\b(\\d{1,2})(?:\\s*[-–]\\s*\\d{1,2})?\\s+${monthPattern}\\s+(\\d{4})\\b`, 'i');
    const us = description.match(monthFirst);
    if (us) return Date.UTC(Number(us[4]), months.findIndex(month => month.toLowerCase() === us[1].toLowerCase()), Number(us[2]));
    const international = description.match(dayFirst);
    if (international) return Date.UTC(Number(international[3]), months.findIndex(month => month.toLowerCase() === international[2].toLowerCase()), Number(international[1]));
    return Date.UTC(year, 0, 1);
}
function comparePublications(a, b) {
    return publicationDate(b) - publicationDate(a)
        || plainText(a.title).localeCompare(plainText(b.title), 'en', { sensitivity: 'base' })
        || a.key.localeCompare(b.key, 'en');
}
function authorName(author) {
    const parts = plainText(author).split(',').map(part => part.trim());
    return parts.length > 1 ? [parts[parts.length - 1], parts[0], ...parts.slice(1, -1)].join(' ') : parts[0];
}
function isOwner(name) {
    return /^(ziqi|z\.)\s+xu$/i.test(name.trim().replace(/\s+/g, ' '));
}
function appendText(parent, tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
}
function renderEntry(entry) {
    const item = document.createElement('li');
    const title = appendText(item, 'p', plainText(entry.title), 'publication-title');
    const authors = document.createElement('p');
    authors.className = 'publication-authors';
    const corresponding = (entry.corresponding || '').split(/\s+and\s+/i).map(authorName);
    entry.author.split(/\s+and\s+/i).map(authorName).forEach((name, index) => {
        if (index) authors.append(document.createTextNode(', '));
        const author = appendText(authors, isOwner(name) ? 'strong' : 'span', name);
        if (corresponding.some(person => person.toLowerCase() === name.toLowerCase() || (isOwner(person) && isOwner(name)))) {
            const star = appendText(author, 'sup', '*');
            star.setAttribute('aria-label', 'corresponding or co-corresponding author');
        }
    });
    item.append(authors);
    const venue = [plainText(entry.booktitle || entry.journal || ''), entry.volume ? `Vol. ${plainText(entry.volume)}` : '', entry.number ? `No. ${plainText(entry.number)}` : '', entry.pages ? `pp. ${plainText(entry.pages)}` : '', entry.year].filter(Boolean).join(', ');
    appendText(item, 'p', venue, 'publication-venue');
    if (entry.demo === 'true') appendText(item, 'span', 'Fictional layout example', 'publication-demo');
    for (const [field, label] of [['doi', 'DOI'], ['url', 'Paper'], ['pdf', 'PDF'], ['code', 'Code']]) {
        if (!entry[field]) continue;
        const url = field === 'doi' ? `https://doi.org/${plainText(entry[field])}` : plainText(entry[field]);
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) continue;
            const parent = ['doi', 'url'].includes(field) ? title : item;
            parent.append(document.createTextNode(' '));
            const link = appendText(parent, 'a', `[${label}]`, 'publication-link');
            link.href = parsed.href;
        } catch { /* Ignore malformed links rather than breaking the list. */ }
    }
    return item;
}
function coreSummary(entries) {
    const counts = { 'A*': 0, A: 0, pending: 0, venues: { 'A*': {}, A: {} } };
    for (const entry of entries) {
        const audited = CORE_2026.papers[entry.key];
        const venue = entry.core_venue || audited?.venue || CORE_2026.dblpVenueAliases[entry.key.split('/')[1]];
        const rank = CORE_2026.venues[venue]?.rank;
        if (!rank) { counts.pending++; continue; }
        if (!['A*', 'A'].includes(rank)) continue;
        const track = (entry.core_track || audited?.track || '').toLowerCase();
        if (!track) { counts.pending++; continue; }
        if (track === 'full') {
            counts[rank]++;
            counts.venues[rank][venue] = (counts.venues[rank][venue] || 0) + 1;
        }
    }
    return counts;
}
function ccfSummary(entries) {
    const counts = { A: 0, B: 0, C: 0, pending: 0, unlisted: 0, venues: { A: {}, B: {}, C: {} } };
    for (const entry of entries) {
        const audited = CORE_2026.papers[entry.key];
        const venue = entry.core_venue || audited?.venue || CORE_2026.dblpVenueAliases[entry.key.split('/')[1]];
        const track = (entry.core_track || audited?.track || '').toLowerCase();
        if (track && track !== 'full') continue;
        const listed = CCF_2026.venues[venue];
        if (!listed || !track) { counts.pending++; continue; }
        if (!listed.rank) { counts.unlisted++; continue; }
        counts[listed.rank]++;
        counts.venues[listed.rank][venue] = (counts.venues[listed.rank][venue] || 0) + 1;
    }
    return counts;
}
function appendConferenceMetric(row, counts, rank, scheme, label = rank) {
    const metric = appendText(row, 'span', label ? `${label}: ` : '', 'conference-metric');
    const id = `${scheme.toLowerCase()}-${rank === 'A*' ? 'a-star' : rank.toLowerCase()}-breakdown`;
    const button = appendText(metric, 'button', String(counts[rank]), 'conference-metric-total conference-metric-toggle');
    button.setAttribute('type', 'button');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.setAttribute('aria-label', `${scheme} 2026 ${rank}: ${counts[rank]} papers, toggle conference breakdown`);
    const breakdown = Object.entries(counts.venues[rank])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
        .map(([venue, count]) => `${venue} ${count}`).join(' · ');
    const details = appendText(metric, 'span', breakdown ? ` (${breakdown})` : ' (No papers)', 'conference-metric-breakdown');
    details.setAttribute('id', id);
    details.setAttribute('hidden', '');
}
function renderCcfMetrics(entries) {
    const counts = ccfSummary(entries);
    const section = document.createElement('div');
    section.className = 'ccf-metrics';
    const row = document.createElement('div');
    row.className = 'conference-metrics-row';
    const source = appendText(row, 'a', 'CCF (7th edition)', 'conference-metrics-label');
    source.href = CCF_2026.source;
    for (const rank of ['A', 'B', 'C']) {
        appendConferenceMetric(row, counts, rank, 'CCF');
    }
    section.append(row);
    const policy = document.createElement('p');
    policy.className = 'conference-metrics-note';
    policy.append(document.createTextNode('Main-track full papers only.'), document.createElement('br'));
    const link = appendText(policy, 'a', 'CCF catalogue (7th edition)');
    link.href = CCF_2026.catalogue;
    if (counts.pending) policy.append(document.createTextNode(` ${counts.pending} entries awaiting verification.`));
    section.append(policy);
    return section;
}
function csRankingsSummary(entries) {
    const counts = { venues: {}, pending: 0 };
    for (const area of CSRANKINGS.areas) { counts[area.id] = 0; counts.venues[area.id] = {}; }
    for (const entry of entries) {
        const audited = CORE_2026.papers[entry.key];
        const venue = entry.core_venue || audited?.venue || CORE_2026.dblpVenueAliases[entry.key.split('/')[1]];
        const area = CSRANKINGS.areas.find(area => area.venues.includes(venue));
        if (!area) continue;
        const track = (entry.core_track || audited?.track || '').toLowerCase();
        if (!track) { counts.pending++; continue; }
        if (track !== 'full') continue;
        const pages = (entry.pages || '').match(/^(\d+)\s*[-–]+\s*(\d+)$/);
        if (pages && Number(pages[2]) - Number(pages[1]) + 1 < 6) continue;
        counts[area.id]++;
        counts.venues[area.id][venue] = (counts.venues[area.id][venue] || 0) + 1;
    }
    return counts;
}
function renderCsRankingsMetrics(entries) {
    const counts = csRankingsSummary(entries);
    const section = document.createElement('div');
    section.className = 'csrankings-metrics';
    const row = document.createElement('div');
    row.className = 'conference-metrics-row';
    const rank = CSRANKINGS.facultyRank;
    const label = rank ? `CSRankings (#${rank.position} in ${rank.institution})` : 'CSRankings';
    const source = appendText(row, 'a', label, 'conference-metrics-label');
    source.href = rank?.source || CSRANKINGS.source;
    if (rank) source.setAttribute('title', `${rank.fromYear}–${rank.toYear}, all areas; ${rank.papers} papers; sorted by publication count. Checked ${rank.checked}.`);
    for (const area of CSRANKINGS.areas) {
        if (!counts[area.id]) continue;
        const group = document.createElement('div');
        group.className = 'csrankings-area';
        appendConferenceMetric(group, counts, area.id, 'CSRankings', area.name);
        row.append(group);
    }
    section.append(row);
    const policy = document.createElement('p');
    policy.className = 'conference-metrics-note';
    const link = appendText(policy, 'a', 'Areas & methodology');
    link.href = CSRANKINGS.policy;
    if (counts.pending) policy.append(document.createTextNode(` ${counts.pending} entries awaiting verification.`));
    section.append(policy);
    return section;
}
function renderConferenceMetrics(entries) {
    const counts = coreSummary(entries);
    const row = document.createElement('div');
    row.className = 'conference-metrics-row';
    const source = appendText(row, 'a', 'CORE 2026', 'conference-metrics-label');
    source.href = 'https://portal.core.edu.au/conf-ranks/?source=ICORE2026';
    for (const rank of ['A*', 'A']) {
        appendConferenceMetric(row, counts, rank, 'CORE');
    }
    const box = document.createElement('div');
    box.append(row);
    const policy = document.createElement('p');
    policy.className = 'conference-metrics-note';
    policy.append(document.createTextNode('Main-track full papers only.'), document.createElement('br'));
    const link = appendText(policy, 'a', 'Ranking criteria');
    link.href = CORE_2026.policy;
    if (counts.pending) policy.append(document.createTextNode(` ${counts.pending} entries awaiting verification.`));
    box.append(policy);
    const layout = document.createElement('div');
    layout.className = 'conference-ranking-grid';
    layout.append(box, renderCcfMetrics(entries), renderCsRankingsMetrics(entries));
    return layout;
}
async function loadSection(id, path) {
    const list = document.getElementById(id);
    const status = document.getElementById(`${id}-status`);
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const entries = parseBib(await response.text());
        list.setAttribute('reversed', '');
        list.setAttribute('start', String(entries.length || 1));
        list.replaceChildren(...entries.map(renderEntry));
        if (id === 'conference-publications') document.getElementById('conference-metrics').replaceChildren(renderConferenceMetrics(entries));
        status.textContent = entries.length ? '' : 'No publications added yet.';
        status.hidden = entries.length > 0;
    } catch (error) {
        status.hidden = false;
        status.textContent = list.children.length ? 'Showing the saved publication list. Live updates could not be loaded.' : 'Publications could not be loaded. Please refresh the page or check the BibTeX file.';
        console.error(`Cannot load ${path}:`, error);
    }
}
if (typeof document !== 'undefined') {
    document.getElementById('conference-metrics').addEventListener('click', event => {
        const button = event.target.closest('.conference-metric-toggle');
        if (!button) return;
        const details = document.getElementById(button.getAttribute('aria-controls'));
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        details.hidden = !expanded;
        button.setAttribute('aria-expanded', String(expanded));
    });
}
if (typeof document !== 'undefined' && location.protocol !== 'file:') {
    loadSection('conference-publications', 'bib/conference.bib');
    loadSection('journal-publications', 'bib/journal.bib');
}
