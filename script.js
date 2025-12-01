// New single-image quiz logic
// -------------------------
// IMAGE LIST (edit these as needed)
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
    {src: "images/Real8.jpg", type: "real"}
];

// -------------------------
// STATE
// -------------------------
let questions = []; //  hold the full sequence of questions (all intervals concatenated)
let currentIndex = 0;
let intervals = [30, 20, 15, 10, 5, 1];
let timeLeft = 0;
let currentQuestionMax = 1;
let timerInterval = null;
let score = 0;
let answerLog = [];
let inputLocked = false;

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
// HELPERS
// -------------------------
function shuffle(array) {
    let a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickN(arr, n) {
    let s = shuffle(arr);
    return s.slice(0, n);
}

// Build a 4-question set: 2 AI and 2 Real, mixed order
function buildQuestionsForInterval(seconds) {
    const ai = imageList.filter(i => i.type === 'ai');
    const real = imageList.filter(i => i.type === 'real');

    // If there aren't enough images allow reuse by repeating shuffled lists
    let chosen = [];
    let aPick = pickN(ai, Math.min(2, ai.length));
    while (aPick.length < 2) {
        aPick = aPick.concat(pickN(ai, 2 - aPick.length));
    }
    let rPick = pickN(real, Math.min(2, real.length));
    while (rPick.length < 2) {
        rPick = rPick.concat(pickN(real, 2 - rPick.length));
    }

    chosen = aPick.concat(rPick);
    chosen = shuffle(chosen);

    // attach per-question time
    return chosen.map(q => ({src: q.src, type: q.type, seconds: seconds}));
}

// -------------------------
// UI / TIMER
// -------------------------
function updateTimerDisplay() {
    const t = document.getElementById("timer");
    if (t) t.innerText = "Time Left: " + timeLeft + "s";
    updateProgressBar();
}

function updateProgressBar() {
    const fill = document.getElementById('progressFill');
    if (!fill) return;
    let percent = 0;
    if (currentQuestionMax > 0) {
        percent = Math.max(0, (timeLeft / currentQuestionMax) * 100);
    }
    fill.style.width = percent + '%';
}

function showQuestion() {
    if (currentIndex >= questions.length) {
        endQuiz();
        return;
    }

    const q = questions[currentIndex];
    document.getElementById('image-main').src = q.src;
    document.getElementById('questionCounter').innerText = `Question ${currentIndex + 1} / ${questions.length}`;

    timeLeft = q.seconds;
    currentQuestionMax = q.seconds;
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // log as unanswered (null guess)
            logAnswer(null);
            // show brief feedback (flash incorrect) then continue
            flashIncorrectThenNext();
        }
    }, 1000);
}

function logAnswer(guessedType) {
    const q = questions[currentIndex];
    const correct = guessedType === q.type;
    answerLog.push({
        src: q.src,
        correctType: q.type,
        guessedType: guessedType,
        correct: correct,
        timeRemaining: timeLeft
    });
    if (correct) score++;
}

function flashIncorrectThenNext() {
    inputLocked = true;
    const box = document.getElementById('image-box');
    box.classList.add('incorrect');
    setTimeout(() => {
        box.classList.remove('incorrect');
        currentIndex++;
        inputLocked = false;
        showQuestion();
    }, 700);
}

function flashCorrectThenNext() {
    inputLocked = true;
    const box = document.getElementById('image-box');
    box.classList.add('correct');
    setTimeout(() => {
        box.classList.remove('correct');
        currentIndex++;
        inputLocked = false;
        showQuestion();
    }, 700);
}

// -------------------------
// QUIZ flow
// -------------------------
function startFullQuiz() {
    if (checkIfCompleted()) return;
    // Build full questions list: for each interval, add 4 questions (2 AI, 2 Real)
    questions = [];
    intervals.forEach(sec => {
        questions = questions.concat(buildQuestionsForInterval(sec));
    });
    currentIndex = 0;
    score = 0;
    answerLog = [];
    showQuestion();
}

function guess(type) {
    if (inputLocked) return;
    clearInterval(timerInterval);
    // record
    logAnswer(type);
    // show feedback based on correctness
    const q = questions[currentIndex];
    if (q.type === type) {
        flashCorrectThenNext();
    } else {
        // show incorrect then next
        flashIncorrectThenNext();
    }
}

function endQuiz() {
    localStorage.setItem("testCompleted", "true");

    let data = {
        score: score,
        totalQuestions: questions.length,
        secondsPerQuestionSequence: intervals,
        browser: navigator.userAgent,
        userId: userId,
        answers: answerLog
    };

    // POST to server (if configured)
    fetch("GOOGLE_SCRIPT_URL_HERE", {
        method: "POST",
        redirect: "follow",
        body: JSON.stringify(data)
    }).catch(err => console.log("Data send error:", err));

    // Show results
    document.getElementById("game").style.display = "none";
    document.getElementById("results").innerHTML = `
        <div class="results-content">
            <h2>🎉 Test Complete!</h2>
            <div class="result-item">
                <div class="result-label">Your Score</div>
                <div class="result-value">${score}/${questions.length}</div>
            </div>
            <div class="result-item">
                <div class="result-label">Accuracy</div>
                <div class="result-value">${Math.round((score/questions.length)*100)}%</div>
            </div>
        </div>
    `;
    document.getElementById("results").style.display = "block";
}

// -------------------------
// Setup event listeners
// -------------------------
window.addEventListener('DOMContentLoaded', () => {
    // start button: run the full sequence (30s -> 1s blocks)
    document.getElementById('startBtn').addEventListener('click', () => {
        startFullQuiz();
    });

    document.getElementById('btn-ai').addEventListener('click', () => guess('ai'));
    document.getElementById('btn-real').addEventListener('click', () => guess('real'));



    if (checkIfCompleted()) return;
});

