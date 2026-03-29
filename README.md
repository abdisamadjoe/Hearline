# 🎧 Hearline — Listen to any webpage

**Hearline reads any webpage, article or blog out loud with real-time word highlighting.**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-yellow?logo=googlechrome)](https://chrome.google.com/webstore/detail/hearline/YOUR-EXTENSION-ID-HERE)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0-green)]()

---

## What is Hearline?

Hearline is a free Chrome Extension that reads any webpage out loud while highlighting each word in real time. Think of it like a karaoke cursor for the web. It was built for students, professionals, and anyone who learns better by listening.

No account required. No data sent anywhere. Ever.

---

## Features

- **Read aloud** — reads any page or selected text out loud using your browser's built-in voice
- **Real-time highlighting** — follows along and highlights each word as it is spoken
- **RSVP speed reading** — flashes one word at a time on screen, up to 3x faster than normal reading
- **Smart summarizer** — pulls out the key points from any page instantly, no AI or internet needed
- **100% private** — everything runs inside your browser, nothing is sent to any server
- **Works everywhere** — articles, blogs, Wikipedia, course pages, and documentation sites

---

## How to Install

### Option 1: Chrome Web Store (Recommended)

[Click here to install Hearline](https://chrome.google.com/webstore/detail/hearline/YOUR-EXTENSION-ID-HERE)

### Option 2: Manual Install

1. Download or clone this repository
```bash
git clone https://github.com/abdisamadjoe/hearline.git
```
2. Open Chrome and go to `chrome://extensions/`
3. Turn on **Developer mode** using the toggle in the top right corner
4. Click **Load unpacked**
5. Select the `hearline` folder
6. The Hearline icon will appear in your Chrome toolbar

---

## How to Use

| What you want to do | How to do it |
|---|---|
| Read the full page | Click the Hearline icon and it starts reading immediately |
| Jump to a paragraph | Hover over any paragraph and click the play button that appears |
| Change reading speed | Use the speed selector in the floating player |
| Pause or resume | Click the pause button in the floating player |
| Stop at any time | Click the close button or press the `Escape` key |

---

## Privacy

Hearline runs entirely on your device. It uses your browser's built-in Web Speech API to generate voice, so no text is ever sent to any server. There is no account to create, no data collected, and no analytics of any kind.

Your reading stays completely private.

---

## Tech Stack

| Layer | Technology used |
|---|---|
| Extension platform | Chrome Manifest V3 |
| Text to speech | Web Speech API (SpeechSynthesisUtterance) |
| Highlighting | Real-time word-level span injection |
| Settings storage | chrome.storage.local |
| Frameworks | None, pure Vanilla JavaScript |

---

## File Structure

```
hearline/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── content.js          # Core engine (extract, chunk, speak, highlight)
├── injected.css        # Highlight and player styles
├── popup.html          # Extension popup interface
├── popup.css           # Popup styles
└── popup.js            # Popup controls and messaging
```

---

## Contributing

Contributions are welcome. If you have a feature idea or find a bug, please open an issue first before submitting a pull request.

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. You are free to use, modify, and distribute it.

---

## Author

Built by [@abdisamadjoe](https://github.com/abdisamadjoe)

---

If Hearline helped you, please leave a star on GitHub and a review on the Chrome Web Store. It helps more people find the extension.
