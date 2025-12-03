**Overview**

This project is a web-based behavioral experiment that measures how quickly humans can distinguish AI-generated images of people from real photographs under decreasing time.

**Test Format**

- **Single Image**: Each question displays one image for a varying amount of time. After the time is up, the participant must decide whether the image is AI-generated or Real using the two buttons labeled `AI` and `REAL`.
- **Automatic Intervals**: The test automatically progresses through these time-per-question blocks: `30s`, `20s`, `15s`, `10s`, `5s`, `1s`.
- **Questions per Interval**: For each interval there are 4 questions — 2 images are AI and 2 are Real (order randomized). That makes 6 intervals × 4 questions = 24 questions total.
- **No manual interval selection**: The user presses `Start` and the test runs through all blocks automatically, getting faster after each block.

**One Attempt Per Device**

- To maintain data integrity the site sets a flag in `localStorage` after completion. Returning users see a message that the test has already been completed. 

**Data Collected**

[ill fill this in when i get to it]

**Files & Where to Edit**

- `index.html`: page layout and controls (`Start`, `AI`, `REAL`, counter).
- `script.js`: main quiz logic. This is where the image pool (`imageList`), interval sequence (`intervals`), question building, timer, and data POST URL live. Change `GOOGLE_SCRIPT_URL_HERE` to your collection endpoint if you have one.
- `style.css`: visual styling and responsive layout.
- `images/`: place your AI and Real images here. The app expects objects in `script.js` with `{ src: "images/YourImage.jpg", type: "ai"|"real" }`.

**Technology**

- HTML, CSS, JavaScript (vanilla)
- LocalStorage for per-device lockout and anonymous id
- Google Apps Script + Google Sheets for storing results
- Thispersondoesnotexist for AI portraits (public domain)
- Flickr-Faces-HQ Dataset (FFHQ) for real portraits (Licence: CC BY-SA 3.0)






