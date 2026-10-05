// Generate the local-file version from the same BibTeX parser and renderer.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreData = JSON.parse(readFileSync(resolve(root, 'bib/core2026-venues.json'), 'utf8'));
writeFileSync(resolve(root, 'js/core2026-data.js'), `const CORE_2026 = ${JSON.stringify(coreData)};\n`);
const ccfData = JSON.parse(readFileSync(resolve(root, 'bib/ccf2026-venues.json'), 'utf8'));
writeFileSync(resolve(root, 'js/ccf2026-data.js'), `const CCF_2026 = ${JSON.stringify(ccfData)};\n`);
const csrData = JSON.parse(readFileSync(resolve(root, 'bib/csrankings-areas.json'), 'utf8'));
writeFileSync(resolve(root, 'js/csrankings-data.js'), `const CSRANKINGS = ${JSON.stringify(csrData)};\n`);
const context = vm.createContext({ URL, console, CORE_2026: coreData, CCF_2026: ccfData, CSRANKINGS: csrData });
vm.runInContext(readFileSync(resolve(root, 'js/publications.js'), 'utf8'), context);
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// A minimal build-time DOM lets us reuse the browser renderer exactly.
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
    set textContent(text) { this.children = [escape(text)]; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    toString() {
        const attrs = { ...this.attributes };
        if (this.className) attrs.class = this.className;
        if (this.href) attrs.href = this.href;
        const attrText = Object.entries(attrs).map(([key,value]) => ` ${key}="${escape(value)}"`).join('');
        if (this.tag === 'br') return `<br${attrText}>`;
        return `<${this.tag}${attrText}>${this.children.join('')}</${this.tag}>`;
    }
}
context.document = {
    createElement: tag => new Element(tag),
    createTextNode: text => escape(text)
};
const pagePath = resolve(root, 'publications.html');
let html = readFileSync(pagePath, 'utf8');
for (const type of ['conference', 'journal']) {
    const entries = context.parseBib(readFileSync(resolve(root, `bib/${type}.bib`), 'utf8'));
    if (type === 'conference') {
        const metrics = String(context.renderConferenceMetrics(entries));
        html = html.replace(/(<div id="conference-metrics"[^>]*>)[\s\S]*?(?=\n<p id="conference-publications-status")/, (_, open) => `${open}${metrics}</div>\n`);
        console.log('CORE 2026:', context.coreSummary(entries));
        console.log('CCF 2026:', context.ccfSummary(entries));
        console.log('CSRankings areas:', context.csRankingsSummary(entries));
    }
    const list = entries.map(entry => String(context.renderEntry(entry))).join('\n');
    html = html.replace(new RegExp(`(<ol id="${type}-publications"[^>]*>)[\\s\\S]*?(</ol>)`), (_,open,close) => `<ol id="${type}-publications" class="publication-list" reversed start="${entries.length || 1}">\n${list}\n${close}`);
    html = html.replace(new RegExp(`<p id="${type}-publications-status"[^>]*>[\\s\\S]*?</p>`), `<p id="${type}-publications-status" class="placeholder" role="status"${entries.length ? ' hidden' : ''}>${entries.length ? '' : 'No publications added yet.'}</p>`);
    console.log(`${type}: ${entries.length} publications`);
}
writeFileSync(pagePath, html);
console.log('Updated publications.html. You can open it directly in your browser.');
