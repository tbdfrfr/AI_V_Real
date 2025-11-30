// -------------------------
// SETTINGS
// -------------------------
let timeStart = 60;       // first round timer
let decreaseFast = 10;    // -10s each round until 10s
let decreaseSlow = 1;     // -1s each round after 10s
let minTimeFast = 10;     // switch point
let minTimeSlow = 1;      // minimum

// -------------------------
// IMAGE LIST (edit these!)
// -------------------------
let imageList = [
    {src: "images/Ai_1.jpg", type: "ai"},
    {src: "images/Ai_2.jpg", type: "ai"},
    {src: "images/AI_3.jpg", type: "ai"},
    {src: "images/ai_4.jpg", type: "ai"},
    {src: "images/Ai_5.jpg", type: "ai"},
    {src: "images/AI_6.jpg", type: "ai"},
    {src: "images/ai_7.jpg", type: "ai"},
    {src: "images/Ai_8.jpg", type: "ai"},
    {src: "images/Real1.jpg", type: "real"},
    {src: "images/real2.jpg", type: "real"},
    {src: "images/Real3.jpg", type: "real"},
    {src: "images/real4.jpg", type: "real"},
    {src: "images/Real5.jpg", type: "real"},
    {src: "images/Real6.jpg", type: "real"},
    {src: "images/Real7.jpg", type: "real"},
    {src: "images/Real8.jpg", type: "real"},
];

// Build pairs so each round contains exactly one AI and one Real image.
// separate lists, shuffle each, pair by index, randomize left/right per pair.
let aiImages = imageList.filter(i => i.type === 'ai');
let realImages = imageList.filter(i => i.type === 'real');
let images = [];

// Number of pairs is limited by the smaller of the two lists
let pairsCount = Math.min(aiImages.length, realImages.length);
// Shuffle lists first (will use a robust shuffle below)
aiImages = shuffle(aiImages);
realImages = shuffle(realImages);

// Build pairs and explicitly randomize which side is AI each round
for (let i = 0; i < pairsCount; i++) {
    const ai = aiImages[i];
    const real = realImages[i];

    // Randomly decide whether AI appears on the left or right
    if (Math.random() < 0.5) {
        images.push([ai, real]); // left = AI, right = Real
    } else {
        images.push([real, ai]); // left = Real, right = AI
    }
}

// Shuffle order of rounds as well
images = shuffle(images);

// -------------------------
// VARIABLES
// -------------------------
let roundIndex = 0;
let timeLeft = timeStart;
let timerInterval;
let score = 0;
let totalRounds = images.length;
let answerLog = [];
let currentRoundMax = timeStart; // stores the time at start of current round (for progress bar)
let inputLocked = false; // lock clicks during feedback

// Compute the fixed time allocated for a given round index.
// rounds start with `timeStart`, then decrease by `decreaseFast` until
// reaching `minTimeFast`, after which they decrease by `decreaseSlow` down to `minTimeSlow`.
function getTimeForRound(index) {
    // if you want a different progression (e.g., linear), adjust here.
    // We'll compute total decrement amount across completed rounds.
    let roundsCompleted = index; // 0-based: round 0 gets full timeStart
    let time = timeStart;

    // Apply fast decreases first (each completed round reduces the per-round time by decreaseFast)
    let fastRounds = Math.max(0, Math.floor((timeStart - minTimeFast) / decreaseFast));

    if (roundsCompleted <= 0) return Math.max(minTimeSlow, timeStart);

    // For each completed round, reduce the per-round time accordingly
    for (let r = 0; r < roundsCompleted; r++) {
        if (time > minTimeFast) {
            time -= decreaseFast;
            if (time < minTimeFast) time = minTimeFast;
        } else if (time > minTimeSlow) {
            time -= decreaseSlow;
            if (time < minTimeSlow) time = minTimeSlow;
        }
    }

    return Math.max(minTimeSlow, Math.floor(time));
}

// -------------------------
// UNIQUE USER ID
// -------------------------
if (!localStorage.getItem("userId")) {
    localStorage.setItem("userId", "user_" + Math.random().toString(36).substring(2));
}
let userId = localStorage.getItem("userId");

// -------------------------
// LOCKOUT CHECK
// -------------------------
function checkIfCompleted() {
    if (localStorage.getItem("testCompleted") === "true") {
        document.getElementById("game").style.display = "none";
        document.getElementById("blocked").style.display = "block";
        return true;
    }
    return false;
}

// -------------------------
// GAME LOGIC
// -------------------------
function startRound() {
    if (checkIfCompleted()) return;

    if (roundIndex >= images.length) {
        endGame();
        return;
    }

    let pair = images[roundIndex];
    document.getElementById("image-left").src = pair[0].src;
    document.getElementById("image-right").src = pair[1].src;

    // For this round, set a fresh time allocation (do NOT reuse leftover time)
    timeLeft = getTimeForRound(roundIndex);
    currentRoundMax = timeLeft;
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            // time out: advance round without feedback
            clearInterval(timerInterval);
            // apply a small pause so user sees 0% briefly
            setTimeout(() => {
                nextRound();
            }, 200);
        }
    }, 1000);
}

function guess(position) {
    if (inputLocked) return; // ignore clicks while showing feedback
    inputLocked = true;

    // stop the timer while feedback is shown
    clearInterval(timerInterval);

    let pair = images[roundIndex];
    let guessedIndex = position === 'left' ? 0 : 1;
    let guessedImage = pair[guessedIndex];
    let isCorrect = guessedImage.type === "ai";

    // Log attempt
    answerLog.push({
        imageLeft: pair[0].src,
        imageRight: pair[1].src,
        guessedPosition: position,
        guessedImage: guessedImage.src,
        guessedType: guessedImage.type,
        correct: isCorrect,
        timeGiven: timeLeft
    });

    if (isCorrect) score++;

    // Visual feedback: highlight correct and incorrect boxes
    const boxLeft = document.getElementById('box-left');
    const boxRight = document.getElementById('box-right');
    const aiIndex = pair[0].type === 'ai' ? 0 : 1;

    // add classes
    if (aiIndex === 0) {
        boxLeft.classList.add('correct');
    } else {
        boxRight.classList.add('correct');
    }

    if (guessedIndex !== aiIndex) {
        // user chose wrong -> mark guessed as incorrect
        if (guessedIndex === 0) boxLeft.classList.add('incorrect');
        else boxRight.classList.add('incorrect');
    }

    // short delay so user sees feedback, then advance to next round
    setTimeout(() => {
        // clear classes
        boxLeft.classList.remove('correct', 'incorrect');
        boxRight.classList.remove('correct', 'incorrect');

        // advance to next round index and start the round (which sets fresh time)
        roundIndex++;
        inputLocked = false;
        startRound();
    }, 900);
}

function nextRound() {
    clearInterval(timerInterval);
    // move to next round and start it; startRound will set timeLeft for that round
    roundIndex++;
    startRound();
}

function endGame() {
    localStorage.setItem("testCompleted", "true");

    let data = {
        score: score,
        totalRounds: totalRounds,
        fastestTime: timeLeft,
        browser: navigator.userAgent,
        userId: userId,
        answers: answerLog
    };

    // SEND TO GOOGLE SHEETS
    fetch("GOOGLE_SCRIPT_URL_HERE", {
        method: "POST",
        redirect: "follow",
        body: JSON.stringify(data)
    }).catch(err => console.log("Data send error:", err));

    // Show results on page
    document.getElementById("game").style.display = "none";
    document.getElementById("results").innerHTML = `
        <div class="results-content">
            <h2>🎉 Test Complete!</h2>
            <div class="result-item">
                <div class="result-label">Your Score</div>
                <div class="result-value">${score}/${totalRounds}</div>
            </div>
            <div class="result-item">
                <div class="result-label">Accuracy</div>
                <div class="result-value">${Math.round((score/totalRounds)*100)}%</div>
            </div>
            <div class="result-item">
                <div class="result-label">Fastest Time Reached</div>
                <div class="result-value">${timeLeft}s</div>
            </div>
        </div>
    `;
    document.getElementById("results").style.display = "block";
}

// -------------------------

// Update progress fill based on current round max time
function updateProgressBar() {
    const fill = document.getElementById('progressFill');
    if (!fill) return;
    let percent = 0;
    if (currentRoundMax > 0) {
        percent = Math.max(0, (timeLeft / currentRoundMax) * 100);
    }
    fill.style.width = percent + '%';
}

// keep timer text and progress bar in sync
function updateTimerDisplay() {
    const t = document.getElementById("timer");
    if (t) t.innerText = "Time Left: " + timeLeft + "s";
    updateProgressBar();
}

function shuffle(array) {
    // Fisher-Yates shuffle(what even is that) for a uniform shuffle
    let a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

window.onload = () => {
    if (!checkIfCompleted()) startRound();
};
