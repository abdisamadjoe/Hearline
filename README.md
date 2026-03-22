# 🎧 Hearline

> Hear any webpage aloud, word by word, with real-time highlighting. Free, private, no account needed.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-yellow?logo=googlechrome)](https://chrome.google.com/webstore/detail/hearline/YOUR-EXTENSION-ID-HERE)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0-green)]()

---

## What is Hearline?

Hearline is a free Chrome Extension that reads any webpage aloud while highlighting each word or sentence in real time — like a karaoke cursor for the web. Built for students, professionals, and anyone who learns better by listening.

No account. No subscription. No data sent anywhere. Ever.

---

## Features

- 🎧 **Read aloud** — any page or selected text, spoken naturally by your browser
- ✨ **Real-time highlighting** — follow along as each sentence is spoken
- ⚡ **RSVP speed reading** — flash one word at a time, up to 3× faster
- 📄 **Smart summarizer** — extracts key points instantly, no AI API needed
- 🔒 **100% private** — everything runs locally in your browser
- 🌐 **Works everywhere** — articles, blogs, Wikipedia, course pages, documentation

---

## Install

### From Chrome Web Store *(recommended)*
👉 [Install Hearline](https://chrome.google.com/webstore/detail/hearline/YOUR-EXTENSION-ID-HERE)

### Manual Install (Developer Mode)
1. Download or clone this repository
```bash
git clone https://github.com/YOUR-USERNAME/hearline.git
```
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `hearline` folder
6. Done — the Hearline icon appears in your toolbar

---

## How to Use

| Action | How |
|---|---|
| Read full page | Click the Hearline icon → hit **Play** |
| Read selected text | Highlight text on page → click icon → **Play** |
| Speed reading | Switch to **RSVP** mode → Play |
| Summarize page | Switch to **Summary** mode → Play |
| Change speed | Drag the speed slider (0.5× to 3×) |
| Stop | Click **Stop** or press `Escape` |

---

## Privacy

Hearline is fully local. It uses your browser's built-in Web Speech API to generate voice — no text is ever sent to any server. No account is required. No data is collected. No analytics. Nothing.

Your reading stays yours.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| Speech | Web Speech API (SpeechSynthesisUtterance) |
| Highlighting | CSS class toggle on DOM nodes |
| Summarizer | TF-IDF extractive algorithm |
| Storage | chrome.storage.local |
| Frameworks | None — pure Vanilla JavaScript |

---

## File Structure

```
hearline/
├── manifest.json       — extension config
├── background.js       — service worker
├── content.js          — core engine (extract, chunk, speak, highlight)
├── injected.css        — highlight + RSVP overlay styles
├── popup.html          — extension popup UI
├── popup.css           — popup styles
└── popup.js            — popup controls + messaging
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT — free to use, modify, and distribute.

---

## Author

Built by [@YOUR-USERNAME](https://github.com/YOUR-USERNAME)

---

*If Hearline helped you, leave a ⭐ on GitHub and a review on the Chrome Web Store — it helps more people find it.*
