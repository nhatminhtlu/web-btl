# Project Context: AI Brand Name & Slogan Generator

## Project Overview

Build a web application that helps startups and new businesses generate **creative brand names and slogans** using an AI API (AI Studio, OpenAI, Gemini, or similar).

The application should allow users to input business information and receive AI-generated suggestions for:

* Brand names
* Marketing slogans

Each suggestion should include a **short explanation** describing the meaning or feeling behind it.

This project is a **final assignment for a Web Technology course**.

---

# Functional Requirements

## User Inputs

The application must collect the following inputs from the user:

1. Business Industry
2. Main Keywords related to the product or core value
3. Target Customers

Example:

Industry: Coffee shop
Keywords: organic, premium, handcrafted
Target customers: young professionals

---

## AI Functionality

The system must use an **AI API** to generate:

* **5–10 Brand Name ideas**
* **5–10 Slogan ideas**

Each idea must include:

* The generated text
* A **short explanation** describing the meaning or emotional message.

Example output:

Brand Name: BrewNova
Explanation: Suggests innovation and modern coffee culture.

Slogan: Taste the Future of Coffee
Explanation: Emphasizes a premium and forward-thinking brand.

---

# Output Requirements

The UI must display:

* A list of generated brand names
* A list of generated slogans
* Each result must include a **copy button** to copy the text.

Example UI structure:

Brand Names

* BrewNova (Copy)
* UrbanRoast (Copy)
* BeanCraft (Copy)

Slogans

* Taste the Future of Coffee (Copy)
* Crafted for Coffee Lovers (Copy)

---

# Error Handling

The application must handle:

1. Empty input fields
2. Invalid user input
3. API request failures

Error messages must be clearly displayed to the user.

---

# UI / UX Requirements

The interface must be:

Clean and visually appealing.

Required UI features:

* Clear input form
* Generate button
* Results section
* Copy buttons
* Loading indicator while AI is generating content

Design suggestions:

* Use modern layout
* Use box-shadow for cards
* Hover effects
* Smooth transitions

The application must be **responsive** and work on:

* Desktop
* Tablet
* Mobile

---

# Technical Requirements

## Technology Stack

Frontend:

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

Frameworks are optional but **not required**.

The app can directly call the AI API from the frontend.

Backend is **not required**.

---

# Project Structure

Recommended project structure:

```
ai-brand-generator/
│
├── index.html
├── style.css
├── script.js
├── Dockerfile
├── README.md
└── assets/
```

---

# Code Quality Requirements

The code must follow these principles:

* Clean and readable
* Meaningful variable and function names
* Use modular JavaScript functions
* Avoid outdated JavaScript patterns

Example functions:

generateIdeas()
callAIAPI()
renderResults()
copyToClipboard()

Comments should be added where necessary.

---

# Git & GitHub Requirements

The project must be hosted on GitHub.

The commit history must include at least **5 meaningful commits**, for example:

Initial project setup
Add input form UI
Integrate AI API
Implement result rendering
Add copy functionality
Add error handling
Add Docker support

---

# Deployment Requirements

## Vercel Deployment

The application must be deployed using **Vercel**.

Steps:

1. Push project to GitHub
2. Connect repository to Vercel
3. Deploy the site
4. Provide the live URL

The deployed version must behave the same as the local version.

---

## Docker Support

The repository must include a valid **Dockerfile**.

The Docker container should serve the static website using **Nginx**.

Example Docker behavior:

```
docker build -t ai-brand-generator .
docker run -p 8080:80 ai-brand-generator
```

The application must run correctly after starting the container.

---

# README Requirements

The repository must include a README.md with:

* Project description
* Selected assignment topic
* Screenshot of the application
* Vercel deployment link
* Instructions for running locally
* Instructions for building and running Docker

---

# AI Prompt Design

The prompt sent to the AI API should instruct the model to generate structured results.

Example prompt format:

Generate 10 brand name ideas and 10 slogan ideas for a business.

Business industry: {industry}
Keywords: {keywords}
Target customers: {target}

For each idea include:

1. The brand name or slogan
2. A short explanation of its meaning.

Return results in structured JSON format.

---

# Expected Deliverables

The final project must include:

* Functional web application
* AI integration
* Clean UI
* GitHub repository
* Vercel deployment
* Dockerfile
* README documentation

---

# Goal

The goal of this project is to demonstrate:

* Web development skills
* API integration
* UI design
* Git workflow
* Deployment and containerization
