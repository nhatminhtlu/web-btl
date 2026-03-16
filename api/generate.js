'use strict';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Vercel Serverless Function proxy for Gemini API.
 * Keeps API key on the server and returns normalized JSON for the frontend.
 */
module.exports = async (req, res) => {
  // Enforce POST only.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Read API key from server environment.
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({
      error: 'Gemini API key is not configured on server. Please set GEMINI_API_KEY in Vercel Project Settings.',
    });
  }

  // Parse and validate request body.
  let prompt = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    prompt = String(body?.prompt || '').trim();
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required field: prompt.' });
  }

  // Build Gemini request payload.
  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let geminiResponse;
  try {
    // Forward request to Gemini API with server-side key.
    geminiResponse = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out after 60 seconds.' });
    }
    return res.status(502).json({ error: 'Network error while calling Gemini API.' });
  }

  clearTimeout(timeoutId);

  if (!geminiResponse.ok) {
    const bodyText = await geminiResponse.text();

    let detail = '';
    try {
      const errorJson = JSON.parse(bodyText);
      detail = errorJson?.error?.message || '';
    } catch {
      detail = '';
    }

    const errorMessages = {
      400: 'Bad request — the prompt may be invalid.',
      401: 'Invalid API key — please verify GEMINI_API_KEY.',
      403: 'Access denied — API key may not have the required permissions.',
      429: 'Rate limit exceeded — please wait and try again.',
      500: 'Gemini server error — please try again shortly.',
    };

    const base =
      errorMessages[geminiResponse.status] ||
      `Gemini API request failed with status ${geminiResponse.status}.`;

    return res.status(geminiResponse.status).json({
      error: detail ? `${base} (${detail})` : base,
    });
  }

  const geminiData = await geminiResponse.json();
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawText) {
    return res.status(502).json({
      error: 'The AI returned an empty response. Please try again.',
    });
  }

  try {
    // Parse/normalize model output before returning to frontend.
    const parsed = parseAIResponse(rawText);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(502).json({
      error: error?.message || 'Failed to parse AI response.',
    });
  }
};

/**
 * Extracts valid JSON from model output and normalizes response shape.
 * @param {string} rawText
 * @returns {{ brandNames: Array<{text: string, explanation: string}>, slogans: Array<{text: string, explanation: string}> }}
 */
function parseAIResponse(rawText) {
  let cleaned = rawText
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim();

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
    throw new Error('The AI response was not valid JSON. Please try generating again.');
  }

  const brandNames = parsed?.brandNames;
  const slogans = parsed?.slogans;

  if (!Array.isArray(brandNames) || !Array.isArray(slogans)) {
    throw new Error('Unexpected response format from the AI. Please try again.');
  }

  const normalise = (items) =>
    items
      .filter((item) => item && typeof item.text === 'string')
      .map((item) => ({
        text: item.text.trim(),
        explanation: String(item.explanation || '').trim(),
      }));

  return {
    brandNames: normalise(brandNames),
    slogans: normalise(slogans),
  };
}
