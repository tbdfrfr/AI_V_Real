no way! my first github pages thingy! 


This project is a web-based behavioral experiment measuring how quickly humans can distinguish AI-generated images from real photographs.
It is a measurement of:
- Accuracy under cognitive pressure
- Visual recognition thresholds
- Performance decay as time drops


How the Test Works
1. Image Shown

   The user is shown two images from a shuffled list of AI-generated images and Real photographs.
   Two example images are shown here:
   
   ![real2-resized-to-small](https://github.com/user-attachments/assets/32c58265-dfb6-4175-9956-03332ac37649)

   ![Real7-resized-to-small](https://github.com/user-attachments/assets/de733dfb-d691-43f4-9d81-2bba34a512e2)



3. The participant selects the image that they think is ai generated
4. Each round the user gets less and less time to react.

This allows identification of the lowest reaction time where users can still make accurate judgments.

One Attempt Per Device
To maintain clean data:
- The test can only be taken once per device
- A flag is stored in localStorage (cookies)
- Returning users see a “You already completed the test” message
- This prevents score-farming or repeat attempts from skewing results.

Data Collection (Google Sheets)
- When the test ends, the website sends an anonymous data packet to a Google Sheet via a lightweight Google Apps Script API.
- The following data is recorded:
- Timestamp
- Score
- Number of rounds
- Fastest time the user reached
- Browser user-agent (anonymous)
- A per-device anonymous ID
- A JSON log of each round, including:
- Images shown
- User’s guess
- Correct answer
- Time remaining
- No personal information is collected.

Technology Used:
- HTML: page structure
- CSS: Layout and UI
- JavaScript: game logic, timer system, logging
- LocalStorage: one-attempt lockout
- Google Apps Script: data API
- Google Sheets: results database
- GitHub Pages:hosting

more images can be added by dropping them into /images/ and editing script.js.


