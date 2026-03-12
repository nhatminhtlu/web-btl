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

/** Gemini REST endpoint — using gemini-2.5-flash (the model available on the free tier). */
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** Default API key — pre-fills the form so you don't have to type it every time. */
const DEFAULT_API_KEY = 'AIzaSyBA4Yj_hfCewWO4AErapftZ-A83Z0-FnPk';

/* =====================================================================
   DOM REFERENCES
   ===================================================================== */

const form            = document.getElementById('generatorForm');
const industryInput   = document.getElementById('industry');
const keywordsInput   = document.getElementById('keywords');
const targetInput     = document.getElementById('target');
const apiKeyInput     = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const generateBtn     = document.getElementById('generateBtn');
const regenerateBtn   = document.getElementById('regenerateBtn');
const loadingEl       = document.getElementById('loading');
const resultsEl       = document.getElementById('results');
const apiErrorEl      = document.getElementById('apiError');
const brandNamesGrid  = document.getElementById('brandNamesGrid');
const slogansGrid     = document.getElementById('slogansGrid');

/* =====================================================================
   STATE
   ===================================================================== */

/** Stores the last successful set of inputs so Regenerate can reuse them. */
let lastInputs = null;

// Pre-fill the API key input so the user doesn't have to type it manually
apiKeyInput.value = DEFAULT_API_KEY;

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
    { el: apiKeyInput,   errorId: 'apiKey-error',   label: 'Gemini API Key'     },
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
    { inputId: 'apiKey',   errorId: 'apiKey-error'   },
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
 * @returns {string}         - Formatted prompt string.
 */
function buildPrompt(industry, keywords, target) {
  return `
You are a creative branding expert. Generate exactly 8 brand name ideas and 8 slogan ideas
for a business based on the following information:

Business industry: ${industry}
Main keywords: ${keywords}
Target customers: ${target}

Requirements:
- Each brand name and slogan must be unique, memorable, and relevant.
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
 * @param {string} apiKey  - The user's Gemini API key.
 * @returns {Promise<{brandNames: Array, slogans: Array}>}
 * @throws {Error} If the network request fails or the response is unparseable.
 */
async function callAIAPI(prompt, apiKey) {
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
    // Map common HTTP status codes to meaningful messages
    const errorMessages = {
      400: 'Bad request — the prompt may be invalid.',
      401: 'Invalid API key — please double-check your Gemini API key.',
      403: 'Access denied — your API key may not have the required permissions.',
      429: 'Rate limit exceeded — please wait a moment and try again.',
      500: 'Gemini server error — please try again in a few seconds.',
    };
    const message =
      errorMessages[response.status] ??
      `API request failed with status ${response.status}.`;
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
 * @returns {HTMLElement}
 */
function createIdeaCard(item) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'listitem');

  card.innerHTML = `
    <p class="card__text">${escapeHtml(item.text)}</p>
    <p class="card__explanation">${escapeHtml(item.explanation)}</p>
    <div class="card__footer">
      <button class="btn-copy" type="button" aria-label="Copy: ${escapeHtml(item.text)}">
        ⎘ Copy
      </button>
    </div>
  `;

  // Attach copy handler
  const copyBtn = card.querySelector('.btn-copy');
  copyBtn.addEventListener('click', () => copyToClipboard(item.text, copyBtn));

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
    brandNamesGrid.appendChild(createIdeaCard(item));
  }

  for (const item of data.slogans) {
    slogansGrid.appendChild(createIdeaCard(item));
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
 * @param {{ industry: string, keywords: string, target: string, apiKey: string }} inputs
 */
async function generateIdeas(inputs) {
  hideApiError();
  showLoading();

  try {
    console.log('[generateIdeas] Building prompt…');
    const prompt = buildPrompt(inputs.industry, inputs.keywords, inputs.target);

    console.log('[generateIdeas] Calling Gemini API…');
    const data   = await callAIAPI(prompt, inputs.apiKey);

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
    apiKey:   apiKeyInput.value.trim(),
  };

  await generateIdeas(lastInputs);
});

/** Regenerate button — reuse last inputs without re-validating. */
regenerateBtn.addEventListener('click', async () => {
  if (!lastInputs) return;
  hideApiError();
  await generateIdeas(lastInputs);
});

/** Toggle API key visibility. */
toggleApiKeyBtn.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type          = isPassword ? 'text' : 'password';
  toggleApiKeyBtn.textContent = isPassword ? '🙈' : '👁';
  toggleApiKeyBtn.title       = isPassword ? 'Hide key' : 'Show key';
});

/** Clear field error on input to give immediate positive feedback. */
[industryInput, keywordsInput, targetInput, apiKeyInput].forEach((input) => {
  const errorEl = document.getElementById(`${input.id}-error`);
  input.addEventListener('input', () => clearFieldError(input, errorEl));
});
