# SkillPilot Pulse — Tech & Learning News

A responsive, dark-theme React news dashboard designed to complement SkillPilot. It brings together technology stories that can help students and developers keep learning.

## Features

- Live technology stories from the public Hacker News Firebase API (no API key required).
- Category filters: AI & ML, Web Dev, Data & Analytics, Career, and Tools & Security.
- Search stories by title, domain, author, or category.
- Sort by trending score, newest, or most discussed.
- Save/remove stories in a persistent reading list using browser LocalStorage.
- Mobile responsive sidebar/navigation and dark UI.
- Demo learning resources appear when the live API cannot be reached; the UI labels demo mode clearly.
- Each live story links to its original story URL, with a separate Hacker News discussion URL available through the story source when the story has no external URL.

## Requirements

- Node.js 18+ recommended
- npm
- Internet connection for live stories. The UI can still show curated demo learning resources without the feed.

## Run on Windows

1. Extract the ZIP into a folder (for example, `Downloads\SkillPilot_Pulse_Fixed`).
2. Open the extracted folder. `package.json` must be directly inside it, alongside `index.html` and `vite.config.js`.
3. Open PowerShell in this folder and run:

```powershell
npm install
npm run dev
```

4. Open the local URL printed in the terminal (Vite normally uses `http://localhost:5173/`).

To verify a production build:

```powershell
npm run build
npm run preview
```

## Tech stack

- React + Vite
- Vanilla CSS with responsive breakpoints
- Lucide React icons
- Hacker News public API: https://github.com/HackerNews/API
- LocalStorage for saved reading-list items

## How topic categorization works

The app categorizes stories from their headlines using a transparent keyword-based classifier. The category is only a convenience filter and not an authoritative editorial label. Articles are loaded from Hacker News' top stories endpoint and individual item endpoints. If a network request fails, the app shows clearly labeled sample learning resources rather than pretending they are live news.

## Current limitations

- Category prediction is keyword-based and may classify some headlines imperfectly.
- Hacker News top stories are technology-focused; they are not a complete general-news feed.
- Favorites are saved in the current browser only. There is no account or cross-device sync.
- Demo items are educational resource links, not breaking-news articles.
