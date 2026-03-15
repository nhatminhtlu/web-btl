/**
 * AI Brand Name & Slogan Generator
 * ─────────────────────────────────
 * Stack  : Vanilla JavaScript (ES6+), Google Gemini API
 * Author : Web Technology Final Project
 *
 * Public functions
 *   generateIdeas()      — main entry point triggered by form submission
 *   callAIAPI()          — sends prompt to Gemini and returns parsed JSON
 *   renderResults()      — builds and injects result cards into the DOM
 *   copyToClipboard()    — copies a given text string to the clipboard
 */

'use strict';

/* =====================================================================
   CONSTANTS
   ===================================================================== */

/** Gemini REST endpoint — using gemini-2.5-flash. */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** Preferred same-origin proxy endpoint (Vercel Serverless Function). */
const GEMINI_PROXY_API_URL = '/api/generate';

/** Local frontend environment file paths for static hosting fallback. */
const ENV_FILE_PATHS = ['./.env', '/.env', './.env.local', '/.env.local'];

/**
 * Normalises a .env value by trimming spaces and optional surrounding quotes.
 * @param {string} rawValue
 * @returns {string}
 */
function normaliseEnvValue(rawValue) {
  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return value.trim();
}

/**
 * Extracts an environment variable from .env file content.
 * @param {string} envText
 * @param {string} keyName
 * @returns {string}
 */
function extractEnvVar(envText, keyName) {
  const lines = envText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (key === keyName) {
      return normaliseEnvValue(rawValue);
    }
  }

  return '';
}

/**
 * Loads GEMINI_API_KEY from local .env file served by the static server.
 * @returns {Promise<string>}
 */
async function getApiKeyFromEnvFile() {
  for (const envPath of ENV_FILE_PATHS) {
    try {
      const response = await fetch(envPath, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const envText = await response.text();
      const apiKey = extractEnvVar(envText, 'GEMINI_API_KEY');

      if (apiKey) {
        return apiKey;
      }
    } catch {
      continue;
    }
  }

  return '';
}

/* =====================================================================
   DOM REFERENCES
   ===================================================================== */

const form            = document.getElementById('generatorForm');
const industryInput   = document.getElementById('industry');
const keywordsInput   = document.getElementById('keywords');
const targetInput     = document.getElementById('target');
const generateBtn     = document.getElementById('generateBtn');
const regenerateBtn   = document.getElementById('regenerateBtn');
const loadingEl       = document.getElementById('loading');
const resultsEl       = document.getElementById('results');
const apiErrorEl      = document.getElementById('apiError');
const brandNamesGrid  = document.getElementById('brandNamesGrid');
const slogansGrid     = document.getElementById('slogansGrid');

// NEW: Advanced options
const brandStyleSelect = document.getElementById('brandStyle');
const languageSelect   = document.getElementById('language');
const numResultsSlider = document.getElementById('numResults');
const numResultsValue  = document.getElementById('numResultsValue');

// NEW: Export
const exportBtn = document.getElementById('exportBtn');

// NEW: Favorites
const favoritesSection   = document.getElementById('favorites');
const favoritesGrid      = document.getElementById('favoritesGrid');
const favoritesEmpty     = document.getElementById('favoritesEmpty');
const clearFavoritesBtn  = document.getElementById('clearFavoritesBtn');

/* =====================================================================
   STATE
   ===================================================================== */

/** Stores the last successful set of inputs so Regenerate can reuse them. */
let lastInputs = null;

/* =====================================================================
   NEW: INDUSTRY TEMPLATES
   ===================================================================== */

const INDUSTRY_TEMPLATES = {
  coffee: {
    industry: 'Coffee shop',
    keywords: 'organic, artisan, handcrafted, premium',
    target: 'young professionals, coffee enthusiasts, health-conscious millennials'
  },
  tech: {
    industry: 'Tech startup / SaaS company',
    keywords: 'innovation, AI, cloud, automation, scalable',
    target: 'entrepreneurs, developers, business owners, tech-savvy professionals'
  },
  fashion: {
    industry: 'Fashion boutique',
    keywords: 'trendy, elegant, sustainable, unique, stylish',
    target: 'fashion-conscious women and men, 25-40 years old'
  },
  food: {
    industry: 'Food & Beverage restaurant',
    keywords: 'fresh, local, delicious, authentic, quality',
    target: 'food lovers, families, health-conscious diners'
  },
  fitness: {
    industry: 'Fitness gym & wellness center',
    keywords: 'strength, energy, transformation, community, healthy',
    target: 'fitness enthusiasts, beginners looking to get fit, 20-50 years old'
  },
  beauty: {
    industry: 'Beauty salon & spa',
    keywords: 'natural, luxury, glow, rejuvenation, confidence',
    target: 'women seeking beauty treatments, self-care enthusiasts'
  }
};

/**
 * Fills the form with a predefined industry template.
 * @param {string} templateKey - Key from INDUSTRY_TEMPLATES
 */
function fillTemplate(templateKey) {
  const template = INDUSTRY_TEMPLATES[templateKey];
  if (!template) return;

  industryInput.value = template.industry;
  keywordsInput.value = template.keywords;
  targetInput.value   = template.target;

  // Clear any previous errors
  clearAllFieldErrors();

  // Visual feedback
  [industryInput, keywordsInput, targetInput].forEach(input => {
    input.style.transition = 'background 0.3s ease';
    input.style.background = 'rgba(124,107,255,0.1)';
    setTimeout(() => {
      input.style.background = '';
    }, 600);
  });
}

/* =====================================================================
   NEW: FAVORITES MANAGEMENT (localStorage)
   ===================================================================== */

const FAVORITES_STORAGE_KEY = 'ai-brand-generator-favorites';

/**
 * Retrieves favorites from localStorage.
 * @returns {Array<{text: string, explanation: string, type: string}>}
 */
function getFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves favorites to localStorage.
 * @param {Array} favorites
 */
function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('[saveFavorites] Failed to save:', err);
  }
}

/**
 * Adds an item to favorites.
 * @param {{text: string, explanation: string, type: string}} item
 */
function addToFavorites(item) {
  const favorites = getFavorites();
  
  // Check if already exists
  const exists = favorites.some(fav => 
    fav.text === item.text && fav.type === item.type
  );
  
  if (!exists) {
    favorites.push(item);
    saveFavorites(favorites);
    renderFavorites();
  }
}

/**
 * Removes an item from favorites.
 * @param {{text: string, type: string}} item
 */
function removeFromFavorites(item) {
  let favorites = getFavorites();
  favorites = favorites.filter(fav => 
    !(fav.text === item.text && fav.type === item.type)
  );
  saveFavorites(favorites);
  renderFavorites();
}

/**
 * Checks if an item is already favorited.
 * @param {{text: string, type: string}} item
 * @returns {boolean}
 */
function isFavorited(item) {
  const favorites = getFavorites();
  return favorites.some(fav => 
    fav.text === item.text && fav.type === item.type
  );
}

/**
 * Clears all favorites.
 */
function clearAllFavorites() {
  if (confirm('Are you sure you want to clear all saved favorites?')) {
    saveFavorites([]);
    renderFavorites();
  }
}

/**
 * Renders the favorites section.
 */
function renderFavorites() {
  const favorites = getFavorites();
  
  if (favorites.length === 0) {
    favoritesSection.hidden = true;
    favoritesEmpty.hidden = false;
    favoritesGrid.innerHTML = '';
    return;
  }

  favoritesSection.hidden = false;
  favoritesEmpty.hidden = true;
  favoritesGrid.innerHTML = '';

  for (const item of favorites) {
    const card = createIdeaCard(item, item.type);
    favoritesGrid.appendChild(card);
  }
}

/* =====================================================================
   NEW: EXPORT FUNCTIONALITY
   ===================================================================== */

/**
 * Exports current results as a text file.
 */
function exportResults() {
  const brandNames = Array.from(brandNamesGrid.children).map(card => ({
    text: card.querySelector('.card__text').textContent,
    explanation: card.querySelector('.card__explanation').textContent
  }));

  const slogans = Array.from(slogansGrid.children).map(card => ({
    text: card.querySelector('.card__text').textContent,
    explanation: card.querySelector('.card__explanation').textContent
  }));

  if (brandNames.length === 0 && slogans.length === 0) {
    alert('No results to export. Please generate ideas first.');
    return;
  }

  let content = '═══════════════════════════════════════════════\n';
  content += '   AI BRAND NAME & SLOGAN GENERATOR\n';
  content += '   Generated Brand Ideas\n';
  content += '═══════════════════════════════════════════════\n\n';

  if (lastInputs) {
    content += '📋 INPUT DETAILS:\n';
    content += `Industry: ${lastInputs.industry}\n`;
    content += `Keywords: ${lastInputs.keywords}\n`;
    content += `Target Customers: ${lastInputs.target}\n`;
    content += `Style: ${brandStyleSelect.options[brandStyleSelect.selectedIndex].text}\n`;
    content += `Language: ${languageSelect.options[languageSelect.selectedIndex].text}\n`;
    content += '\n';
  }

  content += '═══════════════════════════════════════════════\n';
  content += '🏷️  BRAND NAMES\n';
  content += '═══════════════════════════════════════════════\n\n';

  brandNames.forEach((item, index) => {
    content += `${index + 1}. ${item.text}\n`;
    content += `   ${item.explanation}\n\n`;
  });

  content += '\n═══════════════════════════════════════════════\n';
  content += '💬 SLOGANS\n';
  content += '═══════════════════════════════════════════════\n\n';

  slogans.forEach((item, index) => {
    content += `${index + 1}. ${item.text}\n`;
    content += `   ${item.explanation}\n\n`;
  });

  content += '\n═══════════════════════════════════════════════\n';
  content += `Generated on: ${new Date().toLocaleString()}\n`;
  content += '═══════════════════════════════════════════════\n';

  // Create and download the file
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `brand-ideas-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Visual feedback
  const originalText = exportBtn.textContent;
  exportBtn.textContent = '✓ Exported!';
  exportBtn.style.borderColor = 'var(--clr-success)';
  exportBtn.style.color = 'var(--clr-success)';
  setTimeout(() => {
    exportBtn.textContent = originalText;
    exportBtn.style.borderColor = '';
    exportBtn.style.color = '';
  }, 2000);
}

/* =====================================================================
   FORM — VALIDATION HELPERS
   ===================================================================== */

/**
 * Validates all form fields.
 * @returns {boolean} true if all fields pass validation.
 */
function validateInputs() {
  const fields = [
    { el: industryInput, errorId: 'industry-error', label: 'Business Industry' },
    { el: keywordsInput, errorId: 'keywords-error', label: 'Main Keywords'      },
    { el: targetInput,   errorId: 'target-error',   label: 'Target Customers'   },
  ];

  let valid = true;

  for (const { el, errorId, label } of fields) {
    const value = el.value.trim();
    const errorEl = document.getElementById(errorId);

    if (!value) {
      showFieldError(el, errorEl, `${label} is required.`);
      valid = false;
    } else {
      clearFieldError(el, errorEl);
    }
  }

  return valid;
}

/** Marks a field as invalid and shows the error message. */
function showFieldError(inputEl, errorEl, message) {
  inputEl.classList.add('is-invalid');
  errorEl.textContent = message;
}

/** Removes the invalid state and error message from a field. */
function clearFieldError(inputEl, errorEl) {
  inputEl.classList.remove('is-invalid');
  errorEl.textContent = '';
}

/** Clears all field-level validation UI. */
function clearAllFieldErrors() {
  const fieldIds = [
    { inputId: 'industry', errorId: 'industry-error' },
    { inputId: 'keywords', errorId: 'keywords-error' },
    { inputId: 'target',   errorId: 'target-error'   },
  ];
  for (const { inputId, errorId } of fieldIds) {
    clearFieldError(
      document.getElementById(inputId),
      document.getElementById(errorId),
    );
  }
}

/* =====================================================================
   API ERROR BANNER
   ===================================================================== */

/**
 * Displays a global API error banner below the form.
 * @param {string} message - Human-readable error description.
 */
function showApiError(message) {
  apiErrorEl.textContent = `⚠️ ${message}`;
  apiErrorEl.hidden = false;
  // Scroll the banner into view
  apiErrorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Hides the global API error banner. */
function hideApiError() {
  apiErrorEl.textContent = '';
  apiErrorEl.hidden = true;
}

/* =====================================================================
   LOADING STATE
   ===================================================================== */

/** Timer ID for the elapsed-seconds counter in the loading indicator. */
let loadingTimerId = null;

/** Shows the loading spinner and disables the generate button. */
function showLoading() {
  loadingEl.hidden  = false;
  resultsEl.hidden  = true;
  generateBtn.disabled = true;
  generateBtn.querySelector('.btn-generate__text').textContent = 'Generating…';

  // Show elapsed seconds so the user knows it's still working
  const loadingText = loadingEl.querySelector('.loading__text');
  let seconds = 0;
  loadingText.textContent = 'AI is crafting your brand identity… (this takes 10-15s)';
  loadingTimerId = setInterval(() => {
    seconds += 1;
    loadingText.textContent = `AI is crafting your brand identity… (${seconds}s)`;
  }, 1000);
}

/** Hides the loading spinner and re-enables the generate button. */
function hideLoading() {
  loadingEl.hidden  = true;
  generateBtn.disabled = false;
  generateBtn.querySelector('.btn-generate__text').textContent = 'Generate Ideas';
  if (loadingTimerId) {
    clearInterval(loadingTimerId);
    loadingTimerId = null;
  }
}

/* =====================================================================
   AI PROMPT BUILDER
   ===================================================================== */

/**
 * Constructs the structured prompt sent to Gemini.
 *
 * @param {string} industry  - The business industry.
 * @param {string} keywords  - Comma-separated core keywords.
 * @param {string} target    - Description of target customers.
 * @param {Object} options   - Additional options (style, language, numResults)
 * @returns {string}         - Formatted prompt string.
 */
function buildPrompt(industry, keywords, target, options = {}) {
  const {
    style = 'modern',
    language = 'english',
    numResults = 8
  } = options;

  // Style descriptions
  const styleDescriptions = {
    modern: 'modern, innovative, tech-savvy, forward-thinking',
    classic: 'classic, timeless, elegant, sophisticated',
    fun: 'fun, playful, energetic, vibrant, youthful',
    professional: 'professional, serious, trustworthy, authoritative',
    luxury: 'luxury, premium, exclusive, high-end, refined',
    minimalist: 'minimalist, clean, simple, uncluttered, zen-like'
  };

  // Language instructions
  const languageInstructions = {
    english: 'Generate all brand names and slogans in English.',
    vietnamese: 'Generate all brand names and slogans in Vietnamese (Tiếng Việt).',
    bilingual: 'Generate brand names that work in both English and Vietnamese. Include explanations in both languages where appropriate.'
  };

  const styleDesc = styleDescriptions[style] || styleDescriptions.modern;
  const langInstruction = languageInstructions[language] || languageInstructions.english;

  return `
You are a creative branding expert. Generate exactly ${numResults} brand name ideas and ${numResults} slogan ideas
for a business based on the following information:

Business industry: ${industry}
Main keywords: ${keywords}
Target customers: ${target}
Brand style/tone: ${styleDesc}

${langInstruction}

Requirements:
- Each brand name and slogan must be unique, memorable, and relevant.
- The style and tone should reflect: ${styleDesc}
- Each item must include a short explanation (1–2 sentences) of its meaning or emotional message.
- Brand names should be concise (1–3 words).
- Slogans should be short and punchy (3–8 words).

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "brandNames": [
    { "text": "BrandName", "explanation": "Short explanation here." }
  ],
  "slogans": [
    { "text": "The slogan text", "explanation": "Short explanation here." }
  ]
}
`.trim();
}

/* =====================================================================
   AI API CALL
   ===================================================================== */

/**
 * Sends the prompt to the Gemini API and returns parsed brand/slogan data.
 *
 * @param {string} prompt  - The fully constructed prompt string.
 * @returns {Promise<{brandNames: Array, slogans: Array}>}
 * @throws {Error} If the network request fails or the response is unparseable.
 */
async function callAIAPI(prompt) {
  try {
    return await callProxyAPI(prompt);
  } catch (proxyError) {
    const message = String(proxyError?.message || '');
    const canFallbackToDirectApi =
      message.includes('Proxy endpoint not found') ||
      message.includes('Network error while calling proxy') ||
      message.includes('Method not allowed on proxy') ||
      message.includes('Proxy endpoint does not support POST');

    if (!canFallbackToDirectApi) {
      throw proxyError;
    }

    console.warn('[callAIAPI] Proxy unavailable, falling back to direct Gemini call.');
    return callGeminiDirectAPI(prompt);
  }
}

/**
 * Calls same-origin backend proxy (recommended for Vercel deployments).
 * @param {string} prompt
 * @returns {Promise<{brandNames: Array, slogans: Array}>}
 */
async function callProxyAPI(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await fetch(GEMINI_PROXY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
  } catch (networkError) {
    clearTimeout(timeoutId);
    if (networkError.name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds. Please try again.');
    }
    throw new Error('Network error while calling proxy API.');
  }
  clearTimeout(timeoutId);

  if (response.status === 404) {
    throw new Error('Proxy endpoint not found.');
  }

  if (response.status === 405) {
    throw new Error('Method not allowed on proxy.');
  }

  if (response.status === 501) {
    throw new Error('Proxy endpoint does not support POST.');
  }

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const serverMessage = payload?.error || payload?.message || '';
    throw new Error(serverMessage || `API request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const brandNames = data?.brandNames;
  const slogans = data?.slogans;

  if (!Array.isArray(brandNames) || !Array.isArray(slogans)) {
    throw new Error('Unexpected response format from backend proxy.');
  }

  return {
    brandNames,
    slogans,
  };
}

/**
 * Direct call from frontend to Gemini API (fallback for local static hosting).
 * @param {string} prompt
 * @returns {Promise<{brandNames: Array, slogans: Array}>}
 */
async function callGeminiDirectAPI(prompt) {
  const envApiKey = await getApiKeyFromEnvFile();
  const apiKey = envApiKey;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. For local static hosting, ensure GEMINI_API_KEY exists in .env and that your server allows serving dotfiles. Or run with `vercel dev` to use server-side env.',
    );
  }

  const url = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.9,          // More creative outputs
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,     // 8+8 items with explanations need more room
    },
  };

  // Abort the request after 60 seconds to prevent infinite hanging
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (networkError) {
    clearTimeout(timeoutId);
    if (networkError.name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds. Please try again.');
    }
    throw new Error(
      'Network error — please check your internet connection or try serving the page via a local HTTP server (not file://).',
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const body = await response.text();
    console.error('[callAIAPI] HTTP error:', response.status, body);

    // Try to extract the actual error message from Google's response
    let detail = '';
    try {
      const errorJson = JSON.parse(body);
      detail = errorJson?.error?.message || '';
    } catch {
      // body is not JSON, ignore
    }

    // Map common HTTP status codes to meaningful messages
    const errorMessages = {
      400: 'Bad request — the prompt may be invalid.',
      401: 'Invalid API key — please double-check your Gemini API key.',
      403: 'Access denied — your API key may not have the required permissions.',
      429: 'Rate limit exceeded — please wait a moment and try again.',
      500: 'Gemini server error — please try again in a few seconds.',
    };

    let base =
      errorMessages[response.status] ??
      `API request failed with status ${response.status}.`;

    if (isLikelyApiKeyError(detail)) {
      base = 'Invalid or expired API key — please update GEMINI_API_KEY and try again.';
    }

    const message = detail ? `${base} (${detail})` : base;
    throw new Error(message);
  }

  const responseData = await response.json();

  // Extract the text content from Gemini's response envelope
  const rawText =
    responseData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    throw new Error('The AI returned an empty response. Please try again.');
  }

  return parseAIResponse(rawText);
}

/* =====================================================================
   RESPONSE PARSER
   ===================================================================== */

/**
 * Parses the raw text from the AI response into structured data.
 * Handles cases where the model wraps JSON in markdown code fences.
 *
 * @param {string} rawText - Raw text from the AI response.
 * @returns {{brandNames: Array, slogans: Array}}
 * @throws {Error} If valid JSON cannot be extracted.
 */
function parseAIResponse(rawText) {
  // Strategy 1: Strip markdown code fences if present (```json … ```)
  let cleaned = rawText
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim();

  // Strategy 2: If no fences found, try to extract the JSON object directly
  if (!cleaned.startsWith('{')) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      'The AI response was not valid JSON. Please try generating again.',
    );
  }

  const brandNames = parsed?.brandNames;
  const slogans    = parsed?.slogans;

  if (!Array.isArray(brandNames) || !Array.isArray(slogans)) {
    throw new Error(
      'Unexpected response format from the AI. Please try again.',
    );
  }

  // Normalise items — ensure each has `text` and `explanation` strings
  const normalise = (items) =>
    items
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({
        text:        item.text.trim(),
        explanation: (item.explanation ?? '').trim(),
      }));

  return {
    brandNames: normalise(brandNames),
    slogans:    normalise(slogans),
  };
}

/**
 * Detects whether an API error message is related to authentication/key issues.
 * @param {string} detail
 * @returns {boolean}
 */
function isLikelyApiKeyError(detail) {
  const text = String(detail || '').toLowerCase();
  return (
    text.includes('api key') ||
    text.includes('credential') ||
    text.includes('expired') ||
    text.includes('invalid key')
  );
}

/* =====================================================================
   COPY TO CLIPBOARD
   ===================================================================== */

/**
 * Copies the given text to the user's clipboard and provides visual feedback.
 *
 * @param {string}      text      - Text to copy.
 * @param {HTMLElement} btnEl     - The copy button element (for feedback).
 */
async function copyToClipboard(text, btnEl) {
  try {
    await navigator.clipboard.writeText(text);
    // Visual feedback
    btnEl.textContent = '✓ Copied!';
    btnEl.classList.add('btn-copy--copied');
    setTimeout(() => {
      btnEl.textContent = '⎘ Copy';
      btnEl.classList.remove('btn-copy--copied');
    }, 2000);
  } catch {
    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btnEl.textContent = '✓ Copied!';
    btnEl.classList.add('btn-copy--copied');
    setTimeout(() => {
      btnEl.textContent = '⎘ Copy';
      btnEl.classList.remove('btn-copy--copied');
    }, 2000);
  }
}

/* =====================================================================
   RESULT CARD BUILDER
   ===================================================================== */

/**
 * Creates a single idea card DOM element.
 *
 * @param {{ text: string, explanation: string }} item
 * @param {string} type - 'brandName' or 'slogan'
 * @returns {HTMLElement}
 */
function createIdeaCard(item, type = 'brandName') {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');

  const itemWithType = { ...item, type };
  const favorited = isFavorited(itemWithType);

  card.innerHTML = `
    <p class="card__text">${escapeHtml(item.text)}</p>
    <p class="card__explanation">${escapeHtml(item.explanation)}</p>
    <div class="card__footer">
      <button class="btn-favorite ${favorited ? 'is-favorited' : ''}" 
              type="button" 
              aria-label="Save to favorites"
              title="${favorited ? 'Remove from favorites' : 'Add to favorites'}">
        ${favorited ? '❤️' : '🤍'}
      </button>
      <button class="btn-copy" type="button" aria-label="Copy: ${escapeHtml(item.text)}">
        ⎘ Copy
      </button>
    </div>
  `;

  // Attach copy handler
  const copyBtn = card.querySelector('.btn-copy');
  copyBtn.addEventListener('click', () => copyToClipboard(item.text, copyBtn));

  // Attach favorite handler
  const favBtn = card.querySelector('.btn-favorite');
  favBtn.addEventListener('click', () => {
    if (isFavorited(itemWithType)) {
      removeFromFavorites(itemWithType);
      favBtn.textContent = '🤍';
      favBtn.classList.remove('is-favorited');
      favBtn.title = 'Add to favorites';
    } else {
      addToFavorites(itemWithType);
      favBtn.textContent = '❤️';
      favBtn.classList.add('is-favorited');
      favBtn.title = 'Remove from favorites';
    }
  });

  return card;
}

/**
 * Escapes special HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}

/* =====================================================================
   RENDER RESULTS
   ===================================================================== */

/**
 * Renders brand names and slogans into their respective card grids.
 *
 * @param {{ brandNames: Array, slogans: Array }} data
 */
function renderResults(data) {
  // Clear previous results
  brandNamesGrid.innerHTML = '';
  slogansGrid.innerHTML    = '';

  for (const item of data.brandNames) {
    brandNamesGrid.appendChild(createIdeaCard(item, 'brandName'));
  }

  for (const item of data.slogans) {
    slogansGrid.appendChild(createIdeaCard(item, 'slogan'));
  }

  resultsEl.hidden = false;
  // Smooth scroll to results
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =====================================================================
   MAIN ORCHESTRATOR
   ===================================================================== */

/**
 * Main entry point for idea generation.
 * Validates form inputs, calls the AI API, and renders results.
 *
 * @param {{ industry: string, keywords: string, target: string }} inputs
 */
async function generateIdeas(inputs) {
  hideApiError();
  showLoading();

  try {
    console.log('[generateIdeas] Building prompt…');
    
    // Gather advanced options
    const options = {
      style: brandStyleSelect.value,
      language: languageSelect.value,
      numResults: parseInt(numResultsSlider.value, 10)
    };
    
    const prompt = buildPrompt(inputs.industry, inputs.keywords, inputs.target, options);

    console.log('[generateIdeas] Calling Gemini API…');
    const data   = await callAIAPI(prompt);

    console.log('[generateIdeas] Got data, rendering…', data);
    renderResults(data);
    console.log('[generateIdeas] Done ✓');
  } catch (error) {
    console.error('[generateIdeas] Error:', error);
    showApiError(error.message);
  } finally {
    hideLoading();
  }
}

/* =====================================================================
   EVENT LISTENERS
   ===================================================================== */

/** Form submit — validate, gather inputs, kick off generation. */
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAllFieldErrors();

  if (!validateInputs()) return;

  lastInputs = {
    industry: industryInput.value.trim(),
    keywords: keywordsInput.value.trim(),
    target:   targetInput.value.trim(),
  };

  await generateIdeas(lastInputs);
});

/** Regenerate button — reuse last inputs without re-validating. */
regenerateBtn.addEventListener('click', async () => {
  if (!lastInputs) return;
  hideApiError();
  await generateIdeas(lastInputs);
});

/** Clear field error on input to give immediate positive feedback. */
[industryInput, keywordsInput, targetInput].forEach((input) => {
  const errorEl = document.getElementById(`${input.id}-error`);
  input.addEventListener('input', () => clearFieldError(input, errorEl));
});

/* =====================================================================
   NEW: EVENT LISTENERS FOR NEW FEATURES
   ===================================================================== */

/** Template buttons — quick fill form fields. */
document.querySelectorAll('.btn-template').forEach(btn => {
  btn.addEventListener('click', () => {
    const templateKey = btn.dataset.template;
    fillTemplate(templateKey);
  });
});

/** Number of results slider — update display value. */
numResultsSlider.addEventListener('input', () => {
  numResultsValue.textContent = numResultsSlider.value;
});

/** Export button — download results as text file. */
exportBtn.addEventListener('click', exportResults);

/** Clear favorites button. */
clearFavoritesBtn.addEventListener('click', clearAllFavorites);

/** Load favorites on page load. */
document.addEventListener('DOMContentLoaded', () => {
  renderFavorites();
});
