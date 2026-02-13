<!--
  Symblex — Symbolic Word Compression Library
  Creator : Prapan Biswas
  GitHub  : https://github.com/prapanbiswas/symblex
  License : Apache-2.0
-->

<div align="center">

# Symblex

**URL-safe word compression — hardcoded dictionary + custom extension — crash-proof**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.1.0-brightgreen.svg)](https://github.com/prapanbiswas/symblex)
[![JS](https://img.shields.io/badge/JavaScript-native-yellow.svg)](symblex.js)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue.svg)](symblex.d.ts)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](symblex.py)

*Created by **Prapan Biswas***  
*GitHub: https://github.com/prapanbiswas/symblex*

</div>

---

## How the Whole System Works

This is the complete picture — hardcoded dictionary, custom extension, and how they connect.

```
YOUR TEXT
    │
    ▼
┌────────────────────────────────────────────────────────┐
│                  symblex.js  (the library)             │
│                                                        │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  BUILT-IN DICT   │    │   CUSTOM DICT (optional) │  │
│  │  1,468 words     │    │   up to 744 words        │  │
│  │  hardcoded in JS │    │   loaded from JSON file  │  │
│  │  tokens ~[0-n]XX │    │   tokens ~[o-z]XX        │  │
│  └──────────────────┘    └──────────────────────────┘  │
│             │                         │                │
│             └──────────┬──────────────┘                │
│                        ▼                               │
│              ┌──────────────────┐                      │
│              │  SUFFIX STEMS    │                      │
│              │  15 suffix rules │                      │
│              │  tokens ~[A-Z]XX │  (4 chars)           │
│              └──────────────────┘                      │
│                        │                               │
└────────────────────────┼───────────────────────────────┘
                         ▼
                  COMPRESSED TEXT
```

### The token space — three separate zones, zero collision

```
Base-62 alphabet: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
                  ↑                   ↑              ↑
                  index 0             index 23=n     index 24=o

ZONE 1 — Built-in words:   ~[0-9 a-n][0-9a-zA-Z]   3 chars   indices 0–1467
ZONE 2 — Suffix/stem:      ~[A-Z][0-9a-zA-Z][a-o]  4 chars   no index limit
ZONE 3 — Custom words:     ~[o-z][0-9a-zA-Z]        3 chars   indices 1500–2231

                  ┌───────────┬───────────┬───────────┐
First char after ~│  0–9, a–n │   A–Z     │   o–z     │
                  ├───────────┼───────────┼───────────┤
Token length      │  3 chars  │  4 chars  │  3 chars  │
                  ├───────────┼───────────┼───────────┤
Type              │ BUILT-IN  │  SUFFIX   │  CUSTOM   │
                  ├───────────┼───────────┼───────────┤
Capacity          │  1,468    │unlimited  │   732     │
                  └───────────┴───────────┴───────────┘
```

Built-in tokens only ever reach first-char index 23 (`n`). Custom tokens start at index 24 (`o`). This boundary is mathematical — no runtime checks, no configuration, **zero collision is guaranteed forever**.

---

## The Hardcoded Dictionary

The 1,468 most common English words are hardcoded **directly inside `symblex.js`** as two JavaScript objects:

```js
// Inside symblex.js (auto-generated, do not edit manually)
var _SX_ENCODE = {
  "abandon": "~00",   "ability": "~01",   "able": "~02",
  "about":   "~04",   "accept":  "~05",   /* ... 1,468 total */
  "zone":    "~nF"    // last word, index 1467
};

var _SX_DECODE = {
  "~00": "abandon",   "~01": "ability",   "~02": "able",
  /* ... reverse map ... */
  "~nF": "zone"
};
```

These are **looked up in O(1) time** — one hash map operation per word. The library never reads any file, never does any I/O, and never blocks. It is as fast as a JavaScript object property access.

---

## How the Suffix/Stem System Works

The stem engine handles words that are **not in the dictionary but are derived from a word that is**.

```
Input word: "developing"

Step 1 — Not in dict? Check suffix strip table:
  Try: "developing".endsWith("tion") → no
  Try: "developing".endsWith("ness") → no
  Try: "developing".endsWith("ing")  → YES
  
Step 2 — Remove suffix: "develop"
  Is "develop" in built-in dict? → YES → token ~5l

Step 3 — Build suffix token:
  ~[first char from root index][second char][suffix code]
  "develop" is at index 357 → floor(357/62)=5 → B62[5]="5"
                              357 % 62     =47 → B62[47]="l"
  suffix code for -ing (no e-drop) = "e"
  → token: ~5le   (4 chars, starts with uppercase... wait ~Fle)
```

Token result: `developing → ~Fle` (saves 7 chars)

The 15 suffix rules:

| Code | Suffix | E-drop | Example |
|------|--------|--------|---------|
| `a` | -s | no | `works → work + s` |
| `b` | -es | no | `matches` |
| `c` | -ed | no | `worked` |
| `d` | -ed | **yes** | `loved ← love` |
| `e` | -ing | no | `working` |
| `f` | -ing | **yes** | `loving ← love` |
| `g` | -er | no | `stronger` |
| `h` | -er | **yes** | `writer ← write` |
| `i` | -ers | no | `workers` |
| `j` | -ly | no | `carefully` |
| `k` | -ness | no | `kindness` |
| `l` | -ment | no | `movement` |
| `m` | -ful | no | `helpful` |
| `n` | -less | no | `harmless` |
| `o` | -tion | no | `action` |

---

## How Custom Dictionaries Work

### The problem custom dicts solve

The built-in dictionary has 1,468 *general* English words. If your application uses specialised vocabulary — medical, technical, legal — those words will not be in the dictionary and will pass through uncompressed.

```
"patient diagnosis treatment protocol"
→ "patient diagnosis treatment protocol"    ← nothing compressed!
```

A custom dictionary adds your specific words into the compression system.

### How a custom word gets its code

The CLI scans your text files, counts frequency, and assigns codes from the **custom zone** (`~[o-z]XX`) in alphabetical order:

```
Step 1 — Scan your files:
  "patient"   appeared 4,820 times
  "diagnosis" appeared 2,870 times
  "treatment" appeared 2,610 times
  ...

Step 2 — Verify each word:
  Is "patient" in built-in dict?    → NO  → accept
  Is "diagnosis" in built-in dict?  → NO  → accept
  Is "treatment" in built-in dict?  → NO  → accept
  Is "working" in built-in dict?    → YES → REJECT (already covered)
  Is "developing" coverable by stem? → YES → REJECT (stem covers it)

Step 3 — Sort accepted words alphabetically:
  diagnosis, patient, treatment, ...

Step 4 — Assign tokens starting at index 1500:
  diagnosis  → index 1500 → ~oc
  patient    → index 1501 → ~od
  treatment  → index 1502 → ~oe
  ...

Step 5 — Write symblex-custom.json:
  {
    "encode": { "diagnosis": "~oc", "patient": "~od", ... },
    "decode": { "~oc": "diagnosis", "~od": "patient", ... }
  }
```

### How symblex.js loads the custom dict

```
On startup (Node.js):
  ┌─────────────────────────────────────────────────────┐
  │  1. Library loads, built-in dict is always present  │
  │  2. Check: does "symblex-custom.json" exist         │
  │     in the same directory as symblex.js?            │
  │     YES → load and merge into _SX_ENCODE/_SX_DECODE │
  │     NO  → continue with built-in only               │
  │  3. Console message: "[Symblex] Custom dictionary   │
  │     loaded: /path/to/symblex-custom.json (N words)" │
  └─────────────────────────────────────────────────────┘
```

After loading, `encode()` and `decode()` work identically for both built-in and custom words — the caller never needs to know which dictionary a word came from.

```js
// After custom dict loaded:
Symblex.encode("patient diagnosis treatment");
// → "~od ~oc ~oe"    ← custom tokens ~[o-z]
Symblex.decode("~od ~oc ~oe");
// → "patient diagnosis treatment"   ← perfect roundtrip
```

### What happens if the custom JSON file is missing or broken

Nothing crashes. The library logs nothing and continues working with the built-in dictionary only. Every public method is crash-proof regardless of custom dict state.

---

## Installation

```bash
git clone https://github.com/prapanbiswas/symblex.git
cd symblex
```

No `npm install` needed. The library has **zero dependencies**.

---

## JavaScript Usage

```js
// Node.js
const Symblex = require('./symblex');

// Encode / decode
Symblex.encode('working together toward freedom');
// → "~ng ~kQ ~l6 ~7N"

Symblex.decode('~ng ~kQ ~l6 ~7N');
// → "working together toward freedom"

// URL-safe (spaces → +)
const q = Symblex.encodeToURL('people working for freedom');
// → "~dE+~ng+for+~7N"
const url = 'https://mysite.com/?q=' + q;

Symblex.decodeFromURL('~dE+~ng+for+~7N');
// → "people working for freedom"

// Binary pack — smallest possible form
Symblex.packToBase64url('working together toward freedom');
// → "WiyhmUcw8b_4"   (12 chars vs 31 original)

Symblex.unpackFromBase64url('WiyhmUcw8b_4');
// → "working together toward freedom"

// Stats
Symblex.stats('developing stronger businesses working together');
// → { ratioText: "56.5%", hitRate: "100.0%", ... }

// Where is Symblex running?
Symblex.runtime();
// → { environment: "node", author: "Prapan Biswas", dictionarySize: 1468, ... }
```

### Browser

```html
<script src="symblex.js"></script>
<script>
  Symblex.encode('working together');   // "~ng ~kQ"
  
  // Load custom dict in browser (no auto-load in browser)
  fetch('/static/symblex-custom.json')
    .then(r => r.json())
    .then(dict => Symblex.loadCustomDict(dict));
</script>
```

---

## TypeScript / Next.js Usage

```ts
import Symblex from './symblex';
import type { SymblexStats, SymblexRuntime } from './symblex';

// Next.js API Route
export default function handler(req, res) {
  const encoded: string       = Symblex.encode(req.query.text as string);
  const s:       SymblexStats = Symblex.stats(req.query.text as string);
  res.json({ encoded, ratio: s.ratioText });
}

// Next.js App Router
export async function GET(req: Request) {
  const url     = new URL(req.url);
  const text    = url.searchParams.get('q') ?? '';
  const encoded = Symblex.encodeToURL(text);
  return Response.json({ encoded });
}

// Client component
'use client';
import Symblex from '@/lib/symblex';
const enc = Symblex.encode(userInput);   // safe to call on any input
```

---

## Python Usage

```python
from symblex import Symblex

sx = Symblex()   # auto-loads symblex-custom.json if present

sx.encode("working together toward freedom")
# → "~ng ~kQ ~l6 ~7N"

sx.decode("~ng ~kQ ~l6 ~7N")
# → "working together toward freedom"

sx.encode_to_url("people working for freedom")
# → "~dE+~ng+for+~7N"

sx.stats("developing stronger businesses")
# → { "ratio_text": "53.2%", "hit_rate": "100.0%", ... }

sx.runtime()
# → { "environment": "python", "author": "Prapan Biswas", ... }

# CLI
# python symblex.py encode "working together toward freedom"
# python symblex.py stats  "your text here"
# python symblex.py runtime
```

---

## API Reference

| Method | Input | Output | Notes |
|---|---|---|---|
| `encode(input)` | any | string | Never throws |
| `decode(input)` | any | string | Never throws |
| `encodeToURL(input)` | any | string | Spaces → `+` |
| `decodeFromURL(input)` | any | string | `+` and `%20` → space |
| `packToBase64url(input)` | any | string | Binary, most compact |
| `unpackFromBase64url(input)` | any | string | Reverses pack |
| `stats(input)` | any | object | Full compression report |
| `runtime()` | — | object | Platform, author, dict info |
| `lookup(word)` | string | string\|null | Token for one word |
| `reverse(token)` | string | string\|null | Word for one token |
| `list()` | — | string[] | All 1,468 base words |
| `loadCustomDict(dict)` | object | boolean | Browser use |

### `runtime()` return object

```js
{
  environment:      "node",    // "node" | "browser" | "deno" | "webworker"
  platform:         "linux",
  nodeVersion:      "v20.11.0",
  version:          "3.1.0",
  author:           "Prapan Biswas",
  github:           "https://github.com/prapanbiswas/symblex",
  license:          "Apache-2.0",
  dictionarySize:   1470,      // built-in + custom words
  customDictLoaded: true,
  customWords:      2,
  timestamp:        "2024-01-15T12:00:00.000Z"
}
```

### `stats()` return object

```js
{
  original:          96,
  textEncoded:       57,    // text token compressed length
  binaryEncoded:     35,    // base64url binary length
  savedText:         39,
  savedBinary:       61,
  ratioText:         "40.6%",
  ratioBinary:       "63.5%",
  wordsScanned:      10,    // words with 4+ chars found
  dictHits:          3,     // compressed by built-in dict
  stemHits:          6,     // compressed by suffix stem
  totalHits:         9,
  hitRate:           "90.0%",
  customDictLoaded:  true,
  customWords:       2,
  encodedOutput:     "~Fle ~Tng ..."
}
```

---

## Custom Dictionary — Full Workflow

### Step 1 — Prepare your text files

Only `.txt` and `.md` files are accepted. Put your domain text in them:

```
medical-records.txt    patient notes, diagnoses, clinical summaries
legal-docs.md          contracts, clauses, legal terminology
server-logs.txt        log messages, error descriptions
```

### Step 2 — Analyse your corpus first

```bash
node symblex-cli.js analyse --input medical-records.txt legal-docs.md
```

The CLI shows you:
- How many words appear in your files
- Which ones are already covered by the built-in dict or stems (will be rejected)
- How many genuinely new words you have
- The recommended `--top` value

### Step 3 — Build the custom dictionary

```bash
node symblex-cli.js build --input medical-records.txt legal-docs.md
```

What happens during build:

```
For each word in your corpus (sorted by frequency):

  ┌──────────────────────────────────────────────────┐
  │  Word: "diagnosis"                                │
  │                                                  │
  │  1. Is it in the built-in dictionary?            │
  │     → NO → continue                             │
  │                                                  │
  │  2. Can it be formed from a built-in word        │
  │     by adding a suffix?                          │
  │     → NO → continue                             │
  │                                                  │
  │  3. Is it below --minfreq threshold?             │
  │     → NO (appears 2,870 times) → continue       │
  │                                                  │
  │  4. Is it below --minlen characters?             │
  │     → NO (9 chars) → continue                   │
  │                                                  │
  │  5. Is the custom dict full? (max 732)           │
  │     → NO → ACCEPT                               │
  │                                                  │
  │  Assigned token: ~oc  (saves 6 chars)            │
  └──────────────────────────────────────────────────┘

  Word: "working"
  ┌──────────────────────────────────────────────────┐
  │  1. Is it in the built-in dictionary?            │
  │     → YES (~ng exists)                           │
  │     → REJECTED — already covered                 │
  └──────────────────────────────────────────────────┘

  Word: "diagnosed"
  ┌──────────────────────────────────────────────────┐
  │  1. In built-in dict? → NO                       │
  │  2. Can stem handle it?                          │
  │     "diagnosed".endsWith("ed") → root="diagnose"│
  │     Is "diagnose" in dict? → NO                 │
  │     e-drop: "diagnos" + e = "diagnose" → NO     │
  │     → NOT covered by stem → ACCEPT              │
  │  Assigned token: ~od                             │
  └──────────────────────────────────────────────────┘
```

### Step 4 — Place the JSON file next to symblex.js

```
your-project/
├── symblex.js              ← library
├── symblex-custom.json     ← your custom dict (auto-loaded)
└── app.js
```

That's it. No code changes. No configuration. Next time your app starts, you'll see:

```
[Symblex] Custom dictionary loaded: /your/path/symblex-custom.json (47 custom words)
```

### Step 5 — Verify your custom dict

```bash
node symblex-cli.js verify symblex-custom.json
```

Checks every entry for:
- Valid token format (`~[o-z]XX` range)
- No collision with built-in zone
- Presence of reverse `decode` entries

### Options for build

```bash
# Basic
node symblex-cli.js build --input corpus.txt

# Multiple files
node symblex-cli.js build --input file1.txt file2.md report.txt

# Custom output location
node symblex-cli.js build --input corpus.txt --out my-medical-dict.json

# Limit size (e.g. only top 100 words)
node symblex-cli.js build --input corpus.txt --top 100

# Higher frequency threshold (only include words appearing 5+ times)
node symblex-cli.js build --input corpus.txt --minfreq 5

# Show every word decision
node symblex-cli.js build --input corpus.txt --verbose
```

---

## The `symblex-custom.json` Format

```json
{
  "name": "symblex-custom",
  "version": "1.0.0",
  "generated": "2024-01-15T12:00:00.000Z",
  "creator": "Prapan Biswas — https://github.com/prapanbiswas/symblex",
  "sources": ["medical.txt", "legal.md"],
  "total": 47,
  "token_range": {
    "start": "~oc",
    "end": "~qQ",
    "note": "Custom tokens always start with ~[o-z]. Built-in tokens use ~[0-n]. No collision possible."
  },
  "rules": {
    "min_word_length": 4,
    "min_frequency": 2,
    "builtin_overlap": "rejected",
    "stem_overlap": "rejected",
    "capacity": 732
  },
  "encode": {
    "diagnosis":  "~oc",
    "patient":    "~od",
    "treatment":  "~oe"
  },
  "decode": {
    "~oc": "diagnosis",
    "~od": "patient",
    "~oe": "treatment"
  }
}
```

You can also write a `symblex-custom.json` by hand. As long as:
- Tokens start with `~[o-z]` (first char after `~` is letter `o` through `z`)
- Words are 4+ characters and not already in the built-in dictionary
- Both `encode` and `decode` maps are present

The library will load it correctly. Use `verify` to check it first.

---

## Input Safety — What Never Crashes

```
encode(null)            → ""
encode(undefined)       → ""
encode("")              → ""
encode(0)               → "0"
encode(123)             → "123"
encode(true)            → compressed "true"
encode("你好 世界")     → "你好 世界"    (passed through)
encode("مرحبا")         → "مرحبا"       (passed through)
encode("🚀 working")    → "🚀 ~ng"      (emoji through, word compressed)
encode("WORKING")       → "~ng"         (case-insensitive)
encode("work2023ing")   → "~ne2023ing"  (word part compresses, number stays)
decode("~ZZ unknown")   → "~ZZ unknown" (unknown token passes through)
decode(null)            → ""
```

**The library never throws an exception**, regardless of what you pass in.

---

## Token Format Reference

```
Standard (built-in word):   ~ [0-9a-n] [0-9a-zA-Z]          → 3 chars
Suffix (stem word):         ~ [A-Z]    [0-9a-zA-Z] [a-o]    → 4 chars
Custom word:                ~ [o-z]    [0-9a-zA-Z]          → 3 chars

All characters after ~ are from base-62: 0-9 a-z A-Z
Tilde (~) = RFC 3986 unreserved — NEVER percent-encoded in URLs
```

---

## Files in This Repository

```
symblex/
├── symblex.js          Core library — Node.js, browser, ESM, AMD
├── symblex.d.ts        TypeScript type definitions
├── symblex.py          Python 3.8+ port — identical API
├── symblex-cli.js      Custom dictionary builder CLI
├── symblex-dict.json   Base dictionary in JSON (for tooling)
├── README.md           This file
└── LICENSE             Apache License 2.0
```

---

## License

This software is licensed under the **Apache License 2.0**.

```
Copyright 2024 Prapan Biswas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```

---

<div align="center">

**Symblex** — Created by [Prapan Biswas](https://github.com/prapanbiswas/symblex)

[GitHub](https://github.com/prapanbiswas/symblex) · [Issues](https://github.com/prapanbiswas/symblex/issues) · Apache License 2.0

*Every word earns its space.*

</div>
