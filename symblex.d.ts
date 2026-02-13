/**
 * Symblex — Symbolic Word Compression Library
 * TypeScript Type Definitions
 *
 * Creator  : Prapan Biswas
 * GitHub   : https://github.com/prapanbiswas/symblex
 * License  : Apache-2.0
 *
 * Usage in TypeScript / Next.js:
 *   import Symblex from './symblex';
 *   const encoded: string = Symblex.encode('working together toward freedom');
 */

export interface SymblexStats {
  /** Character count of the original input */
  original: number;
  /** Character count of text-encoded output */
  textEncoded: number;
  /** Character count of binary base64url output */
  binaryEncoded: number;
  /** Characters saved by text encoding */
  savedText: number;
  /** Characters saved by binary encoding */
  savedBinary: number;
  /** Text compression ratio e.g. "39.7%" */
  ratioText: string;
  /** Binary compression ratio e.g. "61.2%" */
  ratioBinary: string;
  /** Number of 4+ character words found in input */
  wordsScanned: number;
  /** Words compressed via direct dictionary lookup */
  dictHits: number;
  /** Words compressed via suffix stemming */
  stemHits: number;
  /** Total compressed words (dictHits + stemHits) */
  totalHits: number;
  /** Percentage of scanned words that were compressed */
  hitRate: string;
  /** Whether a custom dictionary was loaded */
  customDictLoaded: boolean;
  /** Number of custom words loaded */
  customWords: number;
  /** The text-encoded output string */
  encodedOutput: string;
}

export interface SymblexRuntime {
  /** Runtime environment: "node" | "browser" | "deno" | "webworker" | "unknown" */
  environment: 'node' | 'browser' | 'deno' | 'webworker' | 'unknown';
  /** Operating system platform */
  platform: string;
  /** Node.js version string (null in browser) */
  nodeVersion: string | null;
  /** Browser user agent string (null in Node.js) */
  userAgent: string | null;
  /** Symblex library version */
  version: string;
  /** Library author */
  author: string;
  /** GitHub repository URL */
  github: string;
  /** SPDX license identifier */
  license: string;
  /** Total words in active dictionary */
  dictionarySize: number;
  /** Whether a custom dictionary file was loaded */
  customDictLoaded: boolean;
  /** Number of custom words in active dictionary */
  customWords: number;
  /** ISO 8601 timestamp of this runtime() call */
  timestamp: string;
}

export interface SymblexCustomDict {
  encode: Record<string, string>;
  decode?: Record<string, string>;
  [key: string]: unknown;
}

declare const Symblex: {
  /**
   * Compress common English words to short URL-safe tokens.
   *
   * - Dictionary words (4+ chars) → 3-char token  e.g. "freedom" → "~7N"
   * - Stem words (derived via suffix) → 4-char token  e.g. "developing" → "~Fle"
   * - All other text passes through unchanged
   * - Non-Latin characters, emoji, numbers: passed through unchanged
   * - null / undefined / non-string: safely coerced, never throws
   *
   * @param input Any value — auto-coerced to string
   * @returns Compressed string with ~XX tokens
   *
   * @example
   * Symblex.encode('working together toward freedom');
   * // → "~ng ~kQ ~l6 ~7N"
   *
   * Symblex.encode('WORKING TOGETHER');  // case-insensitive
   * // → "~ng ~kQ"
   *
   * Symblex.encode('你好 🚀 12345');      // non-English: pass through
   * // → "你好 🚀 12345"
   */
  encode(input: unknown): string;

  /**
   * Expand Symblex tokens back to original words.
   *
   * - Handles both standard tokens (~XX) and suffix tokens (~XXX)
   * - Unknown tokens pass through unchanged
   * - Never throws regardless of input
   *
   * @param input Symblex-encoded string
   * @returns Decoded plain text
   *
   * @example
   * Symblex.decode('~ng ~kQ ~l6 ~7N');
   * // → "working together toward freedom"
   */
  decode(input: unknown): string;

  /**
   * Encode text and replace spaces with + for URL query parameters.
   * Tilde (~) and base-62 chars are RFC 3986 unreserved — never %-encoded.
   *
   * @example
   * const url = 'https://mysite.com/?q=' + Symblex.encodeToURL('people working');
   * // → "https://mysite.com/?q=~dE+~ng"
   */
  encodeToURL(input: unknown): string;

  /**
   * Reverse of encodeToURL. Handles both + and %20 as spaces.
   *
   * @example
   * Symblex.decodeFromURL('~dE+~ng+for+~7N');
   * // → "people working for freedom"
   */
  decodeFromURL(input: unknown): string;

  /**
   * Binary-pack text to a minimal bit stream, output as URL-safe base64url.
   * This is the most compact output format — 40–65% smaller than the original.
   *
   * Output characters: [A-Za-z0-9-_] — RFC 3986 unreserved, zero %-encoding.
   *
   * @example
   * const b64 = Symblex.packToBase64url('working together toward freedom');
   * // → "WiyhmUcw8b_4"   (12 chars vs 31 original)
   */
  packToBase64url(input: unknown): string;

  /**
   * Unpack a base64url binary string back to the original text.
   *
   * @example
   * Symblex.unpackFromBase64url('WiyhmUcw8b_4');
   * // → "working together toward freedom"
   */
  unpackFromBase64url(input: unknown): string;

  /**
   * Return a detailed compression statistics object.
   *
   * @example
   * Symblex.stats('working together toward freedom');
   * // → { original: 31, textEncoded: 16, binaryEncoded: 12, ... }
   */
  stats(input: unknown): SymblexStats;

  /**
   * Return the token for a word (checking dictionary and stemming).
   * Returns null if the word is not compressible.
   *
   * @example
   * Symblex.lookup('freedom');     // → "~7N"
   * Symblex.lookup('developing');  // → "~Fle" (stem)
   * Symblex.lookup('xyz');         // → null
   */
  lookup(word: string): string | null;

  /**
   * Return the word for a token.
   * Returns null for unknown tokens.
   *
   * @example
   * Symblex.reverse('~7N');   // → "freedom"
   * Symblex.reverse('~Fle');  // → "developing"
   */
  reverse(token: string): string | null;

  /**
   * Return all base dictionary words sorted alphabetically.
   *
   * @example
   * Symblex.list().slice(0, 3);  // → ["abandon", "ability", "able"]
   * Symblex.list().length;        // → 1468
   */
  list(): string[];

  /**
   * Load a custom dictionary object (for browser use).
   * In Node.js, place symblex-custom.json next to symblex.js instead.
   *
   * @param dict Object with encode/decode maps
   * @returns true if loaded successfully
   *
   * @example
   * const myDict = await fetch('/symblex-custom.json').then(r => r.json());
   * Symblex.loadCustomDict(myDict);
   */
  loadCustomDict(dict: SymblexCustomDict): boolean;

  /**
   * Return information about the current runtime environment.
   * Use this to verify the library loaded, detect platform,
   * and check if a custom dictionary is active.
   *
   * @example
   * const info = Symblex.runtime();
   * console.log(info.environment);  // "node" | "browser" | ...
   * console.log(info.author);       // "Prapan Biswas"
   */
  runtime(): SymblexRuntime;

  /** Library version string */
  readonly VERSION: string;
  /** Author name */
  readonly AUTHOR: string;
  /** GitHub repository URL */
  readonly GITHUB: string;
  /** SPDX license identifier */
  readonly LICENSE: string;
  /** Total words in the active dictionary */
  readonly DICTIONARY_SIZE: number;
};

export default Symblex;
export = Symblex;
