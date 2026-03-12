# AI Brand Name & Slogan Generator

> **Web Technology Final Project** — a frontend-only web application that uses the Google Gemini AI API to generate creative brand names and marketing slogans for any business.

---

## Overview

Enter your business industry, core keywords, and target customer profile, then click **Generate Ideas**. The app calls the Gemini API and displays up to 8 brand name suggestions and 8 slogans — each with a short explanation — in a clean, responsive card layout with one-click copy buttons.

---

## Features

- AI-powered generation via **Google Gemini 1.5 Flash**
- 8 brand names + 8 slogans per request, each with an explanation
- One-click **Copy** button on every card
- **Regenerate** button to get fresh ideas without re-filling the form
- Input validation with field-level error messages
- Loading spinner while the AI is working
- Global error banner for API failures (invalid key, rate limit, network errors)
- Fully responsive — works on desktop, tablet, and mobile
- No backend required — runs entirely in the browser

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Markup     | HTML5                             |
| Styling    | CSS3 (Custom Properties, Grid, Flexbox) |
| Logic      | Vanilla JavaScript (ES6+)         |
| AI API     | Google Gemini 1.5 Flash (REST)    |
| Container  | Docker + Nginx                    |
| Deployment | Vercel                            |

---

## Getting Started

### Prerequisites

- A free **Google Gemini API key** — get one at [Google AI Studio](https://aistudio.google.com/app/apikey).

### Run Locally (no build step needed)

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/ai-brand-generator.git
cd ai-brand-generator
```

2. Open `index.html` directly in your browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

3. Paste your Gemini API key into the **API Key** field and start generating.

> **Note:** Because the app calls the Gemini API from the browser, you need to serve it over HTTP (not just open the file) if your browser restricts `fetch` from `file://` origins. Use any simple static server:
>
> ```bash
> # Python 3
> python3 -m http.server 3000
> # then open http://localhost:3000
> ```

---

## Docker

Build and run the app inside an Nginx container:

```bash
# Build the image
docker build -t ai-brand-generator .

# Run on port 8080
docker run -p 8080:80 ai-brand-generator
```

Open your browser at **http://localhost:8080**.

To stop the container:

```bash
docker ps                        # find CONTAINER_ID
docker stop <CONTAINER_ID>
```

---

## Deploy to Vercel

Vercel treats this project as a static site — no configuration file is required.

1. Push the repository to GitHub (or GitLab / Bitbucket).

2. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.

3. Import your repository.

4. Leave all settings at their defaults — the **Framework Preset** should be detected as **Other** (static).

5. Click **Deploy**.

6. Your live URL will be shown after the build completes (e.g. `https://ai-brand-generator.vercel.app`).

> **Live demo:** _< add your Vercel URL here after deployment >_

---

## Project Structure

```
ai-brand-generator/
├── index.html    # App markup — header, form, loading, results
├── style.css     # All styles — design tokens, layout, cards, responsive
├── script.js     # Application logic — API call, parsing, rendering
├── Dockerfile    # Nginx container for serving the static site
└── README.md     # This file
```

---

## Key JavaScript Functions

| Function | Description |
|---|---|
| `generateIdeas(inputs)` | Main orchestrator — validates, calls API, renders |
| `callAIAPI(prompt, apiKey)` | Sends POST request to Gemini and returns parsed data |
| `buildPrompt(industry, keywords, target)` | Constructs the structured AI prompt |
| `parseAIResponse(rawText)` | Safely extracts JSON from the AI response |
| `renderResults(data)` | Builds and injects result cards into the DOM |
| `createIdeaCard(item)` | Creates a single card DOM element |
| `copyToClipboard(text, btnEl)` | Copies text and shows visual feedback |
| `validateInputs()` | Client-side form validation |

---

## AI Prompt Design

The prompt instructs Gemini to return **strict JSON** so the frontend can parse it reliably:

```
Generate exactly 8 brand name ideas and 8 slogan ideas for a business.

Business industry: {industry}
Main keywords: {keywords}
Target customers: {target}

Return ONLY valid JSON:
{
  "brandNames": [{ "text": "...", "explanation": "..." }],
  "slogans":    [{ "text": "...", "explanation": "..." }]
}
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Empty form fields | Red border + inline error message per field |
| Invalid / missing API key | HTTP 401 — banner: "Invalid API key…" |
| Rate limit exceeded | HTTP 429 — banner: "Rate limit exceeded…" |
| Network failure | Catch block — banner: "Network error…" |
| Malformed AI response | Parse error — banner: "Unexpected response format…" |

---

## Screenshot

> _Add a screenshot of the running application here._

---

## License

MIT — free to use, modify, and distribute.
