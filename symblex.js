/**
 * ============================================================
 *  SYMBLEX — Symbolic Word Compression Library
 * ============================================================
 *  Creator  : Prapan Biswas
 *  Version  : 3.0.0
 *  License  : Apache License 2.0
 *  GitHub   : https://github.com/prapanbiswas/symblex
 * ============================================================
 *  Copyright 2024 Prapan Biswas
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific
 *  language governing permissions and limitations under the License.
 * ============================================================
 *
 *  WHAT IS SYMBLEX?
 *  ────────────────
 *  Symblex compresses common English words into short 3–4 character
 *  URL-safe tokens using a hardcoded dictionary of 1,468 words plus
 *  a stemming engine that handles word suffixes.
 *
 *  THREE COMPRESSION LAYERS:
 *    Layer 1 — Direct dictionary   "freedom"   → "~7N"    (3 chars)
 *    Layer 2 — Suffix stemming     "developing"→ "~Fle"   (4 chars)
 *    Layer 3 — Binary base64url    text → bit-packed base64url string
 *
 *  WHAT IS SUPPORTED:
 *  ────────────────────────────────────────────────────────────
 *  Input type           Behaviour
 *  ─────────────────    ──────────────────────────────────────
 *  English lowercase    Compressed if in dictionary/stems
 *  English UPPERCASE    Compressed (tokens are lowercase output)
 *  Mixed Case           Compressed (case-insensitive lookup)
 *  Accented chars       Passed through unchanged (à é ü ñ …)
 *  Numbers (123)        Passed through unchanged
 *  Punctuation (.,!?)   Passed through unchanged
 *  Emoji (🚀 🎉)       Passed through unchanged
 *  Chinese / Arabic     Passed through unchanged
 *  Any other Unicode    Passed through unchanged
 *  null / undefined     Returns empty string — DOES NOT CRASH
 *  Numbers as input     Coerced to string — DOES NOT CRASH
 *  Arrays / Objects     Coerced to string — DOES NOT CRASH
 *  Empty string ""      Returns empty string
 *  ─────────────────────────────────────────────────────────
 *  The library NEVER throws. Every public method is wrapped in
 *  a safe guard. If anything unexpected happens, it returns the
 *  original input unchanged rather than crashing your app.
 *
 *  CUSTOM DICTIONARY:
 *  ────────────────────────────────────────────────────────────
 *  Place a file named  symblex-custom.json  in the SAME directory
 *  as symblex.js. The library automatically loads it on startup.
 *  Custom words are merged with the built-in dictionary.
 *  Custom dict format:
 *    { "encode": { "myword": "~ZZ" }, "decode": { "~ZZ": "myword" } }
 *
 *  QUICK START:
 *    // Node.js / CommonJS
 *    const sx = require('./symblex');
 *    sx.encode('working together toward freedom');
 *
 *    // ES Module (Next.js / TypeScript)
 *    import Symblex from './symblex.js';
 *    Symblex.encode('working together');
 *
 *    // Browser
 *    <script src="symblex.js"></script>
 *    Symblex.encode('working together');
 * ============================================================
 */

;(function (root, factory) {
  /* UMD wrapper — works in Node.js (CJS + ESM), browser, AMD */
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Symblex = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
   *  INTERNAL CONSTANTS
   * ───────────────────────────────────────────────────────── */
  var VERSION       = '3.0.0';
  var AUTHOR        = 'Prapan Biswas';
  var GITHUB        = 'https://github.com/prapanbiswas/symblex';
  var LICENSE       = 'Apache-2.0';

  var B62    = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var B62IDX = {};
  for (var _i = 0; _i < B62.length; _i++) B62IDX[B62[_i]] = _i;

  var BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

var _SX_WORDS  = [
  "abandon", "ability", "able", "aboard", "about", "above", "absence", "absolute",
  "absorb", "abstract", "abuse", "academic", "accept", "access", "accident", "accord",
  "account", "accurate", "accuse", "achieve", "acquire", "action", "active", "actual",
  "address", "adjust", "advance", "advantage", "adverse", "advice", "advise", "affect",
  "afford", "afraid", "after", "again", "against", "agency", "agenda", "agent",
  "agree", "ahead", "aimed", "alarm", "album", "alert", "alien", "align",
  "alive", "alley", "allow", "almost", "alone", "along", "already", "also",
  "alter", "although", "always", "amazing", "among", "amount", "ancient", "anger",
  "angle", "animal", "ankle", "annex", "another", "answer", "anybody", "anymore",
  "anyone", "anywhere", "apart", "appeal", "appear", "apply", "approach", "area",
  "arena", "argue", "arise", "around", "array", "article", "aside", "aspect",
  "asset", "assign", "assume", "atlas", "attach", "attack", "attend", "audit",
  "author", "avoid", "award", "away", "awful", "back", "basic", "basis",
  "batch", "battle", "beach", "beauty", "because", "been", "before", "began",
  "begin", "behind", "being", "believe", "belong", "below", "bench", "benefit",
  "best", "better", "between", "beyond", "billion", "birth", "black", "blade",
  "blame", "bland", "blank", "blast", "blaze", "bleed", "blend", "bless",
  "blind", "block", "blood", "blown", "board", "body", "book", "boost",
  "both", "bother", "bottle", "bottom", "bounce", "bound", "boxer", "brain",
  "branch", "brand", "brave", "break", "breath", "breed", "bridge", "brief",
  "bring", "broad", "broke", "broken", "brook", "brought", "brown", "brush",
  "budget", "build", "built", "bunch", "burden", "burst", "business", "button",
  "buyer", "buying", "cabin", "cable", "call", "camera", "cancel", "cannot",
  "canvas", "carbon", "care", "career", "careful", "case", "castle", "cattle",
  "caught", "center", "central", "centre", "century", "chain", "chair", "chalk",
  "chance", "change", "chaos", "chapter", "characters", "charge", "charity", "charm",
  "chart", "chase", "cheap", "check", "cheek", "cheer", "chess", "chief",
  "child", "china", "choice", "choir", "choose", "chose", "chosen", "chronic",
  "chunk", "cinema", "circle", "citizen", "city", "civic", "civil", "claim",
  "class", "clause", "clean", "clear", "clearly", "clerk", "click", "cliff",
  "climate", "climb", "close", "closet", "cloud", "club", "coast", "coffee",
  "collar", "color", "column", "combat", "come", "comfort", "comic", "comma",
  "comment", "commit", "common", "commonly", "company", "compare", "complex", "concept",
  "conduct", "confirm", "contact", "content", "contest", "control", "coral", "correct",
  "cost", "cotton", "could", "count", "country", "county", "couple", "course",
  "court", "cover", "crack", "craft", "crane", "crash", "crazy", "cream",
  "create", "credit", "creek", "crime", "cross", "crowd", "crown", "cruise",
  "crush", "culture", "current", "curve", "cycle", "daily", "damage", "dance",
  "dark", "data", "datum", "days", "deal", "dealing", "dear", "death",
  "debate", "debut", "decide", "decided", "decor", "deep", "defend", "defense",
  "define", "degree", "delay", "delta", "demand", "dense", "depot", "depth",
  "derby", "despite", "detail", "develop", "devil", "differ", "digital", "dinner",
  "direct", "dirty", "discuss", "disease", "distant", "ditch", "divide", "divided",
  "does", "dollar", "donate", "double", "doubt", "dough", "down", "draft",
  "drain", "drama", "drawn", "dream", "drink", "drive", "driving", "drove",
  "dusky", "dusty", "dynamic", "each", "eager", "early", "earth", "easily",
  "economy", "effect", "effort", "eight", "either", "element", "elite", "else",
  "email", "embrace", "emotion", "empty", "enable", "ending", "ends", "enemy",
  "energy", "engine", "english", "enhance", "enjoy", "enough", "ensure", "enter",
  "entire", "entry", "equal", "error", "escape", "essay", "estate", "even",
  "event", "ever", "every", "evolve", "exact", "example", "exceed", "exclude",
  "excluding", "execute", "exhaust", "exist", "expect", "expire", "explore", "export",
  "express", "extend", "extra", "extreme", "face", "fact", "factor", "fail",
  "faint", "fair", "faith", "fall", "false", "family", "famous", "fancy",
  "fast", "fatal", "feast", "federal", "feel", "feeling", "feet", "female",
  "fence", "fewer", "field", "fifth", "fight", "figure", "file", "fill",
  "final", "finance", "find", "finger", "fire", "firm", "first", "five",
  "fixed", "flame", "flash", "fleet", "flesh", "float", "floor", "flour",
  "flown", "focus", "follow", "food", "foot", "force", "forest", "forge",
  "form", "format", "forward", "foster", "found", "four", "fourth", "frame",
  "frank", "fraud", "free", "freedom", "frequently", "fresh", "friend", "from",
  "front", "frost", "frozen", "fruit", "full", "fully", "fund", "funny",
  "future", "game", "garden", "gate", "gave", "gear", "gender", "general",
  "genuine", "getting", "giant", "girl", "give", "given", "giving", "glad",
  "glare", "glass", "global", "globe", "glory", "glove", "goal", "goes",
  "going", "gold", "golden", "gone", "good", "grace", "grade", "grain",
  "grand", "grant", "grasp", "grass", "grave", "great", "green", "greet",
  "grief", "grind", "groan", "gross", "ground", "group", "grove", "grow",
  "growth", "guard", "guess", "guest", "guide", "guild", "guilt", "guise",
  "gulf", "gusto", "half", "hall", "hand", "happy", "hard", "hardly",
  "harm", "harsh", "have", "head", "health", "heart", "heat", "heavy",
  "height", "held", "help", "here", "hero", "hidden", "high", "hill",
  "hint", "hold", "hole", "home", "honest", "hope", "hotel", "hour",
  "hourly", "house", "however", "huge", "human", "humor", "hundred", "hunger",
  "hurry", "idea", "image", "imagine", "impact", "imply", "import", "improve",
  "inch", "include", "income", "indeed", "index", "initial", "inject", "injure",
  "inner", "input", "insist", "instant", "integer", "intense", "intent", "into",
  "invest", "iron", "island", "issue", "items", "itself", "join", "joined",
  "judge", "juice", "juicy", "jump", "jungle", "junior", "just", "justice",
  "keep", "keeping", "kind", "king", "kingdom", "know", "knowing", "known",
  "label", "land", "language", "laser", "last", "late", "latest", "laugh",
  "launch", "layer", "lead", "leader", "league", "lean", "learn", "lease",
  "leave", "left", "legal", "lemon", "less", "lessen", "letter", "level",
  "life", "light", "like", "limit", "line", "linen", "liner", "link",
  "liquid", "list", "listen", "little", "live", "liver", "living", "load",
  "loan", "local", "locate", "lock", "lodge", "loft", "logic", "long",
  "longer", "look", "looked", "loose", "lose", "losing", "loss", "lost",
  "loud", "love", "lower", "loyal", "luck", "lucky", "lure", "luxury",
  "made", "magic", "mail", "main", "major", "make", "maker", "manage",
  "manor", "manual", "maple", "march", "mark", "market", "mass", "match",
  "math", "matter", "mayor", "mean", "media", "meet", "member", "mercy",
  "merit", "metal", "method", "middle", "mild", "mile", "mill", "mind",
  "mine", "minor", "minus", "mirror", "miss", "mixed", "mobile", "mode",
  "model", "modern", "moment", "money", "month", "mood", "moon", "moral",
  "more", "most", "mostly", "mother", "motion", "motor", "mount", "mouse",
  "mouth", "move", "movie", "much", "murder", "music", "must", "mutual",
  "myth", "naive", "name", "nation", "nature", "near", "need", "nerve",
  "never", "news", "next", "nice", "night", "nine", "noble", "noise",
  "none", "norm", "normal", "north", "note", "nothing", "notice", "novel",
  "null", "number", "nurse", "nylon", "object", "oblige", "obtain", "obvious",
  "occur", "offer", "office", "often", "okay", "once", "ongoing", "online",
  "only", "open", "openly", "opinion", "option", "oral", "orange", "order",
  "other", "ought", "ours", "outer", "outlet", "output", "outside", "over",
  "overall", "owner", "ozone", "pace", "page", "pain", "paint", "pair",
  "panel", "paper", "parent", "park", "part", "pass", "past", "path",
  "patrol", "pause", "peace", "peak", "pearl", "pedal", "people", "permit",
  "person", "phase", "phone", "photo", "phrase", "pick", "piece", "pile",
  "pilot", "pine", "pipe", "pirate", "pitch", "pixel", "pizza", "place",
  "plain", "plan", "plane", "planet", "plant", "plate", "play", "player",
  "plaza", "plead", "please", "plenty", "plot", "pluck", "plumb", "plume",
  "plus", "plush", "pocket", "point", "polar", "police", "policy", "pool",
  "poor", "popular", "port", "portal", "post", "potato", "pound", "pour",
  "power", "prefix", "present", "press", "pretty", "prevent", "prey", "price",
  "pride", "prime", "print", "prior", "prison", "prize", "probe", "problem",
  "process", "produce", "product", "profit", "program", "promise", "proof", "prose",
  "protect", "proud", "prove", "provide", "psalm", "public", "pull", "pulse",
  "pump", "pupil", "pure", "purple", "pursue", "push", "puts", "puzzle",
  "quality", "queen", "query", "quest", "queue", "quick", "quickly", "quiet",
  "quota", "quote", "race", "radar", "radio", "rage", "rain", "raise",
  "rally", "ranch", "random", "range", "rank", "rapid", "rarely", "rate",
  "razor", "reach", "read", "real", "reality", "reason", "rebel", "recap",
  "receive", "recent", "reduce", "refer", "reform", "refuse", "region", "reign",
  "related", "relax", "release", "rely", "remain", "remind", "remove", "rent",
  "repay", "repeat", "repel", "reply", "require", "rescue", "resolve", "respect",
  "respond", "rest", "restore", "return", "revenue", "review", "reward", "rich",
  "ride", "rider", "rifle", "right", "rigid", "ring", "rise", "rising",
  "risk", "risky", "rival", "river", "road", "robot", "rock", "rocket",
  "rocky", "role", "roll", "roof", "room", "root", "rose", "rouge",
  "rough", "round", "route", "rover", "royal", "rugby", "ruin", "rule",
  "ruler", "rural", "rush", "safe", "sail", "salt", "same", "sample",
  "savage", "save", "saving", "says", "scale", "scene", "science", "score",
  "scout", "seal", "second", "secret", "section", "sector", "seek", "seize",
  "select", "self", "sell", "send", "senior", "sent", "series", "serve",
  "service", "settle", "seven", "several", "shade", "shake", "shall", "shame",
  "shape", "share", "sharp", "shelf", "shell", "shift", "shirt", "shock",
  "shore", "short", "should", "shout", "side", "sight", "sign", "signal",
  "silent", "silk", "silver", "similar", "simple", "since", "sing", "single",
  "sink", "sister", "site", "sixth", "size", "sized", "skill", "skin",
  "skip", "slate", "slave", "sleep", "slice", "slide", "slope", "slow",
  "slowly", "small", "smart", "smell", "smile", "smoke", "snap", "snow",
  "society", "soft", "soil", "solar", "sold", "sole", "solid", "solve",
  "some", "somehow", "someone", "song", "soon", "sorry", "sort", "soul",
  "soup", "source", "south", "space", "span", "spare", "spark", "speak",
  "spec", "special", "speech", "speed", "spend", "spice", "spill", "spin",
  "spine", "spirit", "spit", "split", "spoke", "spook", "sport", "spot",
  "spray", "spread", "squad", "square", "stable", "stack", "staff", "stage",
  "stake", "stall", "stand", "star", "stare", "start", "started", "state",
  "static", "station", "status", "stay", "stays", "steel", "steep", "steer",
  "stem", "step", "stick", "still", "stir", "stock", "stone", "stood",
  "stop", "store", "storm", "story", "stove", "stream", "street", "strict",
  "string", "strong", "struck", "struct", "stuck", "student", "studio", "study",
  "stuff", "stunt", "stupid", "style", "subject", "submit", "success", "such",
  "sudden", "suffer", "sugar", "suit", "suite", "summer", "super", "supply",
  "support", "sure", "surface", "surge", "swamp", "swap", "swear", "sweet",
  "swift", "swing", "switch", "sword", "sync", "syrup", "table", "take",
  "tale", "talent", "talk", "tall", "target", "task", "teacher", "team",
  "tear", "tech", "tell", "test", "text", "than", "that", "their",
  "them", "then", "there", "these", "they", "thick", "thing", "think",
  "third", "this", "thorn", "those", "though", "threat", "three", "threw",
  "throat", "throw", "tick", "ticket", "tide", "tied", "ties", "tiger",
  "tight", "tile", "till", "tilt", "time", "tinker", "tiny", "tire",
  "tired", "tissue", "title", "today", "together", "token", "toll", "tomato",
  "tone", "tongue", "tonight", "took", "tool", "tops", "torn", "total",
  "totally", "touch", "tough", "tour", "toward", "towards", "towel", "town",
  "track", "trade", "trail", "train", "trait", "travel", "tree", "trend",
  "trial", "tribe", "trick", "tried", "trim", "trio", "trip", "triple",
  "trouble", "truce", "truck", "true", "truly", "trust", "truth", "tube",
  "tumor", "tune", "turn", "tutor", "twice", "twin", "type", "typical",
  "unborn", "under", "union", "unique", "unity", "until", "update", "upon",
  "upper", "upset", "upward", "urban", "usage", "used", "useful", "user",
  "usual", "usually", "utter", "valid", "value", "vary", "vast", "veil",
  "vent", "very", "video", "view", "vigil", "village", "viral", "virus",
  "visit", "visual", "vital", "vivid", "voice", "vote", "voter", "wade",
  "wait", "walk", "wall", "ward", "warm", "warn", "wars", "wash",
  "waste", "watch", "water", "wave", "ways", "weak", "wear", "weary",
  "weave", "week", "weird", "well", "were", "west", "whale", "what",
  "wheat", "wheel", "when", "where", "whether", "which", "while", "white",
  "whole", "whose", "wide", "width", "wife", "wild", "will", "wind",
  "wine", "winter", "wire", "wise", "wish", "with", "within", "without",
  "woke", "wolf", "women", "wonder", "wood", "wooden", "word", "words",
  "work", "worker", "working", "world", "worn", "worry", "worse", "worst",
  "worth", "would", "wound", "wrap", "write", "writing", "written", "wrote",
  "yacht", "yard", "year", "yellow", "young", "your", "youth", "zebra",
  "zero", "zilch", "zonal", "zone",
];
var _SX_ENCODE = {
  "abandon":"~00", "ability":"~01", "able":"~02", "aboard":"~03", "about":"~04",
  "above":"~05", "absence":"~06", "absolute":"~07", "absorb":"~08", "abstract":"~09",
  "abuse":"~0a", "academic":"~0b", "accept":"~0c", "access":"~0d", "accident":"~0e",
  "accord":"~0f", "account":"~0g", "accurate":"~0h", "accuse":"~0i", "achieve":"~0j",
  "acquire":"~0k", "action":"~0l", "active":"~0m", "actual":"~0n", "address":"~0o",
  "adjust":"~0p", "advance":"~0q", "advantage":"~0r", "adverse":"~0s", "advice":"~0t",
  "advise":"~0u", "affect":"~0v", "afford":"~0w", "afraid":"~0x", "after":"~0y",
  "again":"~0z", "against":"~0A", "agency":"~0B", "agenda":"~0C", "agent":"~0D",
  "agree":"~0E", "ahead":"~0F", "aimed":"~0G", "alarm":"~0H", "album":"~0I",
  "alert":"~0J", "alien":"~0K", "align":"~0L", "alive":"~0M", "alley":"~0N",
  "allow":"~0O", "almost":"~0P", "alone":"~0Q", "along":"~0R", "already":"~0S",
  "also":"~0T", "alter":"~0U", "although":"~0V", "always":"~0W", "amazing":"~0X",
  "among":"~0Y", "amount":"~0Z", "ancient":"~10", "anger":"~11", "angle":"~12",
  "animal":"~13", "ankle":"~14", "annex":"~15", "another":"~16", "answer":"~17",
  "anybody":"~18", "anymore":"~19", "anyone":"~1a", "anywhere":"~1b", "apart":"~1c",
  "appeal":"~1d", "appear":"~1e", "apply":"~1f", "approach":"~1g", "area":"~1h",
  "arena":"~1i", "argue":"~1j", "arise":"~1k", "around":"~1l", "array":"~1m",
  "article":"~1n", "aside":"~1o", "aspect":"~1p", "asset":"~1q", "assign":"~1r",
  "assume":"~1s", "atlas":"~1t", "attach":"~1u", "attack":"~1v", "attend":"~1w",
  "audit":"~1x", "author":"~1y", "avoid":"~1z", "award":"~1A", "away":"~1B",
  "awful":"~1C", "back":"~1D", "basic":"~1E", "basis":"~1F", "batch":"~1G",
  "battle":"~1H", "beach":"~1I", "beauty":"~1J", "because":"~1K", "been":"~1L",
  "before":"~1M", "began":"~1N", "begin":"~1O", "behind":"~1P", "being":"~1Q",
  "believe":"~1R", "belong":"~1S", "below":"~1T", "bench":"~1U", "benefit":"~1V",
  "best":"~1W", "better":"~1X", "between":"~1Y", "beyond":"~1Z", "billion":"~20",
  "birth":"~21", "black":"~22", "blade":"~23", "blame":"~24", "bland":"~25",
  "blank":"~26", "blast":"~27", "blaze":"~28", "bleed":"~29", "blend":"~2a",
  "bless":"~2b", "blind":"~2c", "block":"~2d", "blood":"~2e", "blown":"~2f",
  "board":"~2g", "body":"~2h", "book":"~2i", "boost":"~2j", "both":"~2k",
  "bother":"~2l", "bottle":"~2m", "bottom":"~2n", "bounce":"~2o", "bound":"~2p",
  "boxer":"~2q", "brain":"~2r", "branch":"~2s", "brand":"~2t", "brave":"~2u",
  "break":"~2v", "breath":"~2w", "breed":"~2x", "bridge":"~2y", "brief":"~2z",
  "bring":"~2A", "broad":"~2B", "broke":"~2C", "broken":"~2D", "brook":"~2E",
  "brought":"~2F", "brown":"~2G", "brush":"~2H", "budget":"~2I", "build":"~2J",
  "built":"~2K", "bunch":"~2L", "burden":"~2M", "burst":"~2N", "business":"~2O",
  "button":"~2P", "buyer":"~2Q", "buying":"~2R", "cabin":"~2S", "cable":"~2T",
  "call":"~2U", "camera":"~2V", "cancel":"~2W", "cannot":"~2X", "canvas":"~2Y",
  "carbon":"~2Z", "care":"~30", "career":"~31", "careful":"~32", "case":"~33",
  "castle":"~34", "cattle":"~35", "caught":"~36", "center":"~37", "central":"~38",
  "centre":"~39", "century":"~3a", "chain":"~3b", "chair":"~3c", "chalk":"~3d",
  "chance":"~3e", "change":"~3f", "chaos":"~3g", "chapter":"~3h", "characters":"~3i",
  "charge":"~3j", "charity":"~3k", "charm":"~3l", "chart":"~3m", "chase":"~3n",
  "cheap":"~3o", "check":"~3p", "cheek":"~3q", "cheer":"~3r", "chess":"~3s",
  "chief":"~3t", "child":"~3u", "china":"~3v", "choice":"~3w", "choir":"~3x",
  "choose":"~3y", "chose":"~3z", "chosen":"~3A", "chronic":"~3B", "chunk":"~3C",
  "cinema":"~3D", "circle":"~3E", "citizen":"~3F", "city":"~3G", "civic":"~3H",
  "civil":"~3I", "claim":"~3J", "class":"~3K", "clause":"~3L", "clean":"~3M",
  "clear":"~3N", "clearly":"~3O", "clerk":"~3P", "click":"~3Q", "cliff":"~3R",
  "climate":"~3S", "climb":"~3T", "close":"~3U", "closet":"~3V", "cloud":"~3W",
  "club":"~3X", "coast":"~3Y", "coffee":"~3Z", "collar":"~40", "color":"~41",
  "column":"~42", "combat":"~43", "come":"~44", "comfort":"~45", "comic":"~46",
  "comma":"~47", "comment":"~48", "commit":"~49", "common":"~4a", "commonly":"~4b",
  "company":"~4c", "compare":"~4d", "complex":"~4e", "concept":"~4f", "conduct":"~4g",
  "confirm":"~4h", "contact":"~4i", "content":"~4j", "contest":"~4k", "control":"~4l",
  "coral":"~4m", "correct":"~4n", "cost":"~4o", "cotton":"~4p", "could":"~4q",
  "count":"~4r", "country":"~4s", "county":"~4t", "couple":"~4u", "course":"~4v",
  "court":"~4w", "cover":"~4x", "crack":"~4y", "craft":"~4z", "crane":"~4A",
  "crash":"~4B", "crazy":"~4C", "cream":"~4D", "create":"~4E", "credit":"~4F",
  "creek":"~4G", "crime":"~4H", "cross":"~4I", "crowd":"~4J", "crown":"~4K",
  "cruise":"~4L", "crush":"~4M", "culture":"~4N", "current":"~4O", "curve":"~4P",
  "cycle":"~4Q", "daily":"~4R", "damage":"~4S", "dance":"~4T", "dark":"~4U",
  "data":"~4V", "datum":"~4W", "days":"~4X", "deal":"~4Y", "dealing":"~4Z",
  "dear":"~50", "death":"~51", "debate":"~52", "debut":"~53", "decide":"~54",
  "decided":"~55", "decor":"~56", "deep":"~57", "defend":"~58", "defense":"~59",
  "define":"~5a", "degree":"~5b", "delay":"~5c", "delta":"~5d", "demand":"~5e",
  "dense":"~5f", "depot":"~5g", "depth":"~5h", "derby":"~5i", "despite":"~5j",
  "detail":"~5k", "develop":"~5l", "devil":"~5m", "differ":"~5n", "digital":"~5o",
  "dinner":"~5p", "direct":"~5q", "dirty":"~5r", "discuss":"~5s", "disease":"~5t",
  "distant":"~5u", "ditch":"~5v", "divide":"~5w", "divided":"~5x", "does":"~5y",
  "dollar":"~5z", "donate":"~5A", "double":"~5B", "doubt":"~5C", "dough":"~5D",
  "down":"~5E", "draft":"~5F", "drain":"~5G", "drama":"~5H", "drawn":"~5I",
  "dream":"~5J", "drink":"~5K", "drive":"~5L", "driving":"~5M", "drove":"~5N",
  "dusky":"~5O", "dusty":"~5P", "dynamic":"~5Q", "each":"~5R", "eager":"~5S",
  "early":"~5T", "earth":"~5U", "easily":"~5V", "economy":"~5W", "effect":"~5X",
  "effort":"~5Y", "eight":"~5Z", "either":"~60", "element":"~61", "elite":"~62",
  "else":"~63", "email":"~64", "embrace":"~65", "emotion":"~66", "empty":"~67",
  "enable":"~68", "ending":"~69", "ends":"~6a", "enemy":"~6b", "energy":"~6c",
  "engine":"~6d", "english":"~6e", "enhance":"~6f", "enjoy":"~6g", "enough":"~6h",
  "ensure":"~6i", "enter":"~6j", "entire":"~6k", "entry":"~6l", "equal":"~6m",
  "error":"~6n", "escape":"~6o", "essay":"~6p", "estate":"~6q", "even":"~6r",
  "event":"~6s", "ever":"~6t", "every":"~6u", "evolve":"~6v", "exact":"~6w",
  "example":"~6x", "exceed":"~6y", "exclude":"~6z", "excluding":"~6A", "execute":"~6B",
  "exhaust":"~6C", "exist":"~6D", "expect":"~6E", "expire":"~6F", "explore":"~6G",
  "export":"~6H", "express":"~6I", "extend":"~6J", "extra":"~6K", "extreme":"~6L",
  "face":"~6M", "fact":"~6N", "factor":"~6O", "fail":"~6P", "faint":"~6Q",
  "fair":"~6R", "faith":"~6S", "fall":"~6T", "false":"~6U", "family":"~6V",
  "famous":"~6W", "fancy":"~6X", "fast":"~6Y", "fatal":"~6Z", "feast":"~70",
  "federal":"~71", "feel":"~72", "feeling":"~73", "feet":"~74", "female":"~75",
  "fence":"~76", "fewer":"~77", "field":"~78", "fifth":"~79", "fight":"~7a",
  "figure":"~7b", "file":"~7c", "fill":"~7d", "final":"~7e", "finance":"~7f",
  "find":"~7g", "finger":"~7h", "fire":"~7i", "firm":"~7j", "first":"~7k",
  "five":"~7l", "fixed":"~7m", "flame":"~7n", "flash":"~7o", "fleet":"~7p",
  "flesh":"~7q", "float":"~7r", "floor":"~7s", "flour":"~7t", "flown":"~7u",
  "focus":"~7v", "follow":"~7w", "food":"~7x", "foot":"~7y", "force":"~7z",
  "forest":"~7A", "forge":"~7B", "form":"~7C", "format":"~7D", "forward":"~7E",
  "foster":"~7F", "found":"~7G", "four":"~7H", "fourth":"~7I", "frame":"~7J",
  "frank":"~7K", "fraud":"~7L", "free":"~7M", "freedom":"~7N", "frequently":"~7O",
  "fresh":"~7P", "friend":"~7Q", "from":"~7R", "front":"~7S", "frost":"~7T",
  "frozen":"~7U", "fruit":"~7V", "full":"~7W", "fully":"~7X", "fund":"~7Y",
  "funny":"~7Z", "future":"~80", "game":"~81", "garden":"~82", "gate":"~83",
  "gave":"~84", "gear":"~85", "gender":"~86", "general":"~87", "genuine":"~88",
  "getting":"~89", "giant":"~8a", "girl":"~8b", "give":"~8c", "given":"~8d",
  "giving":"~8e", "glad":"~8f", "glare":"~8g", "glass":"~8h", "global":"~8i",
  "globe":"~8j", "glory":"~8k", "glove":"~8l", "goal":"~8m", "goes":"~8n",
  "going":"~8o", "gold":"~8p", "golden":"~8q", "gone":"~8r", "good":"~8s",
  "grace":"~8t", "grade":"~8u", "grain":"~8v", "grand":"~8w", "grant":"~8x",
  "grasp":"~8y", "grass":"~8z", "grave":"~8A", "great":"~8B", "green":"~8C",
  "greet":"~8D", "grief":"~8E", "grind":"~8F", "groan":"~8G", "gross":"~8H",
  "ground":"~8I", "group":"~8J", "grove":"~8K", "grow":"~8L", "growth":"~8M",
  "guard":"~8N", "guess":"~8O", "guest":"~8P", "guide":"~8Q", "guild":"~8R",
  "guilt":"~8S", "guise":"~8T", "gulf":"~8U", "gusto":"~8V", "half":"~8W",
  "hall":"~8X", "hand":"~8Y", "happy":"~8Z", "hard":"~90", "hardly":"~91",
  "harm":"~92", "harsh":"~93", "have":"~94", "head":"~95", "health":"~96",
  "heart":"~97", "heat":"~98", "heavy":"~99", "height":"~9a", "held":"~9b",
  "help":"~9c", "here":"~9d", "hero":"~9e", "hidden":"~9f", "high":"~9g",
  "hill":"~9h", "hint":"~9i", "hold":"~9j", "hole":"~9k", "home":"~9l",
  "honest":"~9m", "hope":"~9n", "hotel":"~9o", "hour":"~9p", "hourly":"~9q",
  "house":"~9r", "however":"~9s", "huge":"~9t", "human":"~9u", "humor":"~9v",
  "hundred":"~9w", "hunger":"~9x", "hurry":"~9y", "idea":"~9z", "image":"~9A",
  "imagine":"~9B", "impact":"~9C", "imply":"~9D", "import":"~9E", "improve":"~9F",
  "inch":"~9G", "include":"~9H", "income":"~9I", "indeed":"~9J", "index":"~9K",
  "initial":"~9L", "inject":"~9M", "injure":"~9N", "inner":"~9O", "input":"~9P",
  "insist":"~9Q", "instant":"~9R", "integer":"~9S", "intense":"~9T", "intent":"~9U",
  "into":"~9V", "invest":"~9W", "iron":"~9X", "island":"~9Y", "issue":"~9Z",
  "items":"~a0", "itself":"~a1", "join":"~a2", "joined":"~a3", "judge":"~a4",
  "juice":"~a5", "juicy":"~a6", "jump":"~a7", "jungle":"~a8", "junior":"~a9",
  "just":"~aa", "justice":"~ab", "keep":"~ac", "keeping":"~ad", "kind":"~ae",
  "king":"~af", "kingdom":"~ag", "know":"~ah", "knowing":"~ai", "known":"~aj",
  "label":"~ak", "land":"~al", "language":"~am", "laser":"~an", "last":"~ao",
  "late":"~ap", "latest":"~aq", "laugh":"~ar", "launch":"~as", "layer":"~at",
  "lead":"~au", "leader":"~av", "league":"~aw", "lean":"~ax", "learn":"~ay",
  "lease":"~az", "leave":"~aA", "left":"~aB", "legal":"~aC", "lemon":"~aD",
  "less":"~aE", "lessen":"~aF", "letter":"~aG", "level":"~aH", "life":"~aI",
  "light":"~aJ", "like":"~aK", "limit":"~aL", "line":"~aM", "linen":"~aN",
  "liner":"~aO", "link":"~aP", "liquid":"~aQ", "list":"~aR", "listen":"~aS",
  "little":"~aT", "live":"~aU", "liver":"~aV", "living":"~aW", "load":"~aX",
  "loan":"~aY", "local":"~aZ", "locate":"~b0", "lock":"~b1", "lodge":"~b2",
  "loft":"~b3", "logic":"~b4", "long":"~b5", "longer":"~b6", "look":"~b7",
  "looked":"~b8", "loose":"~b9", "lose":"~ba", "losing":"~bb", "loss":"~bc",
  "lost":"~bd", "loud":"~be", "love":"~bf", "lower":"~bg", "loyal":"~bh",
  "luck":"~bi", "lucky":"~bj", "lure":"~bk", "luxury":"~bl", "made":"~bm",
  "magic":"~bn", "mail":"~bo", "main":"~bp", "major":"~bq", "make":"~br",
  "maker":"~bs", "manage":"~bt", "manor":"~bu", "manual":"~bv", "maple":"~bw",
  "march":"~bx", "mark":"~by", "market":"~bz", "mass":"~bA", "match":"~bB",
  "math":"~bC", "matter":"~bD", "mayor":"~bE", "mean":"~bF", "media":"~bG",
  "meet":"~bH", "member":"~bI", "mercy":"~bJ", "merit":"~bK", "metal":"~bL",
  "method":"~bM", "middle":"~bN", "mild":"~bO", "mile":"~bP", "mill":"~bQ",
  "mind":"~bR", "mine":"~bS", "minor":"~bT", "minus":"~bU", "mirror":"~bV",
  "miss":"~bW", "mixed":"~bX", "mobile":"~bY", "mode":"~bZ", "model":"~c0",
  "modern":"~c1", "moment":"~c2", "money":"~c3", "month":"~c4", "mood":"~c5",
  "moon":"~c6", "moral":"~c7", "more":"~c8", "most":"~c9", "mostly":"~ca",
  "mother":"~cb", "motion":"~cc", "motor":"~cd", "mount":"~ce", "mouse":"~cf",
  "mouth":"~cg", "move":"~ch", "movie":"~ci", "much":"~cj", "murder":"~ck",
  "music":"~cl", "must":"~cm", "mutual":"~cn", "myth":"~co", "naive":"~cp",
  "name":"~cq", "nation":"~cr", "nature":"~cs", "near":"~ct", "need":"~cu",
  "nerve":"~cv", "never":"~cw", "news":"~cx", "next":"~cy", "nice":"~cz",
  "night":"~cA", "nine":"~cB", "noble":"~cC", "noise":"~cD", "none":"~cE",
  "norm":"~cF", "normal":"~cG", "north":"~cH", "note":"~cI", "nothing":"~cJ",
  "notice":"~cK", "novel":"~cL", "null":"~cM", "number":"~cN", "nurse":"~cO",
  "nylon":"~cP", "object":"~cQ", "oblige":"~cR", "obtain":"~cS", "obvious":"~cT",
  "occur":"~cU", "offer":"~cV", "office":"~cW", "often":"~cX", "okay":"~cY",
  "once":"~cZ", "ongoing":"~d0", "online":"~d1", "only":"~d2", "open":"~d3",
  "openly":"~d4", "opinion":"~d5", "option":"~d6", "oral":"~d7", "orange":"~d8",
  "order":"~d9", "other":"~da", "ought":"~db", "ours":"~dc", "outer":"~dd",
  "outlet":"~de", "output":"~df", "outside":"~dg", "over":"~dh", "overall":"~di",
  "owner":"~dj", "ozone":"~dk", "pace":"~dl", "page":"~dm", "pain":"~dn",
  "paint":"~do", "pair":"~dp", "panel":"~dq", "paper":"~dr", "parent":"~ds",
  "park":"~dt", "part":"~du", "pass":"~dv", "past":"~dw", "path":"~dx",
  "patrol":"~dy", "pause":"~dz", "peace":"~dA", "peak":"~dB", "pearl":"~dC",
  "pedal":"~dD", "people":"~dE", "permit":"~dF", "person":"~dG", "phase":"~dH",
  "phone":"~dI", "photo":"~dJ", "phrase":"~dK", "pick":"~dL", "piece":"~dM",
  "pile":"~dN", "pilot":"~dO", "pine":"~dP", "pipe":"~dQ", "pirate":"~dR",
  "pitch":"~dS", "pixel":"~dT", "pizza":"~dU", "place":"~dV", "plain":"~dW",
  "plan":"~dX", "plane":"~dY", "planet":"~dZ", "plant":"~e0", "plate":"~e1",
  "play":"~e2", "player":"~e3", "plaza":"~e4", "plead":"~e5", "please":"~e6",
  "plenty":"~e7", "plot":"~e8", "pluck":"~e9", "plumb":"~ea", "plume":"~eb",
  "plus":"~ec", "plush":"~ed", "pocket":"~ee", "point":"~ef", "polar":"~eg",
  "police":"~eh", "policy":"~ei", "pool":"~ej", "poor":"~ek", "popular":"~el",
  "port":"~em", "portal":"~en", "post":"~eo", "potato":"~ep", "pound":"~eq",
  "pour":"~er", "power":"~es", "prefix":"~et", "present":"~eu", "press":"~ev",
  "pretty":"~ew", "prevent":"~ex", "prey":"~ey", "price":"~ez", "pride":"~eA",
  "prime":"~eB", "print":"~eC", "prior":"~eD", "prison":"~eE", "prize":"~eF",
  "probe":"~eG", "problem":"~eH", "process":"~eI", "produce":"~eJ", "product":"~eK",
  "profit":"~eL", "program":"~eM", "promise":"~eN", "proof":"~eO", "prose":"~eP",
  "protect":"~eQ", "proud":"~eR", "prove":"~eS", "provide":"~eT", "psalm":"~eU",
  "public":"~eV", "pull":"~eW", "pulse":"~eX", "pump":"~eY", "pupil":"~eZ",
  "pure":"~f0", "purple":"~f1", "pursue":"~f2", "push":"~f3", "puts":"~f4",
  "puzzle":"~f5", "quality":"~f6", "queen":"~f7", "query":"~f8", "quest":"~f9",
  "queue":"~fa", "quick":"~fb", "quickly":"~fc", "quiet":"~fd", "quota":"~fe",
  "quote":"~ff", "race":"~fg", "radar":"~fh", "radio":"~fi", "rage":"~fj",
  "rain":"~fk", "raise":"~fl", "rally":"~fm", "ranch":"~fn", "random":"~fo",
  "range":"~fp", "rank":"~fq", "rapid":"~fr", "rarely":"~fs", "rate":"~ft",
  "razor":"~fu", "reach":"~fv", "read":"~fw", "real":"~fx", "reality":"~fy",
  "reason":"~fz", "rebel":"~fA", "recap":"~fB", "receive":"~fC", "recent":"~fD",
  "reduce":"~fE", "refer":"~fF", "reform":"~fG", "refuse":"~fH", "region":"~fI",
  "reign":"~fJ", "related":"~fK", "relax":"~fL", "release":"~fM", "rely":"~fN",
  "remain":"~fO", "remind":"~fP", "remove":"~fQ", "rent":"~fR", "repay":"~fS",
  "repeat":"~fT", "repel":"~fU", "reply":"~fV", "require":"~fW", "rescue":"~fX",
  "resolve":"~fY", "respect":"~fZ", "respond":"~g0", "rest":"~g1", "restore":"~g2",
  "return":"~g3", "revenue":"~g4", "review":"~g5", "reward":"~g6", "rich":"~g7",
  "ride":"~g8", "rider":"~g9", "rifle":"~ga", "right":"~gb", "rigid":"~gc",
  "ring":"~gd", "rise":"~ge", "rising":"~gf", "risk":"~gg", "risky":"~gh",
  "rival":"~gi", "river":"~gj", "road":"~gk", "robot":"~gl", "rock":"~gm",
  "rocket":"~gn", "rocky":"~go", "role":"~gp", "roll":"~gq", "roof":"~gr",
  "room":"~gs", "root":"~gt", "rose":"~gu", "rouge":"~gv", "rough":"~gw",
  "round":"~gx", "route":"~gy", "rover":"~gz", "royal":"~gA", "rugby":"~gB",
  "ruin":"~gC", "rule":"~gD", "ruler":"~gE", "rural":"~gF", "rush":"~gG",
  "safe":"~gH", "sail":"~gI", "salt":"~gJ", "same":"~gK", "sample":"~gL",
  "savage":"~gM", "save":"~gN", "saving":"~gO", "says":"~gP", "scale":"~gQ",
  "scene":"~gR", "science":"~gS", "score":"~gT", "scout":"~gU", "seal":"~gV",
  "second":"~gW", "secret":"~gX", "section":"~gY", "sector":"~gZ", "seek":"~h0",
  "seize":"~h1", "select":"~h2", "self":"~h3", "sell":"~h4", "send":"~h5",
  "senior":"~h6", "sent":"~h7", "series":"~h8", "serve":"~h9", "service":"~ha",
  "settle":"~hb", "seven":"~hc", "several":"~hd", "shade":"~he", "shake":"~hf",
  "shall":"~hg", "shame":"~hh", "shape":"~hi", "share":"~hj", "sharp":"~hk",
  "shelf":"~hl", "shell":"~hm", "shift":"~hn", "shirt":"~ho", "shock":"~hp",
  "shore":"~hq", "short":"~hr", "should":"~hs", "shout":"~ht", "side":"~hu",
  "sight":"~hv", "sign":"~hw", "signal":"~hx", "silent":"~hy", "silk":"~hz",
  "silver":"~hA", "similar":"~hB", "simple":"~hC", "since":"~hD", "sing":"~hE",
  "single":"~hF", "sink":"~hG", "sister":"~hH", "site":"~hI", "sixth":"~hJ",
  "size":"~hK", "sized":"~hL", "skill":"~hM", "skin":"~hN", "skip":"~hO",
  "slate":"~hP", "slave":"~hQ", "sleep":"~hR", "slice":"~hS", "slide":"~hT",
  "slope":"~hU", "slow":"~hV", "slowly":"~hW", "small":"~hX", "smart":"~hY",
  "smell":"~hZ", "smile":"~i0", "smoke":"~i1", "snap":"~i2", "snow":"~i3",
  "society":"~i4", "soft":"~i5", "soil":"~i6", "solar":"~i7", "sold":"~i8",
  "sole":"~i9", "solid":"~ia", "solve":"~ib", "some":"~ic", "somehow":"~id",
  "someone":"~ie", "song":"~if", "soon":"~ig", "sorry":"~ih", "sort":"~ii",
  "soul":"~ij", "soup":"~ik", "source":"~il", "south":"~im", "space":"~in",
  "span":"~io", "spare":"~ip", "spark":"~iq", "speak":"~ir", "spec":"~is",
  "special":"~it", "speech":"~iu", "speed":"~iv", "spend":"~iw", "spice":"~ix",
  "spill":"~iy", "spin":"~iz", "spine":"~iA", "spirit":"~iB", "spit":"~iC",
  "split":"~iD", "spoke":"~iE", "spook":"~iF", "sport":"~iG", "spot":"~iH",
  "spray":"~iI", "spread":"~iJ", "squad":"~iK", "square":"~iL", "stable":"~iM",
  "stack":"~iN", "staff":"~iO", "stage":"~iP", "stake":"~iQ", "stall":"~iR",
  "stand":"~iS", "star":"~iT", "stare":"~iU", "start":"~iV", "started":"~iW",
  "state":"~iX", "static":"~iY", "station":"~iZ", "status":"~j0", "stay":"~j1",
  "stays":"~j2", "steel":"~j3", "steep":"~j4", "steer":"~j5", "stem":"~j6",
  "step":"~j7", "stick":"~j8", "still":"~j9", "stir":"~ja", "stock":"~jb",
  "stone":"~jc", "stood":"~jd", "stop":"~je", "store":"~jf", "storm":"~jg",
  "story":"~jh", "stove":"~ji", "stream":"~jj", "street":"~jk", "strict":"~jl",
  "string":"~jm", "strong":"~jn", "struck":"~jo", "struct":"~jp", "stuck":"~jq",
  "student":"~jr", "studio":"~js", "study":"~jt", "stuff":"~ju", "stunt":"~jv",
  "stupid":"~jw", "style":"~jx", "subject":"~jy", "submit":"~jz", "success":"~jA",
  "such":"~jB", "sudden":"~jC", "suffer":"~jD", "sugar":"~jE", "suit":"~jF",
  "suite":"~jG", "summer":"~jH", "super":"~jI", "supply":"~jJ", "support":"~jK",
  "sure":"~jL", "surface":"~jM", "surge":"~jN", "swamp":"~jO", "swap":"~jP",
  "swear":"~jQ", "sweet":"~jR", "swift":"~jS", "swing":"~jT", "switch":"~jU",
  "sword":"~jV", "sync":"~jW", "syrup":"~jX", "table":"~jY", "take":"~jZ",
  "tale":"~k0", "talent":"~k1", "talk":"~k2", "tall":"~k3", "target":"~k4",
  "task":"~k5", "teacher":"~k6", "team":"~k7", "tear":"~k8", "tech":"~k9",
  "tell":"~ka", "test":"~kb", "text":"~kc", "than":"~kd", "that":"~ke",
  "their":"~kf", "them":"~kg", "then":"~kh", "there":"~ki", "these":"~kj",
  "they":"~kk", "thick":"~kl", "thing":"~km", "think":"~kn", "third":"~ko",
  "this":"~kp", "thorn":"~kq", "those":"~kr", "though":"~ks", "threat":"~kt",
  "three":"~ku", "threw":"~kv", "throat":"~kw", "throw":"~kx", "tick":"~ky",
  "ticket":"~kz", "tide":"~kA", "tied":"~kB", "ties":"~kC", "tiger":"~kD",
  "tight":"~kE", "tile":"~kF", "till":"~kG", "tilt":"~kH", "time":"~kI",
  "tinker":"~kJ", "tiny":"~kK", "tire":"~kL", "tired":"~kM", "tissue":"~kN",
  "title":"~kO", "today":"~kP", "together":"~kQ", "token":"~kR", "toll":"~kS",
  "tomato":"~kT", "tone":"~kU", "tongue":"~kV", "tonight":"~kW", "took":"~kX",
  "tool":"~kY", "tops":"~kZ", "torn":"~l0", "total":"~l1", "totally":"~l2",
  "touch":"~l3", "tough":"~l4", "tour":"~l5", "toward":"~l6", "towards":"~l7",
  "towel":"~l8", "town":"~l9", "track":"~la", "trade":"~lb", "trail":"~lc",
  "train":"~ld", "trait":"~le", "travel":"~lf", "tree":"~lg", "trend":"~lh",
  "trial":"~li", "tribe":"~lj", "trick":"~lk", "tried":"~ll", "trim":"~lm",
  "trio":"~ln", "trip":"~lo", "triple":"~lp", "trouble":"~lq", "truce":"~lr",
  "truck":"~ls", "true":"~lt", "truly":"~lu", "trust":"~lv", "truth":"~lw",
  "tube":"~lx", "tumor":"~ly", "tune":"~lz", "turn":"~lA", "tutor":"~lB",
  "twice":"~lC", "twin":"~lD", "type":"~lE", "typical":"~lF", "unborn":"~lG",
  "under":"~lH", "union":"~lI", "unique":"~lJ", "unity":"~lK", "until":"~lL",
  "update":"~lM", "upon":"~lN", "upper":"~lO", "upset":"~lP", "upward":"~lQ",
  "urban":"~lR", "usage":"~lS", "used":"~lT", "useful":"~lU", "user":"~lV",
  "usual":"~lW", "usually":"~lX", "utter":"~lY", "valid":"~lZ", "value":"~m0",
  "vary":"~m1", "vast":"~m2", "veil":"~m3", "vent":"~m4", "very":"~m5",
  "video":"~m6", "view":"~m7", "vigil":"~m8", "village":"~m9", "viral":"~ma",
  "virus":"~mb", "visit":"~mc", "visual":"~md", "vital":"~me", "vivid":"~mf",
  "voice":"~mg", "vote":"~mh", "voter":"~mi", "wade":"~mj", "wait":"~mk",
  "walk":"~ml", "wall":"~mm", "ward":"~mn", "warm":"~mo", "warn":"~mp",
  "wars":"~mq", "wash":"~mr", "waste":"~ms", "watch":"~mt", "water":"~mu",
  "wave":"~mv", "ways":"~mw", "weak":"~mx", "wear":"~my", "weary":"~mz",
  "weave":"~mA", "week":"~mB", "weird":"~mC", "well":"~mD", "were":"~mE",
  "west":"~mF", "whale":"~mG", "what":"~mH", "wheat":"~mI", "wheel":"~mJ",
  "when":"~mK", "where":"~mL", "whether":"~mM", "which":"~mN", "while":"~mO",
  "white":"~mP", "whole":"~mQ", "whose":"~mR", "wide":"~mS", "width":"~mT",
  "wife":"~mU", "wild":"~mV", "will":"~mW", "wind":"~mX", "wine":"~mY",
  "winter":"~mZ", "wire":"~n0", "wise":"~n1", "wish":"~n2", "with":"~n3",
  "within":"~n4", "without":"~n5", "woke":"~n6", "wolf":"~n7", "women":"~n8",
  "wonder":"~n9", "wood":"~na", "wooden":"~nb", "word":"~nc", "words":"~nd",
  "work":"~ne", "worker":"~nf", "working":"~ng", "world":"~nh", "worn":"~ni",
  "worry":"~nj", "worse":"~nk", "worst":"~nl", "worth":"~nm", "would":"~nn",
  "wound":"~no", "wrap":"~np", "write":"~nq", "writing":"~nr", "written":"~ns",
  "wrote":"~nt", "yacht":"~nu", "yard":"~nv", "year":"~nw", "yellow":"~nx",
  "young":"~ny", "your":"~nz", "youth":"~nA", "zebra":"~nB", "zero":"~nC",
  "zilch":"~nD", "zonal":"~nE", "zone":"~nF"
};
var _SX_DECODE = {
  "~00":"abandon", "~01":"ability", "~02":"able", "~03":"aboard", "~04":"about",
  "~05":"above", "~06":"absence", "~07":"absolute", "~08":"absorb", "~09":"abstract",
  "~0a":"abuse", "~0b":"academic", "~0c":"accept", "~0d":"access", "~0e":"accident",
  "~0f":"accord", "~0g":"account", "~0h":"accurate", "~0i":"accuse", "~0j":"achieve",
  "~0k":"acquire", "~0l":"action", "~0m":"active", "~0n":"actual", "~0o":"address",
  "~0p":"adjust", "~0q":"advance", "~0r":"advantage", "~0s":"adverse", "~0t":"advice",
  "~0u":"advise", "~0v":"affect", "~0w":"afford", "~0x":"afraid", "~0y":"after",
  "~0z":"again", "~0A":"against", "~0B":"agency", "~0C":"agenda", "~0D":"agent",
  "~0E":"agree", "~0F":"ahead", "~0G":"aimed", "~0H":"alarm", "~0I":"album",
  "~0J":"alert", "~0K":"alien", "~0L":"align", "~0M":"alive", "~0N":"alley",
  "~0O":"allow", "~0P":"almost", "~0Q":"alone", "~0R":"along", "~0S":"already",
  "~0T":"also", "~0U":"alter", "~0V":"although", "~0W":"always", "~0X":"amazing",
  "~0Y":"among", "~0Z":"amount", "~10":"ancient", "~11":"anger", "~12":"angle",
  "~13":"animal", "~14":"ankle", "~15":"annex", "~16":"another", "~17":"answer",
  "~18":"anybody", "~19":"anymore", "~1a":"anyone", "~1b":"anywhere", "~1c":"apart",
  "~1d":"appeal", "~1e":"appear", "~1f":"apply", "~1g":"approach", "~1h":"area",
  "~1i":"arena", "~1j":"argue", "~1k":"arise", "~1l":"around", "~1m":"array",
  "~1n":"article", "~1o":"aside", "~1p":"aspect", "~1q":"asset", "~1r":"assign",
  "~1s":"assume", "~1t":"atlas", "~1u":"attach", "~1v":"attack", "~1w":"attend",
  "~1x":"audit", "~1y":"author", "~1z":"avoid", "~1A":"award", "~1B":"away",
  "~1C":"awful", "~1D":"back", "~1E":"basic", "~1F":"basis", "~1G":"batch",
  "~1H":"battle", "~1I":"beach", "~1J":"beauty", "~1K":"because", "~1L":"been",
  "~1M":"before", "~1N":"began", "~1O":"begin", "~1P":"behind", "~1Q":"being",
  "~1R":"believe", "~1S":"belong", "~1T":"below", "~1U":"bench", "~1V":"benefit",
  "~1W":"best", "~1X":"better", "~1Y":"between", "~1Z":"beyond", "~20":"billion",
  "~21":"birth", "~22":"black", "~23":"blade", "~24":"blame", "~25":"bland",
  "~26":"blank", "~27":"blast", "~28":"blaze", "~29":"bleed", "~2a":"blend",
  "~2b":"bless", "~2c":"blind", "~2d":"block", "~2e":"blood", "~2f":"blown",
  "~2g":"board", "~2h":"body", "~2i":"book", "~2j":"boost", "~2k":"both",
  "~2l":"bother", "~2m":"bottle", "~2n":"bottom", "~2o":"bounce", "~2p":"bound",
  "~2q":"boxer", "~2r":"brain", "~2s":"branch", "~2t":"brand", "~2u":"brave",
  "~2v":"break", "~2w":"breath", "~2x":"breed", "~2y":"bridge", "~2z":"brief",
  "~2A":"bring", "~2B":"broad", "~2C":"broke", "~2D":"broken", "~2E":"brook",
  "~2F":"brought", "~2G":"brown", "~2H":"brush", "~2I":"budget", "~2J":"build",
  "~2K":"built", "~2L":"bunch", "~2M":"burden", "~2N":"burst", "~2O":"business",
  "~2P":"button", "~2Q":"buyer", "~2R":"buying", "~2S":"cabin", "~2T":"cable",
  "~2U":"call", "~2V":"camera", "~2W":"cancel", "~2X":"cannot", "~2Y":"canvas",
  "~2Z":"carbon", "~30":"care", "~31":"career", "~32":"careful", "~33":"case",
  "~34":"castle", "~35":"cattle", "~36":"caught", "~37":"center", "~38":"central",
  "~39":"centre", "~3a":"century", "~3b":"chain", "~3c":"chair", "~3d":"chalk",
  "~3e":"chance", "~3f":"change", "~3g":"chaos", "~3h":"chapter", "~3i":"characters",
  "~3j":"charge", "~3k":"charity", "~3l":"charm", "~3m":"chart", "~3n":"chase",
  "~3o":"cheap", "~3p":"check", "~3q":"cheek", "~3r":"cheer", "~3s":"chess",
  "~3t":"chief", "~3u":"child", "~3v":"china", "~3w":"choice", "~3x":"choir",
  "~3y":"choose", "~3z":"chose", "~3A":"chosen", "~3B":"chronic", "~3C":"chunk",
  "~3D":"cinema", "~3E":"circle", "~3F":"citizen", "~3G":"city", "~3H":"civic",
  "~3I":"civil", "~3J":"claim", "~3K":"class", "~3L":"clause", "~3M":"clean",
  "~3N":"clear", "~3O":"clearly", "~3P":"clerk", "~3Q":"click", "~3R":"cliff",
  "~3S":"climate", "~3T":"climb", "~3U":"close", "~3V":"closet", "~3W":"cloud",
  "~3X":"club", "~3Y":"coast", "~3Z":"coffee", "~40":"collar", "~41":"color",
  "~42":"column", "~43":"combat", "~44":"come", "~45":"comfort", "~46":"comic",
  "~47":"comma", "~48":"comment", "~49":"commit", "~4a":"common", "~4b":"commonly",
  "~4c":"company", "~4d":"compare", "~4e":"complex", "~4f":"concept", "~4g":"conduct",
  "~4h":"confirm", "~4i":"contact", "~4j":"content", "~4k":"contest", "~4l":"control",
  "~4m":"coral", "~4n":"correct", "~4o":"cost", "~4p":"cotton", "~4q":"could",
  "~4r":"count", "~4s":"country", "~4t":"county", "~4u":"couple", "~4v":"course",
  "~4w":"court", "~4x":"cover", "~4y":"crack", "~4z":"craft", "~4A":"crane",
  "~4B":"crash", "~4C":"crazy", "~4D":"cream", "~4E":"create", "~4F":"credit",
  "~4G":"creek", "~4H":"crime", "~4I":"cross", "~4J":"crowd", "~4K":"crown",
  "~4L":"cruise", "~4M":"crush", "~4N":"culture", "~4O":"current", "~4P":"curve",
  "~4Q":"cycle", "~4R":"daily", "~4S":"damage", "~4T":"dance", "~4U":"dark",
  "~4V":"data", "~4W":"datum", "~4X":"days", "~4Y":"deal", "~4Z":"dealing",
  "~50":"dear", "~51":"death", "~52":"debate", "~53":"debut", "~54":"decide",
  "~55":"decided", "~56":"decor", "~57":"deep", "~58":"defend", "~59":"defense",
  "~5a":"define", "~5b":"degree", "~5c":"delay", "~5d":"delta", "~5e":"demand",
  "~5f":"dense", "~5g":"depot", "~5h":"depth", "~5i":"derby", "~5j":"despite",
  "~5k":"detail", "~5l":"develop", "~5m":"devil", "~5n":"differ", "~5o":"digital",
  "~5p":"dinner", "~5q":"direct", "~5r":"dirty", "~5s":"discuss", "~5t":"disease",
  "~5u":"distant", "~5v":"ditch", "~5w":"divide", "~5x":"divided", "~5y":"does",
  "~5z":"dollar", "~5A":"donate", "~5B":"double", "~5C":"doubt", "~5D":"dough",
  "~5E":"down", "~5F":"draft", "~5G":"drain", "~5H":"drama", "~5I":"drawn",
  "~5J":"dream", "~5K":"drink", "~5L":"drive", "~5M":"driving", "~5N":"drove",
  "~5O":"dusky", "~5P":"dusty", "~5Q":"dynamic", "~5R":"each", "~5S":"eager",
  "~5T":"early", "~5U":"earth", "~5V":"easily", "~5W":"economy", "~5X":"effect",
  "~5Y":"effort", "~5Z":"eight", "~60":"either", "~61":"element", "~62":"elite",
  "~63":"else", "~64":"email", "~65":"embrace", "~66":"emotion", "~67":"empty",
  "~68":"enable", "~69":"ending", "~6a":"ends", "~6b":"enemy", "~6c":"energy",
  "~6d":"engine", "~6e":"english", "~6f":"enhance", "~6g":"enjoy", "~6h":"enough",
  "~6i":"ensure", "~6j":"enter", "~6k":"entire", "~6l":"entry", "~6m":"equal",
  "~6n":"error", "~6o":"escape", "~6p":"essay", "~6q":"estate", "~6r":"even",
  "~6s":"event", "~6t":"ever", "~6u":"every", "~6v":"evolve", "~6w":"exact",
  "~6x":"example", "~6y":"exceed", "~6z":"exclude", "~6A":"excluding", "~6B":"execute",
  "~6C":"exhaust", "~6D":"exist", "~6E":"expect", "~6F":"expire", "~6G":"explore",
  "~6H":"export", "~6I":"express", "~6J":"extend", "~6K":"extra", "~6L":"extreme",
  "~6M":"face", "~6N":"fact", "~6O":"factor", "~6P":"fail", "~6Q":"faint",
  "~6R":"fair", "~6S":"faith", "~6T":"fall", "~6U":"false", "~6V":"family",
  "~6W":"famous", "~6X":"fancy", "~6Y":"fast", "~6Z":"fatal", "~70":"feast",
  "~71":"federal", "~72":"feel", "~73":"feeling", "~74":"feet", "~75":"female",
  "~76":"fence", "~77":"fewer", "~78":"field", "~79":"fifth", "~7a":"fight",
  "~7b":"figure", "~7c":"file", "~7d":"fill", "~7e":"final", "~7f":"finance",
  "~7g":"find", "~7h":"finger", "~7i":"fire", "~7j":"firm", "~7k":"first",
  "~7l":"five", "~7m":"fixed", "~7n":"flame", "~7o":"flash", "~7p":"fleet",
  "~7q":"flesh", "~7r":"float", "~7s":"floor", "~7t":"flour", "~7u":"flown",
  "~7v":"focus", "~7w":"follow", "~7x":"food", "~7y":"foot", "~7z":"force",
  "~7A":"forest", "~7B":"forge", "~7C":"form", "~7D":"format", "~7E":"forward",
  "~7F":"foster", "~7G":"found", "~7H":"four", "~7I":"fourth", "~7J":"frame",
  "~7K":"frank", "~7L":"fraud", "~7M":"free", "~7N":"freedom", "~7O":"frequently",
  "~7P":"fresh", "~7Q":"friend", "~7R":"from", "~7S":"front", "~7T":"frost",
  "~7U":"frozen", "~7V":"fruit", "~7W":"full", "~7X":"fully", "~7Y":"fund",
  "~7Z":"funny", "~80":"future", "~81":"game", "~82":"garden", "~83":"gate",
  "~84":"gave", "~85":"gear", "~86":"gender", "~87":"general", "~88":"genuine",
  "~89":"getting", "~8a":"giant", "~8b":"girl", "~8c":"give", "~8d":"given",
  "~8e":"giving", "~8f":"glad", "~8g":"glare", "~8h":"glass", "~8i":"global",
  "~8j":"globe", "~8k":"glory", "~8l":"glove", "~8m":"goal", "~8n":"goes",
  "~8o":"going", "~8p":"gold", "~8q":"golden", "~8r":"gone", "~8s":"good",
  "~8t":"grace", "~8u":"grade", "~8v":"grain", "~8w":"grand", "~8x":"grant",
  "~8y":"grasp", "~8z":"grass", "~8A":"grave", "~8B":"great", "~8C":"green",
  "~8D":"greet", "~8E":"grief", "~8F":"grind", "~8G":"groan", "~8H":"gross",
  "~8I":"ground", "~8J":"group", "~8K":"grove", "~8L":"grow", "~8M":"growth",
  "~8N":"guard", "~8O":"guess", "~8P":"guest", "~8Q":"guide", "~8R":"guild",
  "~8S":"guilt", "~8T":"guise", "~8U":"gulf", "~8V":"gusto", "~8W":"half",
  "~8X":"hall", "~8Y":"hand", "~8Z":"happy", "~90":"hard", "~91":"hardly",
  "~92":"harm", "~93":"harsh", "~94":"have", "~95":"head", "~96":"health",
  "~97":"heart", "~98":"heat", "~99":"heavy", "~9a":"height", "~9b":"held",
  "~9c":"help", "~9d":"here", "~9e":"hero", "~9f":"hidden", "~9g":"high",
  "~9h":"hill", "~9i":"hint", "~9j":"hold", "~9k":"hole", "~9l":"home",
  "~9m":"honest", "~9n":"hope", "~9o":"hotel", "~9p":"hour", "~9q":"hourly",
  "~9r":"house", "~9s":"however", "~9t":"huge", "~9u":"human", "~9v":"humor",
  "~9w":"hundred", "~9x":"hunger", "~9y":"hurry", "~9z":"idea", "~9A":"image",
  "~9B":"imagine", "~9C":"impact", "~9D":"imply", "~9E":"import", "~9F":"improve",
  "~9G":"inch", "~9H":"include", "~9I":"income", "~9J":"indeed", "~9K":"index",
  "~9L":"initial", "~9M":"inject", "~9N":"injure", "~9O":"inner", "~9P":"input",
  "~9Q":"insist", "~9R":"instant", "~9S":"integer", "~9T":"intense", "~9U":"intent",
  "~9V":"into", "~9W":"invest", "~9X":"iron", "~9Y":"island", "~9Z":"issue",
  "~a0":"items", "~a1":"itself", "~a2":"join", "~a3":"joined", "~a4":"judge",
  "~a5":"juice", "~a6":"juicy", "~a7":"jump", "~a8":"jungle", "~a9":"junior",
  "~aa":"just", "~ab":"justice", "~ac":"keep", "~ad":"keeping", "~ae":"kind",
  "~af":"king", "~ag":"kingdom", "~ah":"know", "~ai":"knowing", "~aj":"known",
  "~ak":"label", "~al":"land", "~am":"language", "~an":"laser", "~ao":"last",
  "~ap":"late", "~aq":"latest", "~ar":"laugh", "~as":"launch", "~at":"layer",
  "~au":"lead", "~av":"leader", "~aw":"league", "~ax":"lean", "~ay":"learn",
  "~az":"lease", "~aA":"leave", "~aB":"left", "~aC":"legal", "~aD":"lemon",
  "~aE":"less", "~aF":"lessen", "~aG":"letter", "~aH":"level", "~aI":"life",
  "~aJ":"light", "~aK":"like", "~aL":"limit", "~aM":"line", "~aN":"linen",
  "~aO":"liner", "~aP":"link", "~aQ":"liquid", "~aR":"list", "~aS":"listen",
  "~aT":"little", "~aU":"live", "~aV":"liver", "~aW":"living", "~aX":"load",
  "~aY":"loan", "~aZ":"local", "~b0":"locate", "~b1":"lock", "~b2":"lodge",
  "~b3":"loft", "~b4":"logic", "~b5":"long", "~b6":"longer", "~b7":"look",
  "~b8":"looked", "~b9":"loose", "~ba":"lose", "~bb":"losing", "~bc":"loss",
  "~bd":"lost", "~be":"loud", "~bf":"love", "~bg":"lower", "~bh":"loyal",
  "~bi":"luck", "~bj":"lucky", "~bk":"lure", "~bl":"luxury", "~bm":"made",
  "~bn":"magic", "~bo":"mail", "~bp":"main", "~bq":"major", "~br":"make",
  "~bs":"maker", "~bt":"manage", "~bu":"manor", "~bv":"manual", "~bw":"maple",
  "~bx":"march", "~by":"mark", "~bz":"market", "~bA":"mass", "~bB":"match",
  "~bC":"math", "~bD":"matter", "~bE":"mayor", "~bF":"mean", "~bG":"media",
  "~bH":"meet", "~bI":"member", "~bJ":"mercy", "~bK":"merit", "~bL":"metal",
  "~bM":"method", "~bN":"middle", "~bO":"mild", "~bP":"mile", "~bQ":"mill",
  "~bR":"mind", "~bS":"mine", "~bT":"minor", "~bU":"minus", "~bV":"mirror",
  "~bW":"miss", "~bX":"mixed", "~bY":"mobile", "~bZ":"mode", "~c0":"model",
  "~c1":"modern", "~c2":"moment", "~c3":"money", "~c4":"month", "~c5":"mood",
  "~c6":"moon", "~c7":"moral", "~c8":"more", "~c9":"most", "~ca":"mostly",
  "~cb":"mother", "~cc":"motion", "~cd":"motor", "~ce":"mount", "~cf":"mouse",
  "~cg":"mouth", "~ch":"move", "~ci":"movie", "~cj":"much", "~ck":"murder",
  "~cl":"music", "~cm":"must", "~cn":"mutual", "~co":"myth", "~cp":"naive",
  "~cq":"name", "~cr":"nation", "~cs":"nature", "~ct":"near", "~cu":"need",
  "~cv":"nerve", "~cw":"never", "~cx":"news", "~cy":"next", "~cz":"nice",
  "~cA":"night", "~cB":"nine", "~cC":"noble", "~cD":"noise", "~cE":"none",
  "~cF":"norm", "~cG":"normal", "~cH":"north", "~cI":"note", "~cJ":"nothing",
  "~cK":"notice", "~cL":"novel", "~cM":"null", "~cN":"number", "~cO":"nurse",
  "~cP":"nylon", "~cQ":"object", "~cR":"oblige", "~cS":"obtain", "~cT":"obvious",
  "~cU":"occur", "~cV":"offer", "~cW":"office", "~cX":"often", "~cY":"okay",
  "~cZ":"once", "~d0":"ongoing", "~d1":"online", "~d2":"only", "~d3":"open",
  "~d4":"openly", "~d5":"opinion", "~d6":"option", "~d7":"oral", "~d8":"orange",
  "~d9":"order", "~da":"other", "~db":"ought", "~dc":"ours", "~dd":"outer",
  "~de":"outlet", "~df":"output", "~dg":"outside", "~dh":"over", "~di":"overall",
  "~dj":"owner", "~dk":"ozone", "~dl":"pace", "~dm":"page", "~dn":"pain",
  "~do":"paint", "~dp":"pair", "~dq":"panel", "~dr":"paper", "~ds":"parent",
  "~dt":"park", "~du":"part", "~dv":"pass", "~dw":"past", "~dx":"path",
  "~dy":"patrol", "~dz":"pause", "~dA":"peace", "~dB":"peak", "~dC":"pearl",
  "~dD":"pedal", "~dE":"people", "~dF":"permit", "~dG":"person", "~dH":"phase",
  "~dI":"phone", "~dJ":"photo", "~dK":"phrase", "~dL":"pick", "~dM":"piece",
  "~dN":"pile", "~dO":"pilot", "~dP":"pine", "~dQ":"pipe", "~dR":"pirate",
  "~dS":"pitch", "~dT":"pixel", "~dU":"pizza", "~dV":"place", "~dW":"plain",
  "~dX":"plan", "~dY":"plane", "~dZ":"planet", "~e0":"plant", "~e1":"plate",
  "~e2":"play", "~e3":"player", "~e4":"plaza", "~e5":"plead", "~e6":"please",
  "~e7":"plenty", "~e8":"plot", "~e9":"pluck", "~ea":"plumb", "~eb":"plume",
  "~ec":"plus", "~ed":"plush", "~ee":"pocket", "~ef":"point", "~eg":"polar",
  "~eh":"police", "~ei":"policy", "~ej":"pool", "~ek":"poor", "~el":"popular",
  "~em":"port", "~en":"portal", "~eo":"post", "~ep":"potato", "~eq":"pound",
  "~er":"pour", "~es":"power", "~et":"prefix", "~eu":"present", "~ev":"press",
  "~ew":"pretty", "~ex":"prevent", "~ey":"prey", "~ez":"price", "~eA":"pride",
  "~eB":"prime", "~eC":"print", "~eD":"prior", "~eE":"prison", "~eF":"prize",
  "~eG":"probe", "~eH":"problem", "~eI":"process", "~eJ":"produce", "~eK":"product",
  "~eL":"profit", "~eM":"program", "~eN":"promise", "~eO":"proof", "~eP":"prose",
  "~eQ":"protect", "~eR":"proud", "~eS":"prove", "~eT":"provide", "~eU":"psalm",
  "~eV":"public", "~eW":"pull", "~eX":"pulse", "~eY":"pump", "~eZ":"pupil",
  "~f0":"pure", "~f1":"purple", "~f2":"pursue", "~f3":"push", "~f4":"puts",
  "~f5":"puzzle", "~f6":"quality", "~f7":"queen", "~f8":"query", "~f9":"quest",
  "~fa":"queue", "~fb":"quick", "~fc":"quickly", "~fd":"quiet", "~fe":"quota",
  "~ff":"quote", "~fg":"race", "~fh":"radar", "~fi":"radio", "~fj":"rage",
  "~fk":"rain", "~fl":"raise", "~fm":"rally", "~fn":"ranch", "~fo":"random",
  "~fp":"range", "~fq":"rank", "~fr":"rapid", "~fs":"rarely", "~ft":"rate",
  "~fu":"razor", "~fv":"reach", "~fw":"read", "~fx":"real", "~fy":"reality",
  "~fz":"reason", "~fA":"rebel", "~fB":"recap", "~fC":"receive", "~fD":"recent",
  "~fE":"reduce", "~fF":"refer", "~fG":"reform", "~fH":"refuse", "~fI":"region",
  "~fJ":"reign", "~fK":"related", "~fL":"relax", "~fM":"release", "~fN":"rely",
  "~fO":"remain", "~fP":"remind", "~fQ":"remove", "~fR":"rent", "~fS":"repay",
  "~fT":"repeat", "~fU":"repel", "~fV":"reply", "~fW":"require", "~fX":"rescue",
  "~fY":"resolve", "~fZ":"respect", "~g0":"respond", "~g1":"rest", "~g2":"restore",
  "~g3":"return", "~g4":"revenue", "~g5":"review", "~g6":"reward", "~g7":"rich",
  "~g8":"ride", "~g9":"rider", "~ga":"rifle", "~gb":"right", "~gc":"rigid",
  "~gd":"ring", "~ge":"rise", "~gf":"rising", "~gg":"risk", "~gh":"risky",
  "~gi":"rival", "~gj":"river", "~gk":"road", "~gl":"robot", "~gm":"rock",
  "~gn":"rocket", "~go":"rocky", "~gp":"role", "~gq":"roll", "~gr":"roof",
  "~gs":"room", "~gt":"root", "~gu":"rose", "~gv":"rouge", "~gw":"rough",
  "~gx":"round", "~gy":"route", "~gz":"rover", "~gA":"royal", "~gB":"rugby",
  "~gC":"ruin", "~gD":"rule", "~gE":"ruler", "~gF":"rural", "~gG":"rush",
  "~gH":"safe", "~gI":"sail", "~gJ":"salt", "~gK":"same", "~gL":"sample",
  "~gM":"savage", "~gN":"save", "~gO":"saving", "~gP":"says", "~gQ":"scale",
  "~gR":"scene", "~gS":"science", "~gT":"score", "~gU":"scout", "~gV":"seal",
  "~gW":"second", "~gX":"secret", "~gY":"section", "~gZ":"sector", "~h0":"seek",
  "~h1":"seize", "~h2":"select", "~h3":"self", "~h4":"sell", "~h5":"send",
  "~h6":"senior", "~h7":"sent", "~h8":"series", "~h9":"serve", "~ha":"service",
  "~hb":"settle", "~hc":"seven", "~hd":"several", "~he":"shade", "~hf":"shake",
  "~hg":"shall", "~hh":"shame", "~hi":"shape", "~hj":"share", "~hk":"sharp",
  "~hl":"shelf", "~hm":"shell", "~hn":"shift", "~ho":"shirt", "~hp":"shock",
  "~hq":"shore", "~hr":"short", "~hs":"should", "~ht":"shout", "~hu":"side",
  "~hv":"sight", "~hw":"sign", "~hx":"signal", "~hy":"silent", "~hz":"silk",
  "~hA":"silver", "~hB":"similar", "~hC":"simple", "~hD":"since", "~hE":"sing",
  "~hF":"single", "~hG":"sink", "~hH":"sister", "~hI":"site", "~hJ":"sixth",
  "~hK":"size", "~hL":"sized", "~hM":"skill", "~hN":"skin", "~hO":"skip",
  "~hP":"slate", "~hQ":"slave", "~hR":"sleep", "~hS":"slice", "~hT":"slide",
  "~hU":"slope", "~hV":"slow", "~hW":"slowly", "~hX":"small", "~hY":"smart",
  "~hZ":"smell", "~i0":"smile", "~i1":"smoke", "~i2":"snap", "~i3":"snow",
  "~i4":"society", "~i5":"soft", "~i6":"soil", "~i7":"solar", "~i8":"sold",
  "~i9":"sole", "~ia":"solid", "~ib":"solve", "~ic":"some", "~id":"somehow",
  "~ie":"someone", "~if":"song", "~ig":"soon", "~ih":"sorry", "~ii":"sort",
  "~ij":"soul", "~ik":"soup", "~il":"source", "~im":"south", "~in":"space",
  "~io":"span", "~ip":"spare", "~iq":"spark", "~ir":"speak", "~is":"spec",
  "~it":"special", "~iu":"speech", "~iv":"speed", "~iw":"spend", "~ix":"spice",
  "~iy":"spill", "~iz":"spin", "~iA":"spine", "~iB":"spirit", "~iC":"spit",
  "~iD":"split", "~iE":"spoke", "~iF":"spook", "~iG":"sport", "~iH":"spot",
  "~iI":"spray", "~iJ":"spread", "~iK":"squad", "~iL":"square", "~iM":"stable",
  "~iN":"stack", "~iO":"staff", "~iP":"stage", "~iQ":"stake", "~iR":"stall",
  "~iS":"stand", "~iT":"star", "~iU":"stare", "~iV":"start", "~iW":"started",
  "~iX":"state", "~iY":"static", "~iZ":"station", "~j0":"status", "~j1":"stay",
  "~j2":"stays", "~j3":"steel", "~j4":"steep", "~j5":"steer", "~j6":"stem",
  "~j7":"step", "~j8":"stick", "~j9":"still", "~ja":"stir", "~jb":"stock",
  "~jc":"stone", "~jd":"stood", "~je":"stop", "~jf":"store", "~jg":"storm",
  "~jh":"story", "~ji":"stove", "~jj":"stream", "~jk":"street", "~jl":"strict",
  "~jm":"string", "~jn":"strong", "~jo":"struck", "~jp":"struct", "~jq":"stuck",
  "~jr":"student", "~js":"studio", "~jt":"study", "~ju":"stuff", "~jv":"stunt",
  "~jw":"stupid", "~jx":"style", "~jy":"subject", "~jz":"submit", "~jA":"success",
  "~jB":"such", "~jC":"sudden", "~jD":"suffer", "~jE":"sugar", "~jF":"suit",
  "~jG":"suite", "~jH":"summer", "~jI":"super", "~jJ":"supply", "~jK":"support",
  "~jL":"sure", "~jM":"surface", "~jN":"surge", "~jO":"swamp", "~jP":"swap",
  "~jQ":"swear", "~jR":"sweet", "~jS":"swift", "~jT":"swing", "~jU":"switch",
  "~jV":"sword", "~jW":"sync", "~jX":"syrup", "~jY":"table", "~jZ":"take",
  "~k0":"tale", "~k1":"talent", "~k2":"talk", "~k3":"tall", "~k4":"target",
  "~k5":"task", "~k6":"teacher", "~k7":"team", "~k8":"tear", "~k9":"tech",
  "~ka":"tell", "~kb":"test", "~kc":"text", "~kd":"than", "~ke":"that",
  "~kf":"their", "~kg":"them", "~kh":"then", "~ki":"there", "~kj":"these",
  "~kk":"they", "~kl":"thick", "~km":"thing", "~kn":"think", "~ko":"third",
  "~kp":"this", "~kq":"thorn", "~kr":"those", "~ks":"though", "~kt":"threat",
  "~ku":"three", "~kv":"threw", "~kw":"throat", "~kx":"throw", "~ky":"tick",
  "~kz":"ticket", "~kA":"tide", "~kB":"tied", "~kC":"ties", "~kD":"tiger",
  "~kE":"tight", "~kF":"tile", "~kG":"till", "~kH":"tilt", "~kI":"time",
  "~kJ":"tinker", "~kK":"tiny", "~kL":"tire", "~kM":"tired", "~kN":"tissue",
  "~kO":"title", "~kP":"today", "~kQ":"together", "~kR":"token", "~kS":"toll",
  "~kT":"tomato", "~kU":"tone", "~kV":"tongue", "~kW":"tonight", "~kX":"took",
  "~kY":"tool", "~kZ":"tops", "~l0":"torn", "~l1":"total", "~l2":"totally",
  "~l3":"touch", "~l4":"tough", "~l5":"tour", "~l6":"toward", "~l7":"towards",
  "~l8":"towel", "~l9":"town", "~la":"track", "~lb":"trade", "~lc":"trail",
  "~ld":"train", "~le":"trait", "~lf":"travel", "~lg":"tree", "~lh":"trend",
  "~li":"trial", "~lj":"tribe", "~lk":"trick", "~ll":"tried", "~lm":"trim",
  "~ln":"trio", "~lo":"trip", "~lp":"triple", "~lq":"trouble", "~lr":"truce",
  "~ls":"truck", "~lt":"true", "~lu":"truly", "~lv":"trust", "~lw":"truth",
  "~lx":"tube", "~ly":"tumor", "~lz":"tune", "~lA":"turn", "~lB":"tutor",
  "~lC":"twice", "~lD":"twin", "~lE":"type", "~lF":"typical", "~lG":"unborn",
  "~lH":"under", "~lI":"union", "~lJ":"unique", "~lK":"unity", "~lL":"until",
  "~lM":"update", "~lN":"upon", "~lO":"upper", "~lP":"upset", "~lQ":"upward",
  "~lR":"urban", "~lS":"usage", "~lT":"used", "~lU":"useful", "~lV":"user",
  "~lW":"usual", "~lX":"usually", "~lY":"utter", "~lZ":"valid", "~m0":"value",
  "~m1":"vary", "~m2":"vast", "~m3":"veil", "~m4":"vent", "~m5":"very",
  "~m6":"video", "~m7":"view", "~m8":"vigil", "~m9":"village", "~ma":"viral",
  "~mb":"virus", "~mc":"visit", "~md":"visual", "~me":"vital", "~mf":"vivid",
  "~mg":"voice", "~mh":"vote", "~mi":"voter", "~mj":"wade", "~mk":"wait",
  "~ml":"walk", "~mm":"wall", "~mn":"ward", "~mo":"warm", "~mp":"warn",
  "~mq":"wars", "~mr":"wash", "~ms":"waste", "~mt":"watch", "~mu":"water",
  "~mv":"wave", "~mw":"ways", "~mx":"weak", "~my":"wear", "~mz":"weary",
  "~mA":"weave", "~mB":"week", "~mC":"weird", "~mD":"well", "~mE":"were",
  "~mF":"west", "~mG":"whale", "~mH":"what", "~mI":"wheat", "~mJ":"wheel",
  "~mK":"when", "~mL":"where", "~mM":"whether", "~mN":"which", "~mO":"while",
  "~mP":"white", "~mQ":"whole", "~mR":"whose", "~mS":"wide", "~mT":"width",
  "~mU":"wife", "~mV":"wild", "~mW":"will", "~mX":"wind", "~mY":"wine",
  "~mZ":"winter", "~n0":"wire", "~n1":"wise", "~n2":"wish", "~n3":"with",
  "~n4":"within", "~n5":"without", "~n6":"woke", "~n7":"wolf", "~n8":"women",
  "~n9":"wonder", "~na":"wood", "~nb":"wooden", "~nc":"word", "~nd":"words",
  "~ne":"work", "~nf":"worker", "~ng":"working", "~nh":"world", "~ni":"worn",
  "~nj":"worry", "~nk":"worse", "~nl":"worst", "~nm":"worth", "~nn":"would",
  "~no":"wound", "~np":"wrap", "~nq":"write", "~nr":"writing", "~ns":"written",
  "~nt":"wrote", "~nu":"yacht", "~nv":"yard", "~nw":"year", "~nx":"yellow",
  "~ny":"young", "~nz":"your", "~nA":"youth", "~nB":"zebra", "~nC":"zero",
  "~nD":"zilch", "~nE":"zonal", "~nF":"zone"
};

  /* ─────────────────────────────────────────────────────────
   *  SUFFIX SYSTEM
   * ─────────────────────────────────────────────────────────
   *  Standard tokens: ~[0-9a-n][0-9a-zA-Z]   (3 chars, index 0-1467)
   *  Suffix  tokens:  ~[A-Z][0-9a-zA-Z][a-o] (4 chars)
   *  Uppercase first char = unambiguous suffix token marker
   * ───────────────────────────────────────────────────────── */
  var SUFFIX_TABLE = {
    'a': ['s',    false],  // works
    'b': ['es',   false],  // matches
    'c': ['ed',   false],  // worked
    'd': ['ed',   true ],  // loved   (e-drop)
    'e': ['ing',  false],  // working
    'f': ['ing',  true ],  // loving  (e-drop)
    'g': ['er',   false],  // stronger
    'h': ['er',   true ],  // writer  (e-drop)
    'i': ['ers',  false],  // workers
    'j': ['ly',   false],  // carefully
    'k': ['ness', false],  // kindness
    'l': ['ment', false],  // movement
    'm': ['ful',  false],  // helpful
    'n': ['less', false],  // harmless
    'o': ['tion', false]   // action
  };

  var SUFFIX_STRIP = [
    ['tion','o'], ['ness','k'], ['ment','l'], ['less','n'],
    ['ful','m'],  ['ers','i'],  ['ing','e'],  ['ing','f'],
    ['ed','c'],   ['ed','d'],   ['er','g'],   ['er','h'],
    ['ly','j'],   ['es','b'],   ['s','a']
  ];

  var SUFFIX_CODES = Object.keys(SUFFIX_TABLE);

  /* ─────────────────────────────────────────────────────────
   *  SAFE INPUT COERCION
   *  Converts ANY input to a string without throwing.
   * ───────────────────────────────────────────────────────── */
  function _safeStr(input) {
    if (input === null || input === undefined) return '';
    if (typeof input === 'string') return input;
    if (typeof input === 'number' || typeof input === 'boolean') return String(input);
    if (Array.isArray(input)) return input.join(' ');
    if (typeof input === 'object') {
      try { return JSON.stringify(input); } catch (e) { return String(input); }
    }
    try { return String(input); } catch (e) { return ''; }
  }

  /* ─────────────────────────────────────────────────────────
   *  SUFFIX HELPERS
   * ───────────────────────────────────────────────────────── */
  function _makeSufTok(rootIdx, sfxCode) {
    return '~' + String.fromCharCode(65 + Math.floor(rootIdx / 62)) + B62[rootIdx % 62] + sfxCode;
  }

  function _decodeSufTok(tok) {
    try {
      var rootIdx = (tok.charCodeAt(1) - 65) * 62 + (B62IDX[tok[2]] || 0);
      var sfxCode = tok[3];
      var rule    = SUFFIX_TABLE[sfxCode];
      if (!rule || rootIdx >= _SX_WORDS.length) return tok;
      var root   = _SX_WORDS[rootIdx];
      var sfxStr = rule[0];
      var eDrop  = rule[1];
      return (eDrop && root.length > 0 && root[root.length - 1] === 'e')
        ? root.slice(0, -1) + sfxStr
        : root + sfxStr;
    } catch (e) { return tok; }
  }

  function _stemEncode(word) {
    try {
      for (var si = 0; si < SUFFIX_STRIP.length; si++) {
        var sfxStr  = SUFFIX_STRIP[si][0];
        var sfxCode = SUFFIX_STRIP[si][1];
        var rule    = SUFFIX_TABLE[sfxCode];
        if (word.length <= sfxStr.length) continue;
        if (word.slice(-sfxStr.length) !== sfxStr) continue;
        var root = word.slice(0, -sfxStr.length);
        if (_SX_ENCODE[root] !== undefined) {
          var ri = _SX_WORDS.indexOf(root);
          if (ri >= 0) return _makeSufTok(ri, sfxCode);
        }
        if (rule[1]) {
          var rootE = root + 'e';
          if (_SX_ENCODE[rootE] !== undefined) {
            var riE = _SX_WORDS.indexOf(rootE);
            if (riE >= 0) return _makeSufTok(riE, sfxCode);
          }
        }
      }
    } catch (e) { /* stem failed silently */ }
    return null;
  }

  /* ─────────────────────────────────────────────────────────
   *  CUSTOM DICTIONARY LOADER
   *  Automatically loads symblex-custom.json from the same
   *  directory as symblex.js when running in Node.js.
   *  In the browser, call Symblex.loadCustomDict(obj) manually.
   * ───────────────────────────────────────────────────────── */
  var _customDictLoaded = false;
  var _customWords      = 0;

  function _loadCustomDictNode() {
    try {
      var path = require('path');
      var fs   = require('fs');
      var dir  = path.dirname(require.resolve ? require.resolve('./symblex') : __filename);
      var fp   = path.join(dir, 'symblex-custom.json');
      if (!fs.existsSync(fp)) return;
      var raw  = fs.readFileSync(fp, 'utf8');
      var dict = JSON.parse(raw);
      _mergeCustomDict(dict);
      _customDictLoaded = true;
      if (typeof console !== 'undefined') {
        console.log('[Symblex] Custom dictionary loaded: ' + fp + ' (' + _customWords + ' custom words)');
      }
    } catch (e) {
      /* No custom dict or unreadable — continue silently */
    }
  }

  function _mergeCustomDict(dict) {
    try {
      var enc = dict.encode || dict;
      var dec = dict.decode || {};
      var added = 0;
      Object.keys(enc).forEach(function (word) {
        var tok = enc[word];
        if (typeof word === 'string' && typeof tok === 'string' && word.length >= 4) {
          _SX_ENCODE[word.toLowerCase()] = tok;
          _SX_DECODE[tok] = word.toLowerCase();
          if (!_SX_WORDS.includes(word.toLowerCase())) _SX_WORDS.push(word.toLowerCase());
          added++;
        }
      });
      Object.keys(dec).forEach(function (tok) {
        var word = dec[tok];
        if (typeof tok === 'string' && typeof word === 'string') {
          if (_SX_DECODE[tok] === undefined) _SX_DECODE[tok] = word.toLowerCase();
        }
      });
      _customWords += added;
    } catch (e) { /* merge error — continue */ }
  }

  /* ─────────────────────────────────────────────────────────
   *  PUBLIC: loadCustomDict(dict)
   *  For browser or manual loading.
   *  dict = parsed JSON object with encode/decode maps
   * ───────────────────────────────────────────────────────── */
  function loadCustomDict(dict) {
    try {
      if (!dict || typeof dict !== 'object') return false;
      _mergeCustomDict(dict);
      _customDictLoaded = true;
      return true;
    } catch (e) { return false; }
  }

  /* ─────────────────────────────────────────────────────────
   *  CORE: encode(text)
   *  Input:  any value (auto-coerced to string)
   *  Output: string with ~XX / ~XXX tokens, or original if
   *          a word is not in the dictionary/stems
   *
   *  Behaviour by input type:
   *    string        → compressed where possible
   *    number        → coerced to string, then compressed
   *    null/undef    → returns ""
   *    object/array  → coerced to string
   *    non-Latin     → passed through unchanged
   *    emoji         → passed through unchanged
   *    numbers in    → passed through unchanged (e.g. "work2023")
   *    mixed case    → case-insensitive lookup, lowercase output
   * ───────────────────────────────────────────────────────── */
  function encode(input) {
    try {
      var text = _safeStr(input);
      if (!text) return '';
      return text.replace(/[a-zA-Z]+/g, function (match) {
        try {
          var lower = match.toLowerCase();
          var tok   = _SX_ENCODE[lower];
          if (tok !== undefined) return tok;
          var stok  = _stemEncode(lower);
          if (stok !== null) return stok;
          return match;
        } catch (e) { return match; }
      });
    } catch (e) { return _safeStr(input); }
  }

  /* ─────────────────────────────────────────────────────────
   *  CORE: decode(text)
   *  Expands all ~XX and ~XXX tokens back to words.
   *  Unknown tokens (not in dict) pass through unchanged.
   *  NEVER crashes.
   * ───────────────────────────────────────────────────────── */
  function decode(input) {
    try {
      var text = _safeStr(input);
      if (!text) return '';
      return text.replace(/~[0-9a-zA-Z]{2,3}/g, function (tok) {
        try {
          if (tok.length === 3) {
            return _SX_DECODE[tok] !== undefined ? _SX_DECODE[tok] : tok;
          }
          if (tok.length === 4) {
            var fc = tok.charCodeAt(1);
            if (fc >= 65 && fc <= 90) return _decodeSufTok(tok);
          }
          return tok;
        } catch (e) { return tok; }
      });
    } catch (e) { return _safeStr(input); }
  }

  /* ─────────────────────────────────────────────────────────
   *  encodeToURL(text) / decodeFromURL(text)
   *  URL-safe versions: spaces become +
   *  Tilde (~) is RFC 3986 unreserved — zero %-encoding needed
   * ───────────────────────────────────────────────────────── */
  function encodeToURL(input) {
    try { return encode(input).replace(/ /g, '+'); }
    catch (e) { return _safeStr(input); }
  }

  function decodeFromURL(input) {
    try {
      var text = _safeStr(input).replace(/\+/g, ' ').replace(/%20/g, ' ');
      return decode(text);
    } catch (e) { return _safeStr(input); }
  }

  /* ─────────────────────────────────────────────────────────
   *  BINARY PACK  (Layer 3)
   *  Bit-level encoding → base64url output
   *
   *  Bit format:
   *    [0][11-bit word index]          = 12 bits (dict word)
   *    [1][0][11-bit root][4-bit sfx]  = 17 bits (stem word)
   *    [1][1][0]                       =  3 bits (space)
   *    [1][1][1][7-bit ASCII]          = 10 bits (raw char)
   *    [0][11111111111]                = 12 bits (END sentinel)
   * ───────────────────────────────────────────────────────── */
  function packToBase64url(input) {
    try {
      var text = _safeStr(input);
      if (!text) return '';
      var bits = [];

      function pushBits(val, count) {
        for (var b = count - 1; b >= 0; b--) bits.push((val >> b) & 1);
      }

      var parts = text.split(/([a-zA-Z]+)/);
      for (var pi = 0; pi < parts.length; pi++) {
        var part = parts[pi];
        if (!part) continue;
        if (/^[a-zA-Z]+$/.test(part)) {
          var lower = part.toLowerCase();
          var tok   = _SX_ENCODE[lower];
          if (tok !== undefined) {
            pushBits(0, 1);
            pushBits(_SX_WORDS.indexOf(lower), 11);
          } else {
            var stok = _stemEncode(lower);
            if (stok !== null) {
              var rootIdx = (stok.charCodeAt(1) - 65) * 62 + (B62IDX[stok[2]] || 0);
              var sfxIdx  = SUFFIX_CODES.indexOf(stok[3]);
              pushBits(2, 2);
              pushBits(rootIdx, 11);
              pushBits(sfxIdx < 0 ? 0 : sfxIdx, 4);
            } else {
              for (var ci = 0; ci < part.length; ci++) {
                pushBits(7, 3);
                pushBits(part.charCodeAt(ci) & 0x7F, 7);
              }
            }
          }
        } else {
          for (var ci2 = 0; ci2 < part.length; ci2++) {
            var ch = part[ci2];
            if (ch === ' ') { pushBits(6, 3); }
            else {
              var code = ch.charCodeAt(0);
              if (code < 128) { pushBits(7, 3); pushBits(code & 0x7F, 7); }
              else {
                /* Non-ASCII: encode as UTF-8 escape sequence marker 0xFE + 2 raw bytes */
                var encoded = encodeURIComponent(ch);
                for (var ei = 0; ei < encoded.length; ei++) {
                  pushBits(7, 3);
                  pushBits(encoded.charCodeAt(ei) & 0x7F, 7);
                }
              }
            }
          }
        }
      }
      /* END sentinel */
      pushBits(0, 1);
      pushBits(2047, 11);
      /* Pad to multiple of 6 */
      while (bits.length % 6 !== 0) bits.push(0);
      var result = '';
      for (var bi = 0; bi < bits.length; bi += 6) {
        var v = (bits[bi]<<5)|(bits[bi+1]<<4)|(bits[bi+2]<<3)|(bits[bi+3]<<2)|(bits[bi+4]<<1)|bits[bi+5];
        result += BASE64URL[v];
      }
      return result;
    } catch (e) { return encodeToURL(_safeStr(input)); }
  }

  function unpackFromBase64url(input) {
    try {
      var b64 = _safeStr(input);
      if (!b64) return '';
      var bits = [];
      for (var ci = 0; ci < b64.length; ci++) {
        var val = BASE64URL.indexOf(b64[ci]);
        if (val < 0) continue;
        for (var b = 5; b >= 0; b--) bits.push((val >> b) & 1);
      }
      function readBits(count) {
        var v = 0;
        for (var i = 0; i < count; i++) v = (v << 1) | (bits.shift() || 0);
        return v;
      }
      var result = '';
      while (bits.length >= 3) {
        var f1 = readBits(1);
        if (f1 === 0) {
          var idx = readBits(11);
          if (idx >= _SX_WORDS.length) break; /* END sentinel */
          result += _SX_WORDS[idx];
        } else {
          var f2 = readBits(1);
          if (f2 === 0) {
            if (bits.length < 15) break;
            var rIdx   = readBits(11);
            var sfxIdx = readBits(4);
            var sfxCd  = SUFFIX_CODES[sfxIdx];
            var rule   = sfxCd ? SUFFIX_TABLE[sfxCd] : null;
            if (rIdx < _SX_WORDS.length && rule) {
              var root = _SX_WORDS[rIdx];
              result += (rule[1] && root.length > 0 && root[root.length-1]==='e')
                ? root.slice(0,-1)+rule[0] : root+rule[0];
            }
          } else {
            var f3 = readBits(1);
            if (f3 === 0) { result += ' '; }
            else {
              if (bits.length < 7) break;
              result += String.fromCharCode(readBits(7));
            }
          }
        }
      }
      return result;
    } catch (e) { return _safeStr(input); }
  }

  /* ─────────────────────────────────────────────────────────
   *  stats(text) — full compression report
   * ───────────────────────────────────────────────────────── */
  function stats(input) {
    try {
      var text       = _safeStr(input);
      var compressed = encode(text);
      var packed     = packToBase64url(text);
      var orig       = text.length;
      var comp       = compressed.length;
      var bin        = packed.length;
      var saved      = orig - comp;
      var savedBin   = orig - bin;
      var words      = text.match(/[a-zA-Z]{4,}/g) || [];
      var dictHits   = words.filter(function(w){ return _SX_ENCODE[w.toLowerCase()] !== undefined; });
      var stemHits   = words.filter(function(w){
        return _SX_ENCODE[w.toLowerCase()] === undefined && _stemEncode(w.toLowerCase()) !== null;
      });
      return {
        original:        orig,
        textEncoded:     comp,
        binaryEncoded:   bin,
        savedText:       saved,
        savedBinary:     savedBin,
        ratioText:       orig > 0 ? ((saved  / orig) * 100).toFixed(1) + '%' : '0%',
        ratioBinary:     orig > 0 ? ((savedBin/orig) * 100).toFixed(1) + '%' : '0%',
        wordsScanned:    words.length,
        dictHits:        dictHits.length,
        stemHits:        stemHits.length,
        totalHits:       dictHits.length + stemHits.length,
        hitRate:         words.length > 0
          ? (((dictHits.length+stemHits.length)/words.length)*100).toFixed(1)+'%' : '0%',
        customDictLoaded: _customDictLoaded,
        customWords:     _customWords,
        encodedOutput:   compressed
      };
    } catch (e) {
      return { error: e.message, original: _safeStr(input).length };
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  lookup(word) / reverse(token) / list()
   * ───────────────────────────────────────────────────────── */
  function lookup(word) {
    try {
      if (!word) return null;
      var lower = _safeStr(word).toLowerCase();
      return _SX_ENCODE[lower] || _stemEncode(lower) || null;
    } catch (e) { return null; }
  }

  function reverse(token) {
    try {
      if (!token) return null;
      var tok = _safeStr(token);
      if (tok.length === 3) return _SX_DECODE[tok] || null;
      if (tok.length === 4 && tok[1] >= 'A' && tok[1] <= 'Z') return _decodeSufTok(tok);
      return null;
    } catch (e) { return null; }
  }

  function list() {
    try { return _SX_WORDS.slice().sort(); }
    catch (e) { return []; }
  }

  /* ─────────────────────────────────────────────────────────
   *  runtime() — WHERE IS SYMBLEX RUNNING?
   *  Returns information about the current execution environment.
   *  Use this to detect platform, verify the library loaded,
   *  and check if a custom dictionary is active.
   *
   *  Example:
   *    Symblex.runtime();
   *    // {
   *    //   environment: "node",
   *    //   platform: "linux",
   *    //   nodeVersion: "v20.11.0",
   *    //   version: "3.0.0",
   *    //   dictionarySize: 1468,
   *    //   customDictLoaded: false,
   *    //   customWords: 0,
   *    //   author: "Prapan Biswas",
   *    //   github: "https://github.com/prapanbiswas/symblex"
   *    // }
   * ───────────────────────────────────────────────────────── */
  function runtime() {
    try {
      var env      = 'unknown';
      var platform = 'unknown';
      var nodeVer  = null;
      var userAgent = null;

      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        env      = 'node';
        platform = (process.platform || 'unknown');
        nodeVer  = process.version;
      } else if (typeof Deno !== 'undefined') {
        env      = 'deno';
        platform = (typeof Deno.build !== 'undefined' ? Deno.build.os : 'unknown');
      } else if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        env      = 'browser';
        platform = navigator.platform || 'unknown';
        userAgent = navigator.userAgent || null;
      } else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
        env = 'webworker';
      }

      return {
        environment:      env,
        platform:         platform,
        nodeVersion:      nodeVer,
        userAgent:        userAgent,
        version:          VERSION,
        author:           AUTHOR,
        github:           GITHUB,
        license:          LICENSE,
        dictionarySize:   _SX_WORDS.length,
        customDictLoaded: _customDictLoaded,
        customWords:      _customWords,
        timestamp:        new Date().toISOString()
      };
    } catch (e) {
      return { version: VERSION, author: AUTHOR, error: e.message };
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  CLI HANDLER  (only active when run directly with Node.js)
   *  node symblex.js encode "your text"
   *  node symblex.js decode "~ng ~kQ ~l6"
   *  node symblex.js url    "your text"
   *  node symblex.js pack   "your text"
   *  node symblex.js unpack "<base64url>"
   *  node symblex.js stats  "your text"
   *  node symblex.js lookup "freedom"
   *  node symblex.js runtime
   *  node symblex.js list
   * ───────────────────────────────────────────────────────── */
  function _runCLI() {
    var args  = process.argv.slice(2);
    var cmd   = args[0];
    var input = args.slice(1).join(' ');

    if (!cmd) {
      console.log('');
      console.log('  Symblex v' + VERSION + ' by ' + AUTHOR);
      console.log('  URL-safe word compression — ' + GITHUB);
      console.log('  License: ' + LICENSE);
      console.log('');
      console.log('  Commands:');
      console.log('    encode   <text>        Compress text to tokens');
      console.log('    decode   <tokens>      Expand tokens to text');
      console.log('    url      <text>        URL-safe encode (spaces → +)');
      console.log('    pack     <text>        Binary base64url pack');
      console.log('    unpack   <base64url>   Binary unpack');
      console.log('    stats    <text>        Compression statistics');
      console.log('    lookup   <word>        Look up token for a word');
      console.log('    runtime               Show runtime environment');
      console.log('    list                   List all dictionary words');
      console.log('');
      console.log('  Examples:');
      console.log('    node symblex.js encode "working together toward freedom"');
      console.log('    node symblex.js stats  "people working together"');
      console.log('    node symblex.js runtime');
      console.log('');
      process.exit(0);
    }

    switch (cmd) {
      case 'encode':  console.log(encode(input));  break;
      case 'decode':  console.log(decode(input));  break;
      case 'url':     console.log(encodeToURL(input)); break;
      case 'pack':    console.log(packToBase64url(input)); break;
      case 'unpack':  console.log(unpackFromBase64url(input)); break;
      case 'stats':   console.log(JSON.stringify(stats(input), null, 2)); break;
      case 'runtime': console.log(JSON.stringify(runtime(), null, 2)); break;
      case 'list':    list().forEach(function(w){ console.log(w + '  →  ' + lookup(w)); }); break;
      case 'lookup': {
        var t = lookup(input.trim());
        console.log(t ? '"' + input.trim() + '" → "' + t + '"' : '"' + input.trim() + '" not in dictionary');
        break;
      }
      default:
        console.error('Unknown command: ' + cmd + '. Run without arguments for help.');
        process.exit(1);
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  AUTO-INIT: load custom dict on Node.js startup
   * ───────────────────────────────────────────────────────── */
  if (typeof process !== 'undefined' && typeof require !== 'undefined') {
    try { _loadCustomDictNode(); } catch (e) { /* silent */ }
  }

  /* ─────────────────────────────────────────────────────────
   *  AUTO-RUN CLI if this file is executed directly
   * ───────────────────────────────────────────────────────── */
  if (typeof process !== 'undefined' && typeof require !== 'undefined' &&
      require.main === module) {
    _runCLI();
  }

  /* ─────────────────────────────────────────────────────────
   *  PUBLIC API
   * ───────────────────────────────────────────────────────── */
  return {
    encode:              encode,
    decode:              decode,
    encodeToURL:         encodeToURL,
    decodeFromURL:       decodeFromURL,
    packToBase64url:     packToBase64url,
    unpackFromBase64url: unpackFromBase64url,
    stats:               stats,
    lookup:              lookup,
    reverse:             reverse,
    list:                list,
    loadCustomDict:      loadCustomDict,
    runtime:             runtime,
    VERSION:             VERSION,
    AUTHOR:              AUTHOR,
    GITHUB:              GITHUB,
    LICENSE:             LICENSE,
    DICTIONARY_SIZE:     _SX_WORDS.length
  };
}));
