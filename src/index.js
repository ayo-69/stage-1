const express = require("express");
const app = express();
const crypto = require("crypto");
const morgan = require("morgan");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

// In-memory store
const stringStore = new Map();

// ✅ POST /strings - Create and analyze a string
app.post("/strings", (req, res) => {
  const { value } = req.body;

  if (value === undefined) {
    return res.status(422).json({ error: "Missing 'value' field" });
  }
  if (typeof value !== "string") {
    return res.status(422).json({ error: "'value' must be a string" });
  }

  const str = value.trim();
  if (!str) {
    return res.status(400).json({ error: "'value' cannot be empty" });
  }

  const hash = crypto.createHash("sha256").update(str).digest("hex");
  if (stringStore.has(hash)) {
    return res.status(409).json({ error: "String already exists" });
  }

  const lower = str.toLowerCase();
  const isPalindrome = lower === lower.split("").reverse().join("");

  const charFreq = {};
  for (const ch of str) {
    charFreq[ch] = (charFreq[ch] || 0) + 1;
  }

  const wordCount = str.split(/\s+/).filter(Boolean).length;

  const properties = {
    length: str.length,
    is_palindrome: isPalindrome,
    unique_characters: new Set(str).size,
    word_count: wordCount,
    sha256_hash: hash,
    character_frequency_map: charFreq,
  };

  const obj = {
    id: hash,
    value: str,
    properties,
    created_at: new Date().toISOString(),
  };

  stringStore.set(hash, obj);
  return res.status(201).json(obj);
});

// ✅ GET /strings/:value - Retrieve a string by value
app.get("/strings/:value", (req, res) => {
  const { value } = req.params;

  if (!value || typeof value !== "string") {
    return res.status(400).json({ error: "Invalid string value" });
  }

  const str = value.trim();
  if (!str) {
    return res.status(400).json({ error: "String cannot be empty" });
  }

  const hash = crypto.createHash("sha256").update(str).digest("hex");
  const stored = stringStore.get(hash);
  if (!stored) {
    return res.status(404).json({ error: "String not found" });
  }

  return res.status(200).json(stored);
});

// ✅ GET /strings with query filters
app.get("/strings", (req, res) => {
  const { is_palindrome, min_length, max_length, word_count, contains_character } = req.query;

  if (is_palindrome && !["true", "false"].includes(is_palindrome.toLowerCase())) {
    return res.status(400).json({ error: "is_palindrome must be true or false" });
  }
  if (min_length && isNaN(parseInt(min_length))) {
    return res.status(400).json({ error: "min_length must be an integer" });
  }
  if (max_length && isNaN(parseInt(max_length))) {
    return res.status(400).json({ error: "max_length must be an integer" });
  }
  if (word_count && isNaN(parseInt(word_count))) {
    return res.status(400).json({ error: "word_count must be an integer" });
  }
  if (contains_character && contains_character.length !== 1) {
    return res.status(400).json({ error: "contains_character must be a single character" });
  }

  const filters = {
    is_palindrome: is_palindrome !== undefined ? is_palindrome.toLowerCase() === "true" : undefined,
    min_length: min_length ? parseInt(min_length) : null,
    max_length: max_length ? parseInt(max_length) : null,
    word_count: word_count ? parseInt(word_count) : null,
    contains_character: contains_character || null,
  };

  const filtered = Array.from(stringStore.values()).filter((obj) => {
    const props = obj.properties;

    if (filters.is_palindrome !== undefined && props.is_palindrome !== filters.is_palindrome) return false;
    if (filters.min_length !== null && props.length < filters.min_length) return false;
    if (filters.max_length !== null && props.length > filters.max_length) return false;
    if (filters.word_count !== null && props.word_count !== filters.word_count) return false;
    if (filters.contains_character && !props.character_frequency_map[filters.contains_character]) return false;

    return true;
  });

  return res.status(200).json({
    data: filtered,
    count: filtered.length,
    filters_applied: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== null && v !== undefined)),
  });
});

// ✅ Natural Language Parser
function parseNaturalLanguage(query) {
  query = query.toLowerCase();
  const filters = {};

  if (query.includes("palindrome") || query.includes("palindromic")) filters.is_palindrome = true;

  if (query.includes("single word")) filters.word_count = 1;

  const lengthMatch = query.match(/long(er)? than (\d+) characters?/);
  if (lengthMatch) filters.min_length = parseInt(lengthMatch[2]) + 1;

  const containsMatch = query.match(/contains(?: the)? letter (\w)/);
  if (containsMatch) filters.contains_character = containsMatch[1];

  return Object.keys(filters).length ? filters : null;
}

// ✅ GET /strings/filter-by-natural-language
app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const parsedFilters = parseNaturalLanguage(query);
  if (!parsedFilters) {
    return res.status(400).json({ error: "Unable to parse natural language query" });
  }

  const filtered = Array.from(stringStore.values()).filter((obj) => {
    const props = obj.properties;
    if (parsedFilters.is_palindrome !== undefined && props.is_palindrome !== parsedFilters.is_palindrome) return false;
    if (parsedFilters.word_count !== undefined && props.word_count !== parsedFilters.word_count) return false;
    if (parsedFilters.min_length !== undefined && props.length < parsedFilters.min_length) return false;
    if (parsedFilters.contains_character !== undefined && !props.character_frequency_map[parsedFilters.contains_character]) return false;
    return true;
  });

  return res.status(200).json({
    data: filtered,
    count: filtered.length,
    interpreted_query: {
      original: query,
      parsed_filters: parsedFilters,
    },
  });
});

// ✅ DELETE /strings/:value
app.delete("/strings/:value", (req, res) => {
  const { value } = req.params;

  if (!value || typeof value !== "string") {
    return res.status(400).json({ error: "Invalid string value" });
  }

  const str = value.trim();
  if (!str) return res.status(400).json({ error: "String cannot be empty" });

  const hash = crypto.createHash("sha256").update(str).digest("hex");
  if (!stringStore.has(hash)) {
    return res.status(404).json({ error: "String not found" });
  }

  stringStore.delete(hash);
  return res.status(204).send();
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

