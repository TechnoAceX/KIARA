/* ═══════════════════════════════════════════
   KIARA · script.js
   Animations, Upload, Charts, Interactions
═══════════════════════════════════════════ */

/* ════════ NAVBAR SCROLL ════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  updateActiveNav();
});

function updateActiveNav() {
  const sections = ['dashboard', 'analysis', 'reports', 'research'];
  const links = document.querySelectorAll('.nav-link');
  let current = 'dashboard';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  links.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + current);
  });
}

/* ════════ HAMBURGER ════════ */
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger?.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach(l => {
  l.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ════════ HERO CANVAS PARTICLES ════════ */
(function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : H + 10;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -Math.random() * 0.6 - 0.2;
      this.r = Math.random() * 1.5 + 0.3;
      this.alpha = Math.random() * 0.6 + 0.2;
      this.color = Math.random() > 0.5 ? '0,245,255' : '0,102,255';
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.alpha -= 0.001;
      if (this.y < -10 || this.alpha <= 0) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 120; i++) particles.push(new Particle());

  function animate() {
    ctx.clearRect(0, 0, W, H);
    // Draw connecting lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,245,255,${0.06 * (1 - dist / 80)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ════════ HERO STAT COUNTERS ════════ */
function animateValue(el, target, duration = 2000, decimals = 0) {
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = target * ease;
    el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

const heroStatEls = document.querySelectorAll('.hstat-val[data-target]');
const heroObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const t = parseFloat(el.dataset.target);
      const dec = t < 10 ? 1 : 0;
      animateValue(el, t, 2000, dec);
      heroObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
heroStatEls.forEach(el => heroObserver.observe(el));

/* ════════ UPLOAD & ANALYSIS ════════ */
const uploadZone = document.getElementById('uploadZone');
const fileInput  = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewImg = document.getElementById('previewImg');
const analyzeBtn = document.getElementById('analyzeBtn');
const predBadge  = document.getElementById('predBadge');
const predBody   = document.getElementById('predictionBody');
const predResult = document.getElementById('predictionResult');
const gradcamSection = document.getElementById('gradcamSection');
let uploadedFile = null;

// DR scenarios
const scenarios = [
  {
    label: 'Healthy', grade: 'DR Grade 0 — No Diabetic Retinopathy',
    confidence: 97, sevPct: 2, sevLabel: 'None',
    haem: ['None Detected', 'green', '✓'],
    exudate: ['None Detected', 'green', '✓'],
    neo: ['None Detected', 'green', '✓'],
    macula: ['None Detected', 'green', '✓']
  },
  {
    label: 'Mild DR', grade: 'DR Grade 1 — Mild Non-Proliferative DR',
    confidence: 89, sevPct: 28, sevLabel: 'Mild',
    haem: ['Microaneurysms Present', 'orange', '!'],
    exudate: ['None Detected', 'green', '✓'],
    neo: ['None Detected', 'green', '✓'],
    macula: ['None Detected', 'green', '✓']
  },
  {
    label: 'Moderate DR', grade: 'DR Grade 2 — Moderate Non-Proliferative DR',
    confidence: 85, sevPct: 55, sevLabel: 'Moderate',
    haem: ['Haemorrhages Detected', 'red', '✗'],
    exudate: ['Hard Exudates Present', 'orange', '!'],
    neo: ['None Detected', 'green', '✓'],
    macula: ['Possible Edema', 'orange', '!']
  },
  {
    label: 'Severe DR', grade: 'DR Grade 3 — Severe Non-Proliferative DR',
    confidence: 82, sevPct: 82, sevLabel: 'Severe',
    haem: ['Extensive Haemorrhages', 'red', '✗'],
    exudate: ['Cotton Wool Spots', 'red', '✗'],
    neo: ['Early Neovascularization', 'red', '✗'],
    macula: ['Macular Edema Detected', 'red', '✗']
  }
];

// Drag & drop
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});
uploadZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    previewImg.src = ev.target.result;
    document.getElementById('gradcamOriginal').src = ev.target.result;
    document.getElementById('gradcamOriginal2').src = ev.target.result;
    uploadZone.style.display = 'none';
    previewSection.style.display = 'block';
    // Show image resolution
    const img = new Image();
    img.onload = () => {
      const resEl = document.getElementById('imgRes');
      if (resEl) resEl.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

analyzeBtn.addEventListener('click', runAnalysis);

function runAnalysis() {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '⬡ Analyzing…';
  predBadge.textContent = 'PROCESSING';
  predBadge.className = 'card-badge processing';
  predBody.style.display = 'none';
  predResult.style.display = 'none';

  const steps = ['step1','step2','step3','step4','step5'];
  let currentStep = 0;

  // Advance steps
  function advanceStep() {
    if (currentStep > 0) {
      document.getElementById(steps[currentStep - 1]).classList.remove('active');
      document.getElementById(steps[currentStep - 1]).classList.add('done');
    }
    if (currentStep < steps.length) {
      document.getElementById(steps[currentStep]).classList.add('active');
      currentStep++;
      const delay = 400 + Math.random() * 600;
      setTimeout(advanceStep, delay);
    } else {
      // Done — show results
      setTimeout(showResults, 500);
    }
  }

  // Reset steps
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'sstep';
    el.querySelector('.sstep-dot').style.background = '';
  });
  advanceStep();
}

function showResults() {
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  // Prediction result
  document.getElementById('resultDiagnosis').textContent = scenario.label;
  document.getElementById('resultGrade').textContent = scenario.grade;

  // Indicators
  setIndicator('ind-haem', scenario.haem);
  setIndicator('ind-exudate', scenario.exudate);
  setIndicator('ind-neo', scenario.neo);
  setIndicator('ind-macula', scenario.macula);

  // Severity bar
  document.getElementById('sevLabel').textContent = scenario.sevLabel;
  const sevColor = scenario.sevPct < 25 ? '#00f5ff' : scenario.sevPct < 55 ? '#ff9900' : '#ff3300';
  const sevFill = document.getElementById('sevFill');
  sevFill.style.width = '0%';
  setTimeout(() => { sevFill.style.width = scenario.sevPct + '%'; }, 100);

  // Confidence circle
  const conf = scenario.confidence;
  const circumference = 201;
  const offset = circumference - (circumference * conf / 100);
  const circle = document.getElementById('confCircle');
  circle.style.strokeDashoffset = circumference;
  setTimeout(() => {
    circle.style.transition = 'stroke-dashoffset 1.2s ease';
    circle.style.strokeDashoffset = offset;
  }, 100);
  // Animate confidence value
  const confEl = document.getElementById('confVal');
  confEl.textContent = '0%';
  let confVal = 0;
  const confInterval = setInterval(() => {
    confVal = Math.min(confVal + 2, conf);
    confEl.textContent = confVal + '%';
    if (confVal >= conf) clearInterval(confInterval);
  }, 20);

  // Show elements
  predBadge.textContent = 'COMPLETE';
  predBadge.className = 'card-badge done';
  predResult.style.display = 'flex';
  predResult.style.flexDirection = 'column';

  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg> Re-analyze`;

  // Grad-CAM
  gradcamSection.style.display = 'block';
  gradcamSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(drawHeatmap, 300);

  // Animate reliabilty bars
  setTimeout(animateMetrics, 600);
}

function setIndicator(id, [val, status, symbol]) {
  const valEl = document.getElementById(id + '-val');
  const statusEl = document.getElementById(id + '-status');
  const dotEl = document.querySelector(`#${id} .ind-icon`);
  if (valEl) valEl.textContent = val;
  if (statusEl) { statusEl.textContent = symbol; statusEl.className = `ind-status ${status}`; }
  if (dotEl) {
    dotEl.style.background = status === 'green' ? 'var(--green)' : status === 'orange' ? 'var(--orange)' : 'var(--red)';
  }
}

/* ════════ GRAD-CAM HEATMAP ════════ */
function drawHeatmap() {
  const canvas = document.getElementById('heatmapCanvas');
  const baseImg = document.getElementById('gradcamOriginal2');
  if (!canvas || !baseImg) return;

  const W = baseImg.offsetWidth;
  const H = baseImg.offsetHeight;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Generate synthetic heatmap blobs
  const blobs = [
    { x: W * 0.65, y: H * 0.5, r: W * 0.18, intensity: 1.0 },
    { x: W * 0.35, y: H * 0.45, r: W * 0.12, intensity: 0.7 },
    { x: W * 0.55, y: H * 0.7, r: W * 0.1, intensity: 0.6 },
    { x: W * 0.25, y: H * 0.65, r: W * 0.08, intensity: 0.4 },
    { x: W * 0.75, y: H * 0.3, r: W * 0.07, intensity: 0.5 },
  ];

  function heatToRGBA(v) {
    // Blue → Cyan → Green → Yellow → Red
    let r, g, b;
    if (v < 0.25) { r = 0; g = Math.round(v * 4 * 255); b = 255; }
    else if (v < 0.5) { r = 0; g = 255; b = Math.round((1 - (v - 0.25) * 4) * 255); }
    else if (v < 0.75) { r = Math.round((v - 0.5) * 4 * 255); g = 255; b = 0; }
    else { r = 255; g = Math.round((1 - (v - 0.75) * 4) * 255); b = 0; }
    return [r, g, b];
  }

  const imageData = ctx.createImageData(W, H);
  const data = imageData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let heat = 0;
      blobs.forEach(b => {
        const dx = x - b.x; const dy = y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const v = b.intensity * Math.exp(-dist * dist / (2 * b.r * b.r));
        heat = Math.max(heat, v);
      });
      heat = Math.min(heat, 1);
      const idx = (y * W + x) * 4;
      if (heat > 0.05) {
        const [r, g, b] = heatToRGBA(heat);
        data[idx] = r; data[idx+1] = g; data[idx+2] = b;
        data[idx+3] = Math.round(heat * 180);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/* ════════ RELIABILITY BARS ANIMATION ════════ */
function animateMetrics() {
  document.querySelectorAll('.rel-fill').forEach(el => {
    const parent = el.closest('.rel-segment');
    const w = parent?.dataset.w || 0;
    el.style.width = w + '%';
  });
}

const metricsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) animateMetrics(); });
}, { threshold: 0.3 });
const relContainer = document.querySelector('.rel-bar-container');
if (relContainer) metricsObserver.observe(relContainer);

/* ════════ CHARTS ════════ */
const CHART_DEFAULTS = {
  font: { family: "'JetBrains Mono', monospace", size: 10 },
  color: 'rgba(126,184,212,0.6)',
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.font.family = CHART_DEFAULTS.font.family;
Chart.defaults.font.size = CHART_DEFAULTS.font.size;

// ── Accuracy Line Chart ──
const accCtx = document.getElementById('accuracyChart')?.getContext('2d');
if (accCtx) {
  const epochs = Array.from({ length: 20 }, (_, i) => i + 1);
  const trainAcc = epochs.map(e => Math.min(60 + e * 1.8 + Math.random() * 2, 98.5));
  const valAcc   = epochs.map(e => Math.min(58 + e * 1.7 + Math.random() * 2.5, 97.8));

  new Chart(accCtx, {
    type: 'line',
    data: {
      labels: epochs,
      datasets: [
        {
          label: 'Train Accuracy',
          data: trainAcc,
          borderColor: '#00f5ff',
          backgroundColor: 'rgba(0,245,255,0.05)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Val Accuracy',
          data: valAcc,
          borderColor: '#0066ff',
          backgroundColor: 'rgba(0,102,255,0.05)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeInOutQuart' },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
        tooltip: {
          backgroundColor: 'rgba(4,13,30,0.95)',
          borderColor: 'rgba(0,245,255,0.3)',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,245,255,0.05)' },
          ticks: { maxTicksLimit: 10 },
          title: { display: true, text: 'Epoch', color: 'rgba(126,184,212,0.5)' }
        },
        y: {
          grid: { color: 'rgba(0,245,255,0.05)' },
          min: 55, max: 100,
          title: { display: true, text: 'Accuracy (%)', color: 'rgba(126,184,212,0.5)' }
        }
      }
    }
  });
}

// ── Donut Chart ──
const donutCtx = document.getElementById('donutChart')?.getContext('2d');
if (donutCtx) {
  new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Healthy', 'Mild DR', 'Moderate DR', 'Severe DR'],
      datasets: [{
        data: [58, 21, 13, 8],
        backgroundColor: [
          'rgba(0,245,255,0.8)',
          'rgba(0,153,255,0.8)',
          'rgba(255,153,0,0.8)',
          'rgba(255,51,0,0.8)'
        ],
        borderColor: 'rgba(4,13,30,1)',
        borderWidth: 3,
        hoverBorderColor: 'rgba(0,245,255,0.6)',
        hoverBorderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      animation: { animateRotate: true, duration: 1500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(4,13,30,0.95)',
          borderColor: 'rgba(0,245,255,0.3)',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` }
        }
      }
    }
  });
}

// ── Bar Chart ──
const barCtx = document.getElementById('barChart')?.getContext('2d');
if (barCtx) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const vals = [342, 418, 389, 475, 512, 230, 178];

  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Scans Processed',
        data: vals,
        backgroundColor: vals.map((v, i) =>
          i === vals.indexOf(Math.max(...vals))
            ? 'rgba(0,245,255,0.7)'
            : 'rgba(0,102,255,0.4)'
        ),
        borderColor: vals.map((v, i) =>
          i === vals.indexOf(Math.max(...vals))
            ? 'rgba(0,245,255,1)'
            : 'rgba(0,102,255,0.7)'
        ),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(4,13,30,0.95)',
          borderColor: 'rgba(0,245,255,0.3)',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.parsed.y} scans` }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: 'rgba(0,245,255,0.05)' },
          title: { display: true, text: 'Volume', color: 'rgba(126,184,212,0.5)' }
        }
      }
    }
  });
}

/* ════════ INTERSECTION OBSERVER — ENTRY ANIMATIONS ════════ */
const fadeEls = document.querySelectorAll('.glass-card, .future-card, .tech-card, .section-header');
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      e.target.style.animationDelay = `${i * 0.05}s`;
      e.target.classList.add('visible');
      fadeObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

// Add base CSS for fade-in
const style = document.createElement('style');
style.textContent = `
  .glass-card, .future-card, .tech-card, .section-header {
    opacity: 0; transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .glass-card.visible, .future-card.visible, .tech-card.visible, .section-header.visible {
    opacity: 1; transform: translateY(0);
  }
`;
document.head.appendChild(style);
setTimeout(() => {
  fadeEls.forEach(el => fadeObserver.observe(el));
}, 200);

/* ════════ CALIB BARS OBSERVER ════════ */
const calibObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.calib-bar').forEach(bar => {
        const h = bar.style.getPropertyValue('--h');
        bar.style.height = '0%';
        setTimeout(() => { bar.style.height = h; bar.style.transition = 'height 1.5s ease'; }, 100);
      });
      calibObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.calib-grid').forEach(el => calibObserver.observe(el));

/* ════════ RESIZE: HEATMAP REDRAW ════════ */
window.addEventListener('resize', () => {
  if (gradcamSection.style.display !== 'none') drawHeatmap();
});

/* ════════ SMOOTH REVEAL on load ════════ */
window.addEventListener('load', () => {
  document.body.style.opacity = 0;
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => { document.body.style.opacity = 1; });
});
