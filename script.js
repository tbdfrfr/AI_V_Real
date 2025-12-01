//IMAGE LIST 
let imageList = [
    {src: "images/AI1.jpg", type: "ai"},
    {src: "images/AI2.jpg", type: "ai"},
    {src: "images/AI3.jpg", type: "ai"},
    {src: "images/AI4.jpg", type: "ai"},
    {src: "images/AI5.jpg", type: "ai"},
    {src: "images/AI6.jpg", type: "ai"},
    {src: "images/AI7.jpg", type: "ai"},
    {src: "images/AI8.jpg", type: "ai"},
    {src: "images/AI9.jpg", type: "ai"},
    {src: "images/AI10.jpg", type: "ai"},
    {src: "images/AI11.jpg", type: "ai"},
    {src: "images/AI12.jpg", type: "ai"},
    {src: "images/Real1.png", type: "real"},
    {src: "images/Real2.png", type: "real"},
    {src: "images/Real3.png", type: "real"},
    {src: "images/Real4.png", type: "real"},
    {src: "images/Real5.png", type: "real"},
    {src: "images/Real6.png", type: "real"},
    {src: "images/Real7.png", type: "real"},
    {src: "images/Real8.png", type: "real"},
    {src: "images/Real9.png", type: "real"},
    {src: "images/Real10.png", type: "real"},
    {src: "images/Real11.png", type: "real"},
    {src: "images/Real12.png", type: "real"}
];

// -------------------------
// STATE
// -------------------------
let questions = []; //  hold the full sequence of questions (all intervals concatenated)
let currentIndex = 0;
let intervals = [40, 30, 20, 15, 10, 5];
let timeLeft = 0;
let currentQuestionMax = 1;
let timerInterval = null;
let score = 0;
let answerLog = [];
let inputLocked = false;
let rafId = null;
let questionEndTime = 0;
let questionStartTime = 0;

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
// -------------------------
// PROGRESSIVE PRELOAD IMAGES (non-blocking)
// -------------------------
let preloadedMap = {};
function preloadImages(list, onProgress, options = {}) {
    // options: immediateCount, batchSize, batchDelayMs
    const immediateCount = options.immediateCount || Math.min(6, list.length);
    const batchSize = options.batchSize || 4;
    const batchDelayMs = options.batchDelayMs || 150;

    return new Promise((resolve) => {
        if (!Array.isArray(list) || list.length === 0) return resolve({});
        let loaded = 0;
        const total = list.length;
        let lastUpdate = 0;

        function reportProgress(src) {
            const now = Date.now();
            if (onProgress && (now - lastUpdate > 120 || loaded === total)) {
                lastUpdate = now;
                try { onProgress(loaded, total, src); } catch (e) {}
            }
        }

        // helper to load one image
        function loadOne(item, cb) {
            const img = new Image();
            img.onload = img.onerror = () => {
                loaded++;
                preloadedMap[item.src] = img;
                reportProgress(item.src);
                if (cb) cb();
                if (loaded === total) resolve(preloadedMap);
            };
            img.src = item.src;
        }

        // load immediate set quickly (still async)
        let i = 0;
        for (; i < immediateCount && i < list.length; i++) {
            loadOne(list[i]);
        }

        // schedule remaining in batches to avoid blocking main thread/network
        const remaining = list.slice(i);
        if (remaining.length === 0) return;

        let batchIndex = 0;
        function loadNextBatch() {
            const start = batchIndex * batchSize;
            if (start >= remaining.length) return;
            const batch = remaining.slice(start, start + batchSize);
            batch.forEach(item => loadOne(item));
            batchIndex++;
            if (start + batchSize < remaining.length) {
                setTimeout(loadNextBatch, batchDelayMs);
            }
        }
        // start background batches
        setTimeout(loadNextBatch, batchDelayMs);
    });
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
    // keep this as a fallback (integer-second updates). Smooth animation is handled
    // by the requestAnimationFrame loop started per-question.
    fill.style.width = percent + '%';
}

function startProgressAnimation() {
    // cancel any running animation
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    const fill = document.getElementById('progressFill');
    if (!fill || currentQuestionMax <= 0) return;

    function tick() {
        const now = Date.now();
        const remainingMs = Math.max(0, questionEndTime - now);
        const percent = (remainingMs / (currentQuestionMax * 1000)) * 100;

        // clamp and update width
        const clamped = Math.max(0, Math.min(100, percent));
        fill.style.width = clamped + '%';

        // color thresholds: >66% green, >33% yellow, else red
        fill.classList.remove('green', 'yellow', 'red');
        if (clamped > 66) {
            fill.classList.add('green');
        } else if (clamped > 33) {
            fill.classList.add('yellow');
        } else {
            fill.classList.add('red');
        }

        if (remainingMs > 0) {
            rafId = requestAnimationFrame(tick);
        } else {
            rafId = null;
        }
    }

    rafId = requestAnimationFrame(tick);
}

function showQuestion() {
    if (currentIndex >= questions.length) {
        endQuiz();
        return;
    }

    const q = questions[currentIndex];
    const imgEl = document.getElementById('image-main');
    // fade-out current image then set new src, let onload fade it in
    try { imgEl.style.opacity = 0; } catch(e) {}
    let onLoaded = () => { try { imgEl.style.opacity = 1; } catch(e) {} };
    imgEl.onload = onLoaded;
    imgEl.src = q.src;
    // If image was cached and already complete, ensure we still show it
    if (imgEl.complete) {
        // small timeout to allow browser to settle and run transition
        setTimeout(onLoaded, 20);
    }
    document.getElementById('questionCounter').innerText = `Question ${currentIndex + 1} / ${questions.length}`;

    timeLeft = q.seconds;
    currentQuestionMax = q.seconds;
    updateTimerDisplay();

    // set precise timeline for smooth animation
    questionStartTime = Date.now();
    questionEndTime = questionStartTime + q.seconds * 1000;

    // start smooth visual animation
    startProgressAnimation();

    // start integer-second timer for textual seconds display and end-of-time handling
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // ensure animation stops and bar is at 0
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            const fill = document.getElementById('progressFill');
            if (fill) {
                fill.style.width = '0%';
                fill.classList.remove('green', 'yellow');
                fill.classList.add('red');
            }
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
    // Build full questions list without reusing images: consume shuffled AI and Real pools
    const aiPool = shuffle(imageList.filter(i => i.type === 'ai'));
    const realPool = shuffle(imageList.filter(i => i.type === 'real'));
    // If pools are smaller than needed, fallback will reuse shuffled copies (rare)
    let aiIdx = 0;
    let realIdx = 0;
    questions = [];
    intervals.forEach(sec => {
        let block = [];
        for (let k = 0; k < 2; k++) {
            if (aiIdx >= aiPool.length) {
                // refill with a fresh shuffled copy to avoid crash
                aiPool.push(...shuffle(imageList.filter(i => i.type === 'ai')));
            }
            block.push(aiPool[aiIdx++]);
        }
        for (let k = 0; k < 2; k++) {
            if (realIdx >= realPool.length) {
                realPool.push(...shuffle(imageList.filter(i => i.type === 'real')));
            }
            block.push(realPool[realIdx++]);
        }
        // shuffle block so ai/real are mixed within the 4-question block
        questions = questions.concat(shuffle(block).map(q => ({src: q.src, type: q.type, seconds: sec})));
    });
    currentIndex = 0;
    score = 0;
    answerLog = [];
    showQuestion();
}

function guess(type) {
    if (inputLocked) return;
    clearInterval(timerInterval);
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
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
        answers: answerLog,
        timestamp: new Date().toISOString()
    };

    // POST to server (if i actually deployed somewhere)
    fetch("https://script.google.com/macros/s/AKfycbxUFfklziH_fD-qz3tzzva5s4cr5D3khusFSZUOCfigP6or9iMQXLXeZHDqTaMMJL9K/exec", {
        method: "POST",  //Dont do it, i know you want to
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

    // Trigger confetti effect
    if (window.confetti) {
        // Single burst confetti for celebration YIPPEE :D
        confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// -------------------------
// Setup event listeners :o
// -------------------------
window.addEventListener('DOMContentLoaded', () => {
    // Show modal on load if not already completed
    if (!checkIfCompleted()) {
        // the modal is controlled via CSS/display; ensure it's visible immediately
        const modal = document.getElementById('instructionModal');
        modal.style.display = 'flex';

        // start preloading images while modal is visible (progressive)
        const modalStatus = document.getElementById('modalStatus');
        const startBtn = document.getElementById('startFromModal');
        const immediateCount = Math.min(6, imageList.length);
        preloadImages(imageList, (loaded, total) => {
            if (modalStatus) modalStatus.innerText = `Loading images... (${loaded}/${total})`;
            // allow user to start once the quick set is ready for perceived speed
            if (loaded >= immediateCount && startBtn && startBtn.disabled) {
                startBtn.disabled = false;
                if (modalStatus) modalStatus.innerText = `Ready — ${loaded}/${total} images loaded`;
            }
        }, { immediateCount: immediateCount, batchSize: 4, batchDelayMs: 150 }).then(() => {
            // all images preloaded — ensure start enabled and UI revealed
            document.body.classList.remove('loading');
            if (modalStatus) modalStatus.innerText = `Ready — ${imageList.length} images loaded`;
            if (startBtn) startBtn.disabled = false;
        });
    }

    // start button in modal: run the full sequence (30s -> 1s blocks)
    document.getElementById('startFromModal').addEventListener('click', () => {
        document.getElementById('instructionModal').style.display = 'none';
        startFullQuiz();
    });

    document.getElementById('btn-ai').addEventListener('click', () => guess('ai'));
    document.getElementById('btn-real').addEventListener('click', () => guess('real'));
});

