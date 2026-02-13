#!/usr/bin/env node
/**
 * ============================================================
 *  Symblex CLI — Custom Dictionary Builder
 * ============================================================
 *  Creator  : Prapan Biswas
 *  Version  : 3.1.0
 *  License  : Apache-2.0
 *  GitHub   : https://github.com/prapanbiswas/symblex
 * ============================================================
 *  Token space rules:
 *    ~[0-9a-n][0-9a-zA-Z]    = built-in word    (indices 0–1467)
 *    ~[A-Z][0-9a-zA-Z][a-o]  = suffix/stem word (4 chars)
 *    ~[o-z][0-9a-zA-Z]       = CUSTOM word      (indices 1500–2231)
 *
 *  Custom tokens ALWAYS start with ~[o-z]. They can NEVER
 *  collide with built-in or suffix tokens. This is enforced
 *  mathematically — no runtime checks needed.
 *
 *  Input rules:
 *    • Only .txt and .md files are accepted
 *    • Markdown syntax is stripped before word counting
 *    • Minimum word length: 4 characters
 *    • Maximum custom dictionary size: 744 words
 *    • Words already covered by built-in dict are REJECTED
 *    • Words already covered by suffix stemming are REJECTED
 *    • Only genuinely new words are accepted
 *
 *  Usage:
 *    node symblex-cli.js                         Show help
 *    node symblex-cli.js build  --input file.txt file.md
 *    node symblex-cli.js analyse --input corpus.txt
 *    node symblex-cli.js verify  --input mydict.json
 *    node symblex-cli.js test    "your text"
 *    node symblex-cli.js info
 * ============================================================
 */

'use strict';

var fs   = require('fs');
var path = require('path');

/* ─── ANSI colour helpers ───────────────────────────────────── */
var USE_COLOR = process.stdout.isTTY !== false;

var C = {
  reset:    USE_COLOR ? '\x1b[0m'  : '',
  bold:     USE_COLOR ? '\x1b[1m'  : '',
  dim:      USE_COLOR ? '\x1b[2m'  : '',
  red:      USE_COLOR ? '\x1b[31m' : '',
  green:    USE_COLOR ? '\x1b[32m' : '',
  yellow:   USE_COLOR ? '\x1b[33m' : '',
  blue:     USE_COLOR ? '\x1b[34m' : '',
  magenta:  USE_COLOR ? '\x1b[35m' : '',
  cyan:     USE_COLOR ? '\x1b[36m' : '',
  white:    USE_COLOR ? '\x1b[37m' : '',
  bgBlue:   USE_COLOR ? '\x1b[44m' : '',
  bgGreen:  USE_COLOR ? '\x1b[42m' : '',
};

function co(color, text) { return C[color] + text + C.reset; }
function bold(t)         { return C.bold + t + C.reset; }
function dim(t)          { return C.dim  + t + C.reset; }

/* ─── Box / table drawing ────────────────────────────────────── */
var BOX = {
  tl:'╔', tr:'╗', bl:'╚', br:'╝',
  h:'═',  v:'║',
  ml:'╠', mr:'╣', mh:'═',
  sl:'┌', sr:'┐', sb:'└', se:'┘', sh:'─', sv:'│',
  dot:'·'
};

function boxLine(width) {
  return BOX.h.repeat(width);
}

function printHeader() {
  console.log('');
  console.log(co('cyan', BOX.tl + boxLine(62) + BOX.tr));
  console.log(co('cyan', BOX.v) + bold(co('blue',
    '   ███████╗██╗   ██╗███╗   ███╗██████╗ ██╗     ███████╗██╗  ██╗  ')) + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + bold(co('blue',
    '   ██╔════╝╚██╗ ██╔╝████╗ ████║██╔══██╗██║     ██╔════╝╚██╗██╔╝  ')) + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + bold(co('blue',
    '   ███████╗ ╚████╔╝ ██╔████╔██║██████╔╝██║     █████╗   ╚███╔╝   ')) + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + bold(co('blue',
    '   ╚════██║  ╚██╔╝  ██║╚██╔╝██║██╔══██╗██║     ██╔══╝   ██╔██╗   ')) + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + bold(co('blue',
    '   ███████║   ██║   ██║ ╚═╝ ██║██████╔╝███████╗███████╗██╔╝ ██╗  ')) + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + bold(co('blue',
    '   ╚══════╝   ╚═╝   ╚═╝     ╚═╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝  ')) + co('cyan', BOX.v));
  console.log(co('cyan', BOX.ml + boxLine(62) + BOX.mr));
  console.log(co('cyan', BOX.v) + co('yellow',
    '   Custom Dictionary Builder CLI  v3.1.0                          ') + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + co('white',
    '   Creator : Prapan Biswas                                        ') + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + co('dim',
    '   GitHub  : https://github.com/prapanbiswas/symblex              ') + co('cyan', BOX.v));
  console.log(co('cyan', BOX.v) + co('dim',
    '   License : Apache License 2.0                                   ') + co('cyan', BOX.v));
  console.log(co('cyan', BOX.bl + boxLine(62) + BOX.br));
  console.log('');
}

function printSectionHeader(title) {
  var pad = Math.max(0, 58 - title.length);
  console.log('');
  console.log(co('cyan', BOX.sl + BOX.sh.repeat(2) + ' ') + bold(co('yellow', title)) + co('cyan', ' ' + BOX.sh.repeat(pad) + BOX.sr));
}

function printRow(label, value, color) {
  color = color || 'white';
  var l = ('  ' + label).padEnd(30);
  console.log(co('dim', BOX.sv) + ' ' + dim(l) + co(color, value));
}

function printDivider() {
  console.log(co('dim', '  ' + BOX.sh.repeat(58)));
}

function printSuccess(msg) { console.log(co('green',  '  ✓  ') + msg); }
function printError(msg)   { console.log(co('red',    '  ✗  ') + msg); }
function printWarn(msg)    { console.log(co('yellow', '  ⚠  ') + msg); }
function printInfo(msg)    { console.log(co('cyan',   '  ℹ  ') + msg); }
function printSkip(msg)    { console.log(co('dim',    '  ─  ') + msg); }

function progressBar(done, total, width) {
  width = width || 40;
  var pct  = total > 0 ? done / total : 0;
  var fill = Math.round(pct * width);
  var bar  = co('green',  '█'.repeat(fill)) +
             co('dim',    '░'.repeat(width - fill));
  var pctStr = (pct * 100).toFixed(1).padStart(5) + '%';
  return '[' + bar + '] ' + co('yellow', pctStr) + ' ' + co('dim', done + '/' + total);
}

function printTable(headers, rows, colors) {
  colors = colors || [];
  /* compute column widths */
  var widths = headers.map(function (h) { return h.length; });
  rows.forEach(function (row) {
    row.forEach(function (cell, i) {
      widths[i] = Math.max(widths[i] || 0, String(cell).length);
    });
  });
  var totalW = widths.reduce(function (a, b) { return a + b + 3; }, 1);
  var hline  = BOX.sl + widths.map(function (w) { return BOX.sh.repeat(w + 2); }).join(BOX.sh + BOX.sh) + BOX.sr;
  var mline  = BOX.ml + widths.map(function (w) { return BOX.mh.repeat(w + 2); }).join(BOX.mh + BOX.mh) + BOX.mr;
  var bline  = BOX.sb + widths.map(function (w) { return BOX.sh.repeat(w + 2); }).join(BOX.sh + BOX.sh) + BOX.se;

  console.log(co('dim', '  ' + hline));
  var headerRow = co('dim', '  ' + BOX.sv) +
    headers.map(function (h, i) {
      return ' ' + bold(co('cyan', h.padEnd(widths[i]))) + ' ';
    }).join(co('dim', BOX.sv)) + co('dim', BOX.sv);
  console.log(headerRow);
  console.log(co('dim', '  ' + mline));
  rows.forEach(function (row, ri) {
    var line = co('dim', '  ' + BOX.sv) +
      row.map(function (cell, ci) {
        var color = (colors[ri] && colors[ci]) ? colors[ri][ci] : 'white';
        return ' ' + co(color, String(cell).padEnd(widths[ci])) + ' ';
      }).join(co('dim', BOX.sv)) + co('dim', BOX.sv);
    console.log(line);
  });
  console.log(co('dim', '  ' + bline));
}

/* ─── Token system ───────────────────────────────────────────── */
var B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* Custom token range: indices 1500–2231 → first char 'o'–'z' */
var CUSTOM_START_IDX = 1500;
var CUSTOM_END_IDX   = 2231;
var CUSTOM_CAPACITY  = CUSTOM_END_IDX - CUSTOM_START_IDX + 1;   /* 732 */

function customTokenFor(customIdx) {
  /* customIdx is 0-based within custom range */
  var absIdx = CUSTOM_START_IDX + customIdx;
  return '~' + B62[Math.floor(absIdx / 62)] + B62[absIdx % 62];
}

function isCustomToken(tok) {
  if (!tok || tok[0] !== '~' || tok.length !== 3) return false;
  var fc = tok[1];
  return fc >= 'o' && fc <= 'z';
}

function isBuiltinToken(tok) {
  if (!tok || tok[0] !== '~' || tok.length !== 3) return false;
  var fc = tok[1];
  return (fc >= '0' && fc <= '9') || (fc >= 'a' && fc <= 'n');
}

function isSuffixToken(tok) {
  if (!tok || tok[0] !== '~' || tok.length !== 4) return false;
  return tok[1] >= 'A' && tok[1] <= 'Z';
}

/* ─── Load Symblex (for verification) ───────────────────────── */
var _sx = null;
function loadSymblex() {
  if (_sx) return _sx;
  try {
    _sx = require('./symblex.js');
    return _sx;
  } catch (e) {
    printError('Cannot load symblex.js — make sure it is in the same directory');
    printInfo('Run: git clone https://github.com/prapanbiswas/symblex.git');
    process.exit(1);
  }
}

/* ─── Suffix stemmer (same rules as symblex.js) ─────────────── */
var SUFFIX_STRIP = [
  ['tion'], ['ness'], ['ment'], ['less'],
  ['ful'],  ['ers'],  ['ing'],  ['ed'],
  ['er'],   ['ly'],   ['es'],   ['s']
];

function isCoveredByStem(word, sx) {
  for (var i = 0; i < SUFFIX_STRIP.length; i++) {
    var sfx = SUFFIX_STRIP[i][0];
    if (word.length <= sfx.length) continue;
    if (!word.endsWith(sfx)) continue;
    var root  = word.slice(0, -sfx.length);
    if (sx.lookup(root))      return root + ' + -' + sfx;
    if (sx.lookup(root + 'e')) return root + 'e + -' + sfx + ' (e-drop)';
  }
  return null;
}

/* ─── Markdown stripper ──────────────────────────────────────── */
function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, ' ')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/>\s+/g, ' ')
    .replace(/[-*+]\s+/g, ' ')
    .replace(/\d+\.\s+/g, ' ')
    .replace(/\|[^\n]*/g, ' ')
    .replace(/---+/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\w\s]/g, ' ');
}

/* ─── Read files ─────────────────────────────────────────────── */
function readFile(fp) {
  var ext = path.extname(fp).toLowerCase();
  if (ext !== '.txt' && ext !== '.md') {
    printWarn('Skipping ' + fp + ' — only .txt and .md files are accepted');
    return null;
  }
  if (!fs.existsSync(fp)) {
    printError('File not found: ' + fp);
    return null;
  }
  try {
    var raw = fs.readFileSync(fp, 'utf8');
    return ext === '.md' ? stripMarkdown(raw) : raw;
  } catch (e) {
    printError('Cannot read ' + fp + ': ' + e.message);
    return null;
  }
}

/* ─── Parse CLI args ─────────────────────────────────────────── */
var argv    = process.argv.slice(2);
var command = argv[0] || '';
var inputs  = [];
var outFile = 'symblex-custom.json';
var topN    = 744;
var minLen  = 4;
var minFreq = 2;
var verbose = false;
var testText = '';
var verifyFile = '';

for (var i = 1; i < argv.length; i++) {
  var a = argv[i];
  if (a === '--input' || a === '-i') {
    i++;
    while (i < argv.length && !argv[i].startsWith('-')) inputs.push(argv[i++]);
    i--;
  } else if (a === '--out'  || a === '-o')  { outFile    = argv[++i]; }
  else if (a === '--top')                   { topN       = Math.min(parseInt(argv[++i]) || 744, CUSTOM_CAPACITY); }
  else if (a === '--minlen')                { minLen     = parseInt(argv[++i]) || 4; }
  else if (a === '--minfreq')               { minFreq    = parseInt(argv[++i]) || 2; }
  else if (a === '--verbose' || a === '-v') { verbose    = true; }
  else if (command === 'test')              { testText  += (testText ? ' ' : '') + a; }
  else if (command === 'verify')            { verifyFile = a; }
}

/* ═══════════════════════════════════════════════════════════════
 *  COMMAND: help
 * ═══════════════════════════════════════════════════════════════ */
if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHeader();

  console.log(bold(co('cyan', '  COMMANDS')));
  console.log('');
  printTable(
    ['Command', 'Description'],
    [
      ['build',   'Scan .txt/.md files and generate symblex-custom.json'],
      ['analyse', 'Show corpus stats only — no file is written'],
      ['verify',  'Check an existing custom dict JSON for errors'],
      ['test',    'Test encode/decode on a text string'],
      ['info',    'Show token space rules and built-in dict stats'],
    ],
    [
      ['green','white'],['cyan','white'],['yellow','white'],['magenta','white'],['blue','white']
    ]
  );

  console.log('');
  console.log(bold(co('cyan', '  EXAMPLES')));
  console.log('');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' build   --input corpus.txt notes.md');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' build   --input *.txt --top 300 --out my-dict.json');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' build   --input data.md --verbose');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' analyse --input medical.txt');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' verify  symblex-custom.json');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' test    "patient diagnosis treatment"');
  console.log('  ' + co('yellow','node symblex-cli.js') + ' info');
  console.log('');
  console.log(bold(co('cyan', '  OPTIONS')));
  console.log('');
  printTable(
    ['Option', 'Default', 'Description'],
    [
      ['--input <files>', 'required', 'One or more .txt or .md files'],
      ['--out <file>',    'symblex-custom.json', 'Output JSON path'],
      ['--top <n>',       '744', 'Max words in output (hard limit: 744)'],
      ['--minlen <n>',    '4', 'Minimum word length to include'],
      ['--minfreq <n>',   '2', 'Minimum occurrences required'],
      ['--verbose, -v',   'off', 'Show per-word accept/reject decisions'],
    ]
  );
  console.log('');
  process.exit(0);
}

/* ═══════════════════════════════════════════════════════════════
 *  COMMAND: info
 * ═══════════════════════════════════════════════════════════════ */
if (command === 'info') {
  printHeader();
  var sx = loadSymblex();

  printSectionHeader('TOKEN SPACE RULES');
  console.log('');
  printTable(
    ['Token Pattern', 'Type', 'Length', 'Slots', 'Example'],
    [
      ['~[0-9a-n][0-9a-zA-Z]', 'Built-in word',   '3 chars', '1,468 used', '~7N = freedom'],
      ['~[A-Z][0-9a-zA-Z][a-o]','Suffix / stem',  '4 chars', 'unlimited', '~Fle = developing'],
      ['~[o-z][0-9a-zA-Z]',    'Custom word',    '3 chars', '744 slots',  '~oc = patient'],
    ],
    [
      ['blue','white','white','white','dim'],
      ['magenta','white','white','white','dim'],
      ['green','white','white','white','dim'],
    ]
  );

  printSectionHeader('BUILT-IN DICTIONARY');
  console.log('');
  printRow('Total words',  sx.DICTIONARY_SIZE + ' words');
  printRow('Token range',  '~00  →  ~nF');
  printRow('Index range',  '0  →  1467');
  printRow('First char',   '0–9, a–n  (base-62 indices 0–23)');

  printSectionHeader('CUSTOM DICTIONARY');
  console.log('');
  printRow('Token range',   co('green','~oc') + '  →  ' + co('green','~zZ'));
  printRow('Index range',   CUSTOM_START_IDX + '  →  ' + CUSTOM_END_IDX);
  printRow('Capacity',      CUSTOM_CAPACITY + ' words maximum');
  printRow('First char',    'o–z  (base-62 indices 24–35)');
  printRow('Collision risk', co('green', 'ZERO — mathematically impossible'));

  printSectionHeader('REJECTION RULES');
  console.log('');
  printInfo('A word is REJECTED (not added to custom dict) if:');
  console.log('');
  console.log('    1. It is already in the built-in dictionary (direct match)');
  console.log('    2. It is derivable from a built-in word via suffix stemming');
  console.log('       e.g. "working" → work + -ing  (already handled)');
  console.log('    3. It is shorter than --minlen characters (default: 4)');
  console.log('    4. It appears fewer than --minfreq times (default: 2)');
  console.log('    5. The custom dict is already full (744 word limit)');

  console.log('');
  printRow('Author',  sx.AUTHOR);
  printRow('GitHub',  sx.GITHUB);
  printRow('License', sx.LICENSE);
  console.log('');
  process.exit(0);
}

/* ═══════════════════════════════════════════════════════════════
 *  COMMAND: test
 * ═══════════════════════════════════════════════════════════════ */
if (command === 'test') {
  printHeader();
  var sx = loadSymblex();

  if (!testText) {
    printError('Provide text after the test command.');
    console.log('  Example: ' + co('yellow', 'node symblex-cli.js test "patient diagnosis treatment"'));
    process.exit(1);
  }

  printSectionHeader('ENCODE TEST');
  console.log('');
  var enc  = sx.encode(testText);
  var dec  = sx.decode(enc);
  var bin  = sx.packToBase64url(testText);
  var s    = sx.stats(testText);
  var rt   = sx.runtime();

  printRow('Input text',     testText,       'white');
  printRow('Encoded',        co('green', enc), 'white');
  printRow('Decoded back',   dec === testText ? co('green', dec + '  ✓') : co('red', dec + '  ✗'), 'white');
  printDivider();
  printRow('Text savings',   co('yellow', s.ratioText + ' (' + s.savedText + ' chars)'));
  printRow('Binary (b64url)',co('yellow', bin + '  →  ' + s.ratioBinary + ' (' + s.savedBinary + ' chars)'));
  printRow('Dict hits',      s.dictHits.toString(),     'cyan');
  printRow('Stem hits',      s.stemHits.toString(),     'cyan');
  printRow('Hit rate',       co('yellow', s.hitRate),  'white');
  printDivider();
  printRow('Custom dict',    rt.customDictLoaded ? co('green', 'loaded (' + rt.customWords + ' words)') : co('dim', 'not loaded'));
  printRow('Runtime',        rt.environment + ' / ' + (rt.platform || 'unknown'));
  console.log('');

  if (dec !== testText) {
    printWarn('Decoded text differs from input. This is expected if the text contains');
    printWarn('uppercase letters (tokens are always lowercase on decode).');
  }
  process.exit(0);
}

/* ═══════════════════════════════════════════════════════════════
 *  COMMAND: verify
 * ═══════════════════════════════════════════════════════════════ */
if (command === 'verify') {
  printHeader();
  var sx = loadSymblex();
  var fp = verifyFile || argv[1] || '';

  if (!fp || !fs.existsSync(fp)) {
    printError('No valid JSON file given.');
    console.log('  Usage: ' + co('yellow', 'node symblex-cli.js verify symblex-custom.json'));
    process.exit(1);
  }

  var dict;
  try {
    dict = JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    printError('Cannot parse JSON: ' + e.message);
    process.exit(1);
  }

  printSectionHeader('VERIFYING: ' + path.basename(fp));
  console.log('');

  var enc     = dict.encode || {};
  var dec     = dict.decode || {};
  var errors  = [];
  var warns   = [];
  var checked = 0;
  var ok      = 0;

  Object.keys(enc).forEach(function (word) {
    checked++;
    var tok = enc[word];
    var lower = word.toLowerCase();

    if (typeof tok !== 'string' || tok[0] !== '~') {
      errors.push('INVALID TOKEN for "' + word + '": ' + tok);
      return;
    }
    if (!isCustomToken(tok)) {
      if (isBuiltinToken(tok)) {
        errors.push('"' + word + '" uses built-in range token ' + tok + ' — must use ~[o-z]XX range');
      } else if (isSuffixToken(tok)) {
        errors.push('"' + word + '" uses suffix range token ' + tok);
      } else {
        errors.push('"' + word + '" has unrecognised token format: ' + tok);
      }
      return;
    }
    var covTok = sx.lookup(lower);
    if (covTok && !isCustomToken(covTok)) {
      warns.push('"' + word + '" is already covered by built-in dict/stems (token: ' + covTok + ') — this entry is redundant');
    }
    if (!dec[tok]) {
      warns.push('Token ' + tok + ' has no reverse entry in "decode" map');
    }
    ok++;
  });

  if (errors.length === 0 && warns.length === 0) {
    printSuccess('All ' + checked + ' entries are valid');
  } else {
    errors.forEach(function (e) { printError(e); });
    warns.forEach(function (w)  { printWarn(w); });
  }

  printDivider();
  printRow('Total entries',  checked.toString());
  printRow('Valid entries',  co('green', ok.toString()));
  printRow('Errors',         errors.length > 0 ? co('red', errors.length.toString()) : co('green', '0'));
  printRow('Warnings',       warns.length  > 0 ? co('yellow', warns.length.toString()) : co('green', '0'));
  console.log('');
  process.exit(errors.length > 0 ? 1 : 0);
}

/* ═══════════════════════════════════════════════════════════════
 *  SHARED: read + count words (used by build + analyse)
 * ═══════════════════════════════════════════════════════════════ */
if (!inputs.length && (command === 'build' || command === 'analyse')) {
  printHeader();
  printError('No input files given. Use --input file.txt notes.md');
  process.exit(1);
}

var sx         = loadSymblex();
var freq       = {};
var totalWords = 0;
var fileStats  = [];

printHeader();
printSectionHeader('READING FILES');
console.log('');

inputs.forEach(function (fp) {
  var text = readFile(fp);
  if (!text) return;
  var matches = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  var countBefore = Object.keys(freq).length;
  matches.forEach(function (w) {
    if (w.length >= minLen) { freq[w] = (freq[w] || 0) + 1; totalWords++; }
  });
  var newUniq = Object.keys(freq).length - countBefore;
  fileStats.push([path.basename(fp), matches.length.toLocaleString(), newUniq.toLocaleString()]);
  printSuccess(path.basename(fp) + co('dim', '  (' + matches.length + ' words, ' + newUniq + ' new unique)'));
});

if (!fileStats.length) {
  printError('No valid files were read.');
  process.exit(1);
}

/* sort by frequency */
var sorted = Object.keys(freq)
  .filter(function (w) { return freq[w] >= minFreq; })
  .sort(function (a, b) { return freq[b] - freq[a] || a.localeCompare(b); });

/* ═══════════════════════════════════════════════════════════════
 *  COMMAND: analyse
 * ═══════════════════════════════════════════════════════════════ */
if (command === 'analyse') {
  printSectionHeader('CORPUS STATISTICS');
  console.log('');
  printRow('Files processed',   fileStats.length.toString());
  printRow('Total word tokens', totalWords.toLocaleString());
  printRow('Unique words',      Object.keys(freq).length.toLocaleString());
  printRow('After freq filter', sorted.length.toLocaleString() + ' words (freq >= ' + minFreq + ')');
  printDivider();

  /* How many of sorted words are already covered? */
  var alreadyCovered = sorted.filter(function (w) { return sx.lookup(w); });
  var genuineNew     = sorted.filter(function (w) { return !sx.lookup(w); });
  printRow('Already in built-in / stems', co('yellow', alreadyCovered.length.toLocaleString()));
  printRow('Genuinely new (will be added)', co('green', genuineNew.length.toLocaleString()));
  printRow('Custom dict capacity',         co('cyan', CUSTOM_CAPACITY.toString()) + ' slots');

  printSectionHeader('TOP 25 WORDS IN CORPUS');
  console.log('');
  var tableRows = [];
  var tableColors = [];
  sorted.slice(0, 25).forEach(function (w, i) {
    var pct     = ((freq[w] / totalWords) * 100).toFixed(2);
    var covered = sx.lookup(w);
    var status, statusColor;
    if (covered) {
      var stem = isSuffixToken(covered) ? 'stem' : 'dict';
      status = 'covered (' + stem + ')';
      statusColor = 'yellow';
    } else {
      status = 'NEW';
      statusColor = 'green';
    }
    tableRows.push([String(i+1).padStart(3), w, freq[w].toLocaleString(), pct + '%', status]);
    tableColors.push(['dim','white','cyan','dim', statusColor]);
  });
  printTable(['#', 'Word', 'Count', 'Freq%', 'Status'], tableRows, tableColors);

  var top500 = new Set(sorted.slice(0, 500));
  var cov    = 0;
  Object.keys(freq).forEach(function (w) { if (top500.has(w)) cov += freq[w]; });
  console.log('');
  printInfo('Top 500 words cover ' + co('yellow', ((cov/totalWords)*100).toFixed(1)+'%') + ' of corpus tokens');
  printInfo('Genuinely new words that can be added: ' + co('green', genuineNew.length.toString()));
  printInfo('Recommended --top value: ' + co('cyan', Math.min(genuineNew.length, CUSTOM_CAPACITY).toString()));
  console.log('');
  process.exit(0);
}

/* ═══════════════════════════════════════════════════════════════
 *  COMMAND: build
 * ═══════════════════════════════════════════════════════════════ */
printSectionHeader('WORD VERIFICATION');
console.log('');
printInfo('Checking each word against built-in dictionary and suffix stems...');
console.log('');

var accepted  = [];   /* words that passed all checks */
var rejBultin = [];   /* rejected: in built-in dict */
var rejStem   = [];   /* rejected: covered by stemming */
var rejFreq   = [];   /* rejected: below min freq */

sorted.forEach(function (word) {
  /* Frequency check */
  if (freq[word] < minFreq) {
    rejFreq.push(word);
    if (verbose) printSkip(co('dim', '"' + word + '"') + dim('  freq=' + freq[word] + ' < ' + minFreq + ' (below threshold)'));
    return;
  }
  /* Built-in direct match */
  var builtinTok = sx.lookup(word);
  if (builtinTok && isBuiltinToken(builtinTok)) {
    rejBultin.push(word);
    if (verbose) printWarn(co('yellow','"'+word+'"') + dim('  already built-in → ' + builtinTok));
    return;
  }
  /* Suffix stem coverage */
  var stemCover = isCoveredByStem(word, sx);
  if (stemCover) {
    rejStem.push(word);
    if (verbose) printWarn(co('yellow','"'+word+'"') + dim('  covered by stem: ' + stemCover));
    return;
  }
  /* Capacity check */
  if (accepted.length >= topN || accepted.length >= CUSTOM_CAPACITY) {
    if (verbose) printSkip(co('dim', '"' + word + '"') + dim('  skipped: custom dict full'));
    return;
  }
  /* ACCEPTED */
  accepted.push(word);
  if (verbose) printSuccess(co('green', '"' + word + '"') + dim('  freq=' + freq[word] + '  new word'));
});

/* Show summary */
console.log('  ' + progressBar(accepted.length, Math.min(topN, CUSTOM_CAPACITY)));
console.log('');
printRow('Total unique words scanned', sorted.length.toLocaleString(),         'white');
printRow('Rejected: already built-in', co('yellow', rejBultin.length.toString()), 'white');
printRow('Rejected: covered by stems', co('yellow', rejStem.length.toString()),   'white');
printRow('Accepted for custom dict',   co('green',  accepted.length.toString()),   'white');

if (accepted.length === 0) {
  console.log('');
  printWarn('No new words to add. Your corpus is fully covered by the built-in dictionary.');
  printInfo('Try a more specialised corpus (medical, legal, technical logs, etc.)');
  process.exit(0);
}

/* Sort alphabetically for deterministic token assignment */
accepted.sort();

/* Assign custom tokens in ~[o-z] range */
var encMap = {};
var decMap = {};
var tokenList = [];
accepted.forEach(function (word, i) {
  var tok = customTokenFor(i);
  encMap[word] = tok;
  decMap[tok]  = word;
  tokenList.push({ word: word, token: tok, freq: freq[word] });
});

/* Preview table */
printSectionHeader('CUSTOM TOKENS ASSIGNED');
console.log('');
var previewRows   = [];
var previewColors = [];
var showCount     = Math.min(tokenList.length, 20);
tokenList.slice(0, showCount).forEach(function (entry) {
  var saved = entry.word.length - entry.token.length;
  previewRows.push([entry.word, entry.token, entry.freq.toLocaleString(), '+' + saved + ' chars']);
  previewColors.push(['white', 'green', 'cyan', 'yellow']);
});
if (tokenList.length > 20) {
  previewRows.push(['... and ' + (tokenList.length - 20) + ' more', '', '', '']);
  previewColors.push(['dim','dim','dim','dim']);
}
printTable(['Word', 'Token', 'Freq', 'Saves'], previewRows, previewColors);

/* Write JSON */
var output = {
  name:        'symblex-custom',
  version:     '1.0.0',
  generated:   new Date().toISOString(),
  creator:     'Prapan Biswas — https://github.com/prapanbiswas/symblex',
  sources:     inputs,
  total:       accepted.length,
  token_range: {
    start:    customTokenFor(0),
    end:      customTokenFor(accepted.length - 1),
    note:     'Custom tokens always start with ~[o-z]. Built-in tokens use ~[0-n]. No collision possible.'
  },
  rules: {
    min_word_length:     minLen,
    min_frequency:       minFreq,
    builtin_overlap:     'rejected',
    stem_overlap:        'rejected',
    capacity:            CUSTOM_CAPACITY
  },
  encode: encMap,
  decode: decMap
};

fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

/* Final summary */
printSectionHeader('BUILD COMPLETE');
console.log('');
printRow('Output file',     co('green', path.resolve(outFile)));
printRow('Words added',     co('green', accepted.length.toString()));
printRow('Token range',     co('green', customTokenFor(0) + '  →  ' + customTokenFor(accepted.length - 1)));
printRow('Rejected words',  co('yellow', (rejBultin.length + rejStem.length).toString()) + dim(' (already covered — not wasted, just unnecessary)'));
printDivider();
printInfo('Place ' + bold(path.basename(outFile)) + ' in the same folder as symblex.js');
printInfo('It will auto-load next time Symblex starts in Node.js');
printInfo('Browser: call ' + bold('Symblex.loadCustomDict(dict)') + ' manually after fetching the file');
console.log('');

/* Estimate coverage improvement */
var customSet  = new Set(accepted);
var baseHits   = 0;
var customHits = 0;
Object.keys(freq).forEach(function (w) {
  var count = freq[w];
  if (sx.lookup(w))   baseHits   += count;
  if (customSet.has(w)) customHits += count;
});
var total = Object.values(freq).reduce(function (a, b) { return a + b; }, 0);
var basePct   = total > 0 ? ((baseHits   / total) * 100).toFixed(1) : '0.0';
var customPct = total > 0 ? (((baseHits + customHits) / total) * 100).toFixed(1) : '0.0';

printSectionHeader('COVERAGE ESTIMATE');
console.log('');
printRow('Built-in coverage alone',  co('yellow', basePct + '%')   + dim(' of your corpus tokens'));
printRow('With custom dict added',   co('green',  customPct + '%') + dim(' of your corpus tokens'));
printRow('Improvement',              co('cyan', '+' + (parseFloat(customPct)-parseFloat(basePct)).toFixed(1) + '%'));
console.log('');
