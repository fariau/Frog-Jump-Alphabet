(function () {
  const app = document.querySelector('.app');
  const pond = document.getElementById('pond');
  const pads = Array.from(document.querySelectorAll('.pad'));
  const frogWrap = document.getElementById('frogWrap');
  const frog = document.getElementById('frog');
  const sign = document.getElementById('sign');
  const signText = document.getElementById('signText');
  const roundLabel = document.getElementById('roundLabel');
  const replayBtn = document.getElementById('replayBtn');
  const hearts = Array.from(document.querySelectorAll('.heart'));
  const scoreValue = document.getElementById('scoreValue');
  const bestValue = document.getElementById('bestValue');
  const streakValue = document.getElementById('streakValue');
  const streakChip = document.getElementById('streakChip');
  const feedback = document.getElementById('feedback');
  const flash = document.getElementById('flash');
  const bubblesLayer = document.getElementById('bubbles');
  const confettiLayer = document.getElementById('confettiLayer');
  const overlay = document.getElementById('overlay');
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const finalScore = document.getElementById('finalScore');
  const finalBest = document.getElementById('finalBest');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const soundBtn = document.getElementById('soundBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const MAX_LIVES = 3;
  const hasSpeech = 'speechSynthesis' in window;

  let lives = MAX_LIVES;
  let score = 0;
  let best = 0;
  let streak = 0;
  let roundNumber = 1;
  let busy = false;
  let soundOn = true;
  let currentLetter = null;
  let lastLetter = null;

  try {
    best = parseInt(localStorage.getItem('frogAbcBest'), 10) || 0;
  } catch (e) { /* storage unavailable */ }
  renderBest();

  function renderBest() { bestValue.textContent = 'Best ' + best; }
  function renderScore(animate) {
    scoreValue.textContent = String(score);
    if (animate) restart(scoreValue, 'pop');
  }
  function renderLives(lost) {
    hearts.forEach((h, i) => {
      const empty = i >= lives;
      h.classList.toggle('empty', empty);
      if (lost && i === lives) restart(h, 'losing');
    });
  }
  function renderStreak(celebrate) {
    streakValue.textContent = 'Streak ' + streak;
    if (celebrate) restart(streakChip, 'pulse');
  }
  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function pickLetter() {
    let letter;
    do { letter = ALPHABET[randInt(0, ALPHABET.length - 1)]; }
    while (letter === lastLetter);
    lastLetter = letter;
    return letter;
  }

  function buildOptions(correct) {
    const opts = new Set([correct]);
    while (opts.size < 3) opts.add(ALPHABET[randInt(0, ALPHABET.length - 1)]);
    const arr = Array.from(opts);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function loadRound() {
    currentLetter = pickLetter();
    roundLabel.textContent = 'Round ' + roundNumber;
    restart(sign, 'refresh');
    const options = buildOptions(currentLetter);
    pads.forEach((pad, i) => {
      pad.classList.remove('sinking', 'correct-glow');
      pad.style.pointerEvents = 'auto';
      pad.style.opacity = '';
      pad.style.transform = '';
      pad.querySelector('.value').textContent = options[i];
      pad.dataset.value = options[i];
      restart(pad, 'pad-enter');
    });
    signText.textContent = hasSpeech ? 'Listen, then tap the letter' : 'Find the letter ' + currentLetter;
    speakLetter(currentLetter);
  }

  function showFeedback(text, good) {
    feedback.textContent = text;
    feedback.className = 'feedback show ' + (good ? 'good' : 'bad');
    setTimeout(() => feedback.classList.remove('show'), 750);
  }

  function centerOf(el) {
    const pondRect = pond.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: (r.left + r.width / 2) - (pondRect.left + pondRect.width / 2),
      y: (r.top + r.height / 2) - (pondRect.top + pondRect.height / 2)
    };
  }

  /* ---- Speech ---- */
  let chosenVoice = null;
  let activeUtterance = null;
  function initVoices() {
    if (!hasSpeech) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return false;
      chosenVoice =
        voices.find(v => /en-US/i.test(v.lang) && /Google/i.test(v.name)) ||
        voices.find(v => /Google/i.test(v.name) && /^en/i.test(v.lang)) ||
        voices.find(v => /Natural/i.test(v.name) && /^en/i.test(v.lang)) ||
        voices.find(v => /en-US/i.test(v.lang)) ||
        voices.find(v => /^en/i.test(v.lang)) ||
        voices[0] || null;
      return true;
    };
    pick();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = pick;
    }
    // Some mobile browsers never fire onvoiceschanged and return an
    // empty list at first, so keep retrying briefly until voices show up.
    let attempts = 0;
    const retry = setInterval(() => {
      attempts += 1;
      if (pick() || attempts > 10) clearInterval(retry);
    }, 300);
  }
  initVoices();

  function speakLetter(letter) {
    if (!hasSpeech) { revealLetterFallback(letter); return; }
    if (!soundOn) { revealLetterFallback(letter); return; }
    try {
      window.speechSynthesis.cancel();
      // Calling speak() immediately after cancel() gets silently dropped
      // on some mobile browsers (notably Android Chrome); a short delay
      // avoids the race. Keeping the utterance in an outer variable stops
      // it from being garbage-collected mid-speech, which also causes
      // silent failures on mobile.
      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(letter);
        utter.lang = 'en-US';
        utter.rate = 0.8;
        utter.volume = 1;
        if (chosenVoice) utter.voice = chosenVoice;
        activeUtterance = utter;
        utter.onerror = () => { revealLetterFallback(letter); };
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utter);
        restart(replayBtn, 'playing');
        // Some phones fire the "start" event and report success even
        // when no audible sound plays (muted ringer switch, missing
        // voice data, restricted browser audio). Since that can't be
        // detected from JS, always reveal the letter as text shortly
        // after, so the game stays playable whether or not audio works.
        setTimeout(() => revealLetterFallback(letter), 1100);
      }, 60);
    } catch (e) { revealLetterFallback(letter); }
  }

  function revealLetterFallback(letter) {
  signText.textContent = 'Listen, then tap the letter';
  }

  /* ---- Sound effects ---- */
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }
  function playTone(freq, dur, type, delay) {
    if (!soundOn) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + (delay || 0);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    } catch (e) { /* ignore */ }
  }
  const soundJump = () => playTone(520, 0.1, 'triangle');
  const soundCorrect = () => { playTone(660, 0.12, 'triangle'); playTone(880, 0.16, 'triangle', 0.1); };
  const soundStreak = () => { playTone(523, 0.1, 'square'); playTone(659, 0.1, 'square', 0.09); playTone(784, 0.16, 'square', 0.18); };
  const soundWrong = () => playTone(220, 0.18, 'sawtooth');
  const soundSplash = () => playTone(140, 0.25, 'sawtooth');

  /* ---- Bubbles ---- */
  function spawnBubble() {
    if (document.hidden) return;
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = randInt(5, 11);
    const duration = randInt(4, 7);
    b.style.left = randInt(5, 95) + '%';
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.setProperty('--drift', randInt(-20, 20) + 'px');
    b.style.animationDuration = duration + 's';
    bubblesLayer.appendChild(b);
    setTimeout(() => b.remove(), duration * 1000 + 100);
  }
  setInterval(spawnBubble, 950);

  /* ---- Confetti ---- */
  const confettiColors = ['#ffd24d', '#ff6b5e', '#96d97a', '#79d2f2', '#ffffff'];
  function spawnConfetti(originX, originY) {
    const rect = pond.getBoundingClientRect();
    const baseX = rect.width / 2 + originX;
    const baseY = rect.height / 2 + originY;
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const dist = randInt(40, 100);
      p.style.left = baseX + 'px';
      p.style.top = baseY + 'px';
      p.style.background = confettiColors[randInt(0, confettiColors.length - 1)];
      p.style.setProperty('--cx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--cy', Math.sin(angle) * dist - 20 + 'px');
      p.style.setProperty('--cr', randInt(90, 360) + 'deg');
      confettiLayer.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  }

  function spawnSplash(target) {
    const s = document.createElement('div');
    s.className = 'splash';
    const rect = pond.getBoundingClientRect();
    s.style.left = (rect.width / 2 + target.x - 37) + 'px';
    s.style.top = (rect.height / 2 + target.y + 18) + 'px';
    pond.appendChild(s);
    requestAnimationFrame(() => s.classList.add('show'));
    setTimeout(() => s.remove(), 700);
  }

  function resetFrog() {
    frogWrap.classList.remove('falling');
    frog.classList.remove('takeoff', 'landing');
    frogWrap.style.transition = 'none';
    frogWrap.style.transform = 'translateX(-50%)';
    void frogWrap.offsetWidth;
    frogWrap.style.transition = '';
  }

  function selectPad(pad) {
    if (busy) return;
    busy = true;
    const isCorrect = pad.dataset.value === currentLetter;
    const from = centerOf(frogWrap);
    const target = centerOf(pad);
    const dx = target.x - from.x;
    const dy = target.y - from.y;

    if (isCorrect) {
      pad.classList.add('correct-glow');
      frog.classList.add('takeoff');
      frogWrap.style.transform = 'translate(calc(-50% + ' + dx + 'px), ' + (dy - 16) + 'px)';
      soundJump();
      setTimeout(() => { frog.classList.remove('takeoff'); frog.classList.add('landing'); }, 250);
      setTimeout(soundCorrect, 150);
      setTimeout(() => {
        score += 1;
        streak += 1;
        roundNumber += 1;
        const milestone = streak % 3 === 0;
        renderScore(true);
        renderStreak(milestone);
        if (milestone) soundStreak();
        if (score > best) {
          best = score;
          renderBest();
          try { localStorage.setItem('frogAbcBest', String(best)); } catch (e) {}
        }
        spawnConfetti(target.x, target.y);
        showFeedback(milestone ? 'On a roll!' : 'Correct!', true);
        setTimeout(() => {
          frog.classList.remove('landing');
          resetFrog();
          loadRound();
          busy = false;
        }, 450);
      }, 550);
    } else {
      pads.forEach(p => p.style.pointerEvents = 'none');
      pad.classList.add('sinking');
      frogWrap.style.transform = 'translate(calc(-50% + ' + dx + 'px), ' + dy + 'px)';
      soundWrong();
      restart(app, 'shake');
      restart(flash, 'hit');
      setTimeout(() => {
        frogWrap.classList.add('falling');
        spawnSplash(target);
        soundSplash();
      }, 350);
      setTimeout(() => {
        lives -= 1;
        streak = 0;
        renderLives(true);
        renderStreak(false);
        showFeedback('That was ' + currentLetter, false);
        if (lives <= 0) {
          setTimeout(showGameOver, 600);
        } else {
          setTimeout(() => {
            resetFrog();
            roundNumber += 1;
            loadRound();
            busy = false;
          }, 650);
        }
      }, 900);
    }
  }

  function showGameOver() {
    finalScore.textContent = 'Score ' + score;
    finalBest.textContent = 'Best ' + best;
    overlay.classList.add('show');
  }

  function resetGame() {
    lives = MAX_LIVES;
    score = 0;
    streak = 0;
    roundNumber = 1;
    busy = false;
    renderLives(false);
    renderScore(false);
    renderStreak(false);
    overlay.classList.remove('show');
    resetFrog();
    loadRound();
  }

  pads.forEach(pad => pad.addEventListener('click', () => selectPad(pad)));
  replayBtn.addEventListener('click', () => { if (currentLetter) speakLetter(currentLetter); });
  playAgainBtn.addEventListener('click', resetGame);

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) {
      const ctx = getCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } else if (hasSpeech) {
      window.speechSynthesis.cancel();
    }
  });

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  window.addEventListener('resize', () => { if (!busy) resetFrog(); });

  startBtn.addEventListener('click', () => {
    startOverlay.classList.remove('show');
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (hasSpeech) {
      try {
        // A silent speak() inside this tap unlocks speech synthesis on
        // iOS/Android; keeping a reference stops it being garbage-collected.
        activeUtterance = new SpeechSynthesisUtterance(' ');
        activeUtterance.volume = 0;
        window.speechSynthesis.speak(activeUtterance);
      } catch (e) { /* ignore */ }
    }
    renderLives(false);
    renderScore(false);
    renderStreak(false);
    loadRound();
  }, { once: true });
})();
