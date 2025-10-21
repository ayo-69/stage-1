const express = require("express");
const app = express();
const crypto = require("crypto");
const morgan = require("morgan");
const { count } = require("console");

// Middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(morgan("tiny"));

// In-memory store
const stringStore = new Map();

// Routes
app.post("/strings", (req, res) => {
  const { value } = req.body;

  // Validation
  if (value === undefined) return res.status(400).json({ error: "Missing 'value', field"});
  if (typeof value !== 'string') return res.status(422).json({ error: "'value' must be a string" });
  const str = value.trim();
  if (!str) return res.status(400).json({ error: "'value' cannot be empty" });

  const hash = crypto.createHash('sha256').update(str).digest('hex');

  if (stringStore.has(hash)) return res.status(409).json({ error: "String already exists" });

  const lower = str.toLowerCase();
  const isPalidrome = lower === lower.split('').reverse().join('');

  const charFreq = {};
  const uniqueChars = new Set();
  for ( const ch of str) {
    uniqueChars.add(ch);
    charFreq[ch] = (charFreq[ch] || 0 ) + 1;
  }

  const wordCount = str.split(/\s+/).filter(Boolean).length;

  const properties = {
    length: str.length,
    is_palidrome: isPalidrome,
    unique_characters: uniqueChars.size,
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

  res.status(201).json(obj);
});

app.get("/strings/:value", (req, res) => {
  const { value } = req.params;
  if (!value || typeof value !== 'string') {
    return res.status(400).json({ error: "Invalid string value" });
  }

  const str = value.trim();
  if (!str) return res.status(400).json({ error: "String cannot be empty" });

  const hash = crypto.createHash('sha256').update(str).digest('hex');

  const stored = stringStore.get(hash);
  res.status(200).json(stored);
});

app.get("/strings/", (req, res) => {
  const { is_palidrome, min_length, max_length, word_count, contains_character } = req.query;

  if (is_palidrome && !['true', 'false'].includes(is_palidrome.toLowerCase())) {
    return res.status(400).json({ error: "is_palidrome must be true or false" });
  }
  if (min_length && isNaN(parseInt(min_length))) return res.status(400).json({ error: "min_length must be an interger" });
  if (max_length && isNaN(parseInt(max_length))) return res.status(400).json({ error: "max_length must be an interger" });
  if (word_count && isNaN(parseInt(word_count))) return res.status(400).json({ error: "word_count must be an interger" });
  if (contains_character && contains_character.length !== 1) return res.status(400).json({ error: "contains_character must be a single character" });

  const filters = {
    is_palidrome: is_palidrome?.toLowerCase() === 'true',
    min_length: min_length ? parseInt(min_length) : null,
    max_length: max_length ? parseInt(max_length) : null,
    word_count: word_count ? parseInt(word_count) : null,
    contains_character: contains_character || null
  };

  const filtered = Array.from(stringStore.values()).filter(obj => {
    const props = obj.properties;

    if (filters.is_palidrome !== undefined && filters.is_palidrome !== props.is_palidrome) return false;
    if (filters.min_length !== null && props.length < filters.min_length) return false;
    if (filters.max_length !== null && props.length > filters.max_length) return false;
    if (filters.contains_character && !props.character_frequency_map[filters.contains_character]) return false;

    return true;
  });

  res.status(200).json({
    data: filtered,
    count: filtered.length,
    filtered_applied: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== null && v !== undefined))
  });
});

function parseNaturalLanguage(query) {
  query = query.toLowerCase();

  const filters = {};

  if (query.includes("palindromic") || query.includes("palidrome")) filters.is_palidrome = true;

  if (query.includes("single word")) filters.word_count = 1;

  const lengthMatch = query.match(/long(er)? than (\d+) characters?/);
  if (lengthMatch) filters.min_length = parseInt(lengthMatch[2]) + 1;

  const containsMatch = query.match(/contains(?: the)? letter (\w)/);
  if (containsMatch) filters.contains_character = containsMatch;

  if (Object.keys(filters).length === 0) return null;

  return filters;
}

app.get("/strings/filter-by-natural-language", (req, res) => {
   const { query } = req.query; 
   if (!query || typeof query !== 'string') {
     return res.status(400).json({ error: "Query parameter is required" });
   }

   const parsedFilters = parseNatural(query);
   if (!parsedFilters) {
     return res.status(400).json({ error: "Unable to parse natural language query"});
   }

   const filtered = Array.from(stringStore.values()).filter(obj => {
     const props = obj.properties;
     if (parsedFilters.is_palindrome !== undefined && props.is_palindrome !== parsedFilters.is_palindrome) return false;
     if (parsedFilters.word_count !== undefined && props.word_count !== parsedFilters.word_count) return false;
     if (parsedFilters.min_length !== undefined && props.length < parsedFilters.min_length) return false;
     if (parsedFilters.contains_character !== undefined && !props.character_frequency_map[parsedFilters.contains_character]) return false;
     return true;
   });

   res.status(200).json({
     data: filtered,
     count: filtered.length,
     interpreted_query: {
       original: query,
       parsed_filters: parsedFilters
     }
   });
});

app.delete("/strings/:value", (req, res) => {
  const { value } = req.params;

  if (!value || typeof value !== 'string') {
    return res.status(400).json({ error: "Invalid string value" });
  }

  const str = value.trim();
  if (!str) return res.status(400).json({ error: "String cannot be empty" });

  const hash = crypto.createHash('sha256').update(str).digest('hex');

  if (!stringStore.has(hash)) return res.status(404).json({ error: "String not found" });

  stringStore.delete(hash);

  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
})
