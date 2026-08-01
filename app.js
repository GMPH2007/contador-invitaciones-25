// Polyfill for roundRect to avoid older mobile browser crashes
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        let r = 0;
        if (Array.isArray(radii)) {
            r = radii[0] || 0;
        } else if (typeof radii === 'number') {
            r = radii;
        }
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
        return this;
    };
}

// Application state variables
let state = {
    mode: 'edge', // 'edge', 'slide', or 'detect'
    count: 0,
    targetCount: 25, // Default target
    sensitivity: 15,
    smoothing: 5,
    currentFacingMode: 'environment', // Start with back camera
    videoStream: null,
    calibratedBaseline: null, // Baseline for slide mode
    gridBaseline: null, // Baseline grid for table detection mode
    slideActive: false,
    lastSlideTime: 0,
    voiceEnabled: true, // TTS active
    torchActive: false, // Flash/Torch state
    successChimeTriggered: false
};

// Cached profile for auto-calibration
let cachedLuminanceProfile = null;

// Grid configurations for Full Table Detection (Mode C)
const GRID_COLS = 28;
const GRID_ROWS = 21;

// UI Elements
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
const chartCanvasEl = document.getElementById('chart-canvas');
const chartCtx = chartCanvasEl.getContext('2d');

const currentCountEl = document.getElementById('current-count');
const countStatusTextEl = document.getElementById('count-status-text');
const glowRingEl = document.getElementById('glow-ring');
const statusAlertEl = document.getElementById('status-alert');
const targetDisplayEl = document.getElementById('target-display');
const targetDenominatorEl = document.getElementById('target-denominator');
const autocalibrateTargetNumEl = document.getElementById('autocalibrate-target-num');

const btnModeEdge = document.getElementById('btn-mode-edge');
const btnModeSlide = document.getElementById('btn-mode-slide');
const btnModeDetect = document.getElementById('btn-mode-detect');
const btnReset = document.getElementById('btn-reset');
const btnCameraToggle = document.getElementById('btn-camera-toggle');
const btnToggleVoice = document.getElementById('btn-toggle-voice');
const btnToggleTorch = document.getElementById('btn-toggle-torch');
const btnAutocalibrate = document.getElementById('btn-autocalibrate');

const sliderSens = document.getElementById('slider-sens');
const sliderSmooth = document.getElementById('slider-smooth');
const valSens = document.getElementById('val-sens');
const valSmooth = document.getElementById('val-smooth');

const edgeControls = document.getElementById('edge-controls');
const edgeGuide = document.getElementById('edge-guide');
const slideRoi = document.getElementById('slide-roi');
const instructionEdge = document.getElementById('instruction-edge');
const instructionSlide = document.getElementById('instruction-slide');
const instructionDetect = document.getElementById('instruction-detect');

// Speech & Audio Synthesis
let audioCtx = null;
let lastSpeechTime = 0;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Speak text using Web Speech API in Spanish
function speakText(text) {
    if (!state.voiceEnabled) return;
    try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1; 
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn("TTS error: ", e);
    }
}

// Play feedback sounds
function playSound(type) {
    try {
        initAudio();
        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        if (type === 'click') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.frequency.setValueAtTime(900, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'success') {
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            freqs.forEach((freq, index) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                const time = now + index * 0.08;
                osc.frequency.setValueAtTime(freq, time);
                gain.gain.setValueAtTime(0.06, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
                
                osc.start(time);
                osc.stop(time + 0.45);
            });
        } else if (type === 'warning') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.frequency.setValueAtTime(140, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.warn("Audio error: ", e);
    }
}

// Confetti Particle System
let confettiParticles = [];
let confettiActive = false;

function startConfetti() {
    confettiActive = true;
    confettiParticles = [];
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00e5ff', '#00e676', '#ffeb3b', '#ff9100', '#ff3d00'];
    
    for (let i = 0; i < 90; i++) {
        confettiParticles.push({
            x: Math.random() * canvasEl.width,
            y: Math.random() * -150 - 10,
            r: Math.random() * 6 + 4,
            d: Math.random() * canvasEl.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.08 + 0.03,
            tiltAngle: 0
        });
    }
}

function updateAndDrawConfetti(ctx, width, height) {
    if (!confettiActive) return;
    
    let activeParticlesCount = 0;
    
    for (let i = 0; i < confettiParticles.length; i++) {
        const p = confettiParticles[i];
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.tiltAngle) + 3.5 + p.r / 2) / 2.2;
        p.x += Math.sin(p.tiltAngle) * 0.8;
        p.tilt = Math.sin(p.tiltAngle - i / 3) * 12;
        
        if (p.y <= height) {
            activeParticlesCount++;
        }
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
    }
    
    if (activeParticlesCount === 0) {
        confettiActive = false;
    }
}

// Camera control
let videoTrack = null;

async function startCamera() {
    if (state.videoStream) {
        state.videoStream.getTracks().forEach(track => track.stop());
    }

    statusAlertEl.textContent = "Accediendo a la cámara...";
    statusAlertEl.style.borderColor = "var(--accent)";

    const constraints = {
        video: {
            facingMode: state.currentFacingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
        audio: false
    };

    try {
        state.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = state.videoStream;
        
        videoTrack = state.videoStream.getVideoTracks()[0];
        
        videoEl.onloadedmetadata = () => {
            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
            statusAlertEl.textContent = "Cámara activa";
            statusAlertEl.style.borderColor = "var(--success)";
            
            applyTorchState();
            
            requestAnimationFrame(processFrame);
        };
    } catch (err) {
        console.error("Error accessing camera: ", err);
        statusAlertEl.textContent = "Error: No se pudo acceder a la cámara";
        statusAlertEl.style.borderColor = "var(--danger)";
    }
}

async function applyTorchState() {
    if (!videoTrack) return;
    try {
        if (typeof videoTrack.getCapabilities === 'function') {
            const capabilities = videoTrack.getCapabilities();
            if (capabilities.torch) {
                btnToggleTorch.disabled = false;
                await videoTrack.applyConstraints({
                    advanced: [{ torch: state.torchActive }]
                });
                
                if (state.torchActive) {
                    btnToggleTorch.classList.add('active');
                    btnToggleTorch.textContent = "Linterna: SI";
                } else {
                    btnToggleTorch.classList.remove('active');
                    btnToggleTorch.textContent = "Linterna: NO";
                }
                return;
            }
        }
        btnToggleTorch.textContent = "Linterna: N/A";
        btnToggleTorch.disabled = true;
        state.torchActive = false;
    } catch (e) {
        console.warn("Linterna no soportada o bloqueada en este dispositivo: ", e);
        btnToggleTorch.textContent = "Linterna: N/A";
        btnToggleTorch.disabled = true;
        state.torchActive = false;
    }
}

function toggleTorch() {
    state.torchActive = !state.torchActive;
    applyTorchState();
}

function toggleCamera() {
    state.currentFacingMode = state.currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera();
}

// Processing frames at full 60fps
function processFrame() {
    if (!state.videoStream || videoEl.paused || videoEl.ended) return;

    const width = canvasEl.width;
    const height = canvasEl.height;

    // Draw video feed on canvas
    ctx.drawImage(videoEl, 0, 0, width, height);

    // Capture screen pixel data ONCE per frame (crucial optimization for mobile)
    const frameData = ctx.getImageData(0, 0, width, height);

    if (state.mode === 'edge') {
        runEdgeDetection(frameData, width, height);
    } else if (state.mode === 'slide') {
        runSlideDetection(frameData, width, height);
    } else if (state.mode === 'detect') {
        runTableDetection(frameData, width, height);
    }

    if (confettiActive) {
        updateAndDrawConfetti(ctx, width, height);
    }

    requestAnimationFrame(processFrame);
}

// Signal Processing utility functions
function smoothSignal(profile, windowSize) {
    const len = profile.length;
    let smoothed = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        let sum = 0;
        let count = 0;
        for (let w = -Math.floor(windowSize / 2); w <= Math.floor(windowSize / 2); w++) {
            const idx = i + w;
            if (idx >= 0 && idx < len) {
                sum += profile[idx];
                count++;
            }
        }
        smoothed[i] = sum / count;
    }
    return smoothed;
}

function findPeaks(smoothed, sensThreshold, smoothingVal) {
    let peaks = [];
    const localRadius = Math.max(3, Math.floor(smoothingVal * 1.5));
    const scanHeight = smoothed.length;

    for (let i = localRadius; i < scanHeight - localRadius; i++) {
        const val = smoothed[i];
        
        let isLocalMax = true;
        for (let r = -localRadius; r <= localRadius; r++) {
            if (r !== 0 && smoothed[i + r] > val) {
                isLocalMax = false;
                break;
            }
        }

        if (isLocalMax) {
            let leftMin = Infinity;
            let rightMin = Infinity;
            for (let r = 1; r <= localRadius * 2; r++) {
                if (i - r >= 0) leftMin = Math.min(leftMin, smoothed[i - r]);
                if (i + r < scanHeight) rightMin = Math.min(rightMin, smoothed[i + r]);
            }
            
            const peakHeight = val - Math.min(leftMin, rightMin);
            
            if (peakHeight > sensThreshold) {
                peaks.push(i);
            }
        }
    }
    return peaks;
}

// Edge scanner mode implementation
function runEdgeDetection(frameData, width, height) {
    const scanX = Math.floor(width / 2);
    const scanWidth = 12;
    const startY = Math.floor(height * 0.1);
    const endY = Math.floor(height * 0.9);
    const scanHeight = endY - startY;

    // Draw guide box
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(scanX - scanWidth / 2, startY, scanWidth, scanHeight);

    const data = frameData.data;

    let luminanceProfile = new Float32Array(scanHeight);
    for (let y = 0; y < scanHeight; y++) {
        let rowSum = 0;
        const realY = y + startY;
        for (let x = 0; x < scanWidth; x++) {
            const realX = scanX - Math.floor(scanWidth / 2) + x;
            const idx = (realY * width + realX) * 4;
            rowSum += 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
        }
        luminanceProfile[y] = rowSum / scanWidth;
    }

    cachedLuminanceProfile = luminanceProfile;

    const smoothed = smoothSignal(luminanceProfile, state.smoothing);
    const peakIndices = findPeaks(smoothed, state.sensitivity, state.smoothing);

    updateCounterDisplay(peakIndices.length);

    peakIndices.forEach(idx => {
        const screenY = idx + startY;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scanX - 35, screenY);
        ctx.lineTo(scanX + 35, screenY);
        ctx.stroke();

        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(scanX, screenY, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    const peaksArray = peakIndices.map(idx => ({ y: idx + startY }));
    drawChart(smoothed, peaksArray, startY, scanHeight, state.sensitivity);
}

// Auto-Calibration logic (Grid Search)
function autoCalibrate() {
    if (state.mode !== 'edge' || !cachedLuminanceProfile) {
        speakText("Apunta con la cámara al canto de la pila primero");
        return;
    }

    statusAlertEl.textContent = "Analizando pila...";
    statusAlertEl.style.borderColor = "var(--warning)";

    let found = false;
    let candidates = [];

    for (let smooth = 2; smooth <= 12; smooth++) {
        const smoothed = smoothSignal(cachedLuminanceProfile, smooth);
        for (let sens = 4; sens <= 40; sens++) {
            const peaks = findPeaks(smoothed, sens, smooth);
            if (peaks.length === state.targetCount) {
                candidates.push({ sens, smooth });
                found = true;
            }
        }
    }

    if (found) {
        candidates.sort((a, b) => a.sens - b.sens);
        const bestCombo = candidates[Math.floor(candidates.length / 2)];

        state.sensitivity = bestCombo.sens;
        state.smoothing = bestCombo.smooth;

        sliderSens.value = state.sensitivity;
        sliderSmooth.value = state.smoothing;
        valSens.textContent = state.sensitivity;
        valSmooth.textContent = state.smoothing;

        statusAlertEl.textContent = "¡Calibrado a 25!";
        statusAlertEl.style.borderColor = "var(--success)";

        speakText(`¡Calibración exitosa! Encontré exactamente ${state.targetCount} invitaciones.`);
        playSound('success');
        startConfetti();
    } else {
        statusAlertEl.textContent = "Fallo de calibración";
        statusAlertEl.style.borderColor = "var(--danger)";
        speakText(`No pude encontrar exactamente ${state.targetCount} invitaciones. Asegúrate de doblar un poco más la pila o encender la linterna.`);
        playSound('warning');
    }
}

// Slide count mode implementation (one-by-one dealing) using optimized single-buffer reads
function runSlideDetection(frameData, width, height) {
    const rx = Math.floor(width * 0.15);
    const ry = Math.floor(height * 0.15);
    const rw = Math.floor(width * 0.7);
    const rh = Math.floor(height * 0.7);

    const data = frameData.data;

    // Sub-sample pixels inside the ROI (every 4th pixel is 16x faster and completely accurate)
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let y = ry; y < ry + rh; y += 4) {
        for (let x = rx; x < rx + rw; x += 4) {
            const idx = (y * width + x) * 4;
            sumR += data[idx];
            sumG += data[idx+1];
            sumB += data[idx+2];
            count++;
        }
    }
    
    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;
    const currentBrightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

    // Safety guard to avoid calibrating on black frames at camera startup
    if (currentBrightness < 18) {
        statusAlertEl.textContent = "Iniciando sensor...";
        return;
    }

    if (state.calibratedBaseline === null) {
        state.calibratedBaseline = {
            r: avgR,
            g: avgG,
            b: avgB,
            brightness: currentBrightness
        };
        statusAlertEl.textContent = "Listo. Pasa las tarjetas.";
        statusAlertEl.style.borderColor = "var(--success)";
        speakText("Listo para contar. Pasa las tarjetas.");
        return;
    }

    const diffR = avgR - state.calibratedBaseline.r;
    const diffG = avgG - state.calibratedBaseline.g;
    const diffB = avgB - state.calibratedBaseline.b;
    const colorDist = Math.sqrt(diffR*diffR + diffG*diffG + diffB*diffB);

    // Adaptive threshold based on manual sensitivity slider
    const presenceThreshold = Math.max(12, state.sensitivity + 10);
    const now = Date.now();
    const cooldown = 650;

    if (colorDist > presenceThreshold) {
        ctx.strokeStyle = 'var(--danger)';
        ctx.lineWidth = 4;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.fillStyle = 'rgba(255, 59, 48, 0.12)';
        ctx.fillRect(rx, ry, rw, rh);

        if (!state.slideActive && (now - state.lastSlideTime > cooldown)) {
            state.slideActive = true;
            state.lastSlideTime = now;
            updateCounterDisplay(state.count + 1);
        }
    } else {
        ctx.strokeStyle = 'var(--success)';
        ctx.lineWidth = 3;
        ctx.strokeRect(rx, ry, rw, rh);

        if (state.slideActive && (now - state.lastSlideTime > 250)) {
            state.slideActive = false;
        }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(rx + 6, ry + 6, 125, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Inter';
    ctx.fillText(`Desv: ${Math.round(colorDist)} | Umbral: ${Math.round(presenceThreshold)}`, rx + 12, ry + 22);
}

// Mode C: Meticulous Full Table grid object detection using highly optimized single-buffer array reads (0 ms blocking lag!)
function runTableDetection(frameData, width, height) {
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;
    
    // Sliders adaptively control parameters:
    const colorDistThreshold = state.sensitivity + 10;
    const minBlobCells = state.smoothing + 1;

    const data = frameData.data;

    // Grid baseline calibration check with black frame prevention
    if (state.gridBaseline === null) {
        // First verify average screen brightness is not pitch black
        let sampleSum = 0;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const sampleX = Math.floor((c + 0.5) * cellW);
                const sampleY = Math.floor((r + 0.5) * cellH);
                const idx = (sampleY * width + sampleX) * 4;
                sampleSum += 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
            }
        }
        const avgBrightness = sampleSum / (GRID_COLS * GRID_ROWS);
        
        if (avgBrightness < 18) {
            statusAlertEl.textContent = "Iniciando sensor...";
            return;
        }

        state.gridBaseline = new Array(GRID_COLS * GRID_ROWS);
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const sampleX = Math.floor((c + 0.5) * cellW);
                const sampleY = Math.floor((r + 0.5) * cellH);
                const idx = (sampleY * width + sampleX) * 4;
                state.gridBaseline[r * GRID_COLS + c] = {
                    r: data[idx],
                    g: data[idx+1],
                    b: data[idx+2]
                };
            }
        }
        
        statusAlertEl.textContent = "Mesa calibrada. Pon tarjetas.";
        statusAlertEl.style.borderColor = "var(--success)";
        speakText("Mesa calibrada. Coloca las invitaciones.");
        return;
    }

    // Binary grid representing presence of paper vs baseline
    let activeGrid = new Uint8Array(GRID_COLS * GRID_ROWS);

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const sampleX = Math.floor((c + 0.5) * cellW);
            const sampleY = Math.floor((r + 0.5) * cellH);
            const idx = (sampleY * width + sampleX) * 4;
            
            const base = state.gridBaseline[r * GRID_COLS + c];
            const dR = data[idx] - base.r;
            const dG = data[idx+1] - base.g;
            const dB = data[idx+2] - base.b;
            const dist = Math.sqrt(dR*dR + dG*dG + dB*dB);
            
            if (dist > colorDistThreshold) {
                activeGrid[r * GRID_COLS + c] = 1;
                
                // Draw faint indicator on canvas
                ctx.fillStyle = 'rgba(52, 199, 89, 0.4)';
                ctx.beginPath();
                ctx.arc(sampleX, sampleY, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    // Connected Component Labeling using BFS
    let visited = new Uint8Array(GRID_COLS * GRID_ROWS);
    let blobs = [];

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const idx = r * GRID_COLS + c;
            if (activeGrid[idx] && !visited[idx]) {
                let queue = [{ c, r }];
                visited[idx] = 1;
                
                let minC = c, maxC = c;
                let minR = r, maxR = r;
                let size = 0;

                while (queue.length > 0) {
                    const curr = queue.shift();
                    size++;
                    
                    minC = Math.min(minC, curr.c);
                    maxC = Math.max(maxC, curr.c);
                    minR = Math.min(minR, curr.r);
                    maxR = Math.max(maxR, curr.r);

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nc = curr.c + dc;
                            const nr = curr.r + dr;
                            if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
                                const nidx = nr * GRID_COLS + nc;
                                if (activeGrid[nidx] && !visited[nidx]) {
                                    visited[nidx] = 1;
                                    queue.push({ c: nc, r: nr });
                                }
                            }
                        }
                    }
                }
                
                if (size >= minBlobCells && size <= 150) {
                    blobs.push({ minC, maxC, minR, maxR, size });
                }
            }
        }
    }

    // Draw Bounding Boxes and labels on screen
    blobs.forEach((blob, i) => {
        const x = blob.minC * cellW;
        const y = blob.minR * cellH;
        const w = (blob.maxC - blob.minC + 1) * cellW;
        const h = (blob.maxR - blob.minR + 1) * cellH;

        ctx.strokeStyle = 'rgba(52, 199, 89, 0.85)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = 'rgba(52, 199, 89, 0.08)';
        ctx.fillRect(x, y, w, h);

        // Label box
        ctx.fillStyle = 'var(--success)';
        const textLabel = `INV #${i+1}`;
        ctx.font = 'bold 11px Inter, sans-serif';
        const textWidth = ctx.measureText(textLabel).width;
        
        ctx.beginPath();
        ctx.roundRect(x - 1, y - 18, textWidth + 12, 18, [4, 4, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#0f1016';
        ctx.fillText(textLabel, x + 6, y - 5);
    });

    updateCounterDisplay(blobs.length);
}

// Chart visual rendering
function drawChart(profile, peaks, startY, scanHeight, threshold) {
    const w = chartCanvasEl.width;
    const h = chartCanvasEl.height;
    
    chartCtx.clearRect(0, 0, w, h);
    chartCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    chartCtx.fillRect(0, 0, w, h);

    if (profile.length === 0) return;

    chartCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    chartCtx.lineWidth = 1;
    chartCtx.beginPath();
    chartCtx.moveTo(0, h / 2);
    chartCtx.lineTo(w, h / 2);
    chartCtx.stroke();

    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = 0; i < profile.length; i++) {
        if (profile[i] > maxVal) maxVal = profile[i];
        if (profile[i] < minVal) minVal = profile[i];
    }
    const range = Math.max(1, maxVal - minVal);

    chartCtx.strokeStyle = '#5856d6';
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();

    for (let i = 0; i < profile.length; i++) {
        const cx = (i / profile.length) * w;
        const cy = h - 6 - ((profile[i] - minVal) / range) * (h - 12);
        if (i === 0) chartCtx.moveTo(cx, cy);
        else chartCtx.lineTo(cx, cy);
    }
    chartCtx.stroke();

    peaks.forEach(peak => {
        const peakIdx = peak.y - startY;
        const cx = (peakIdx / profile.length) * w;
        const cy = h - 6 - ((profile[peakIdx] - minVal) / range) * (h - 12);

        chartCtx.fillStyle = '#ff00ff';
        chartCtx.beginPath();
        chartCtx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
        chartCtx.fill();
    });
}

// Update Visual UI and Audio Announcements
let lastAnnouncedCount = -1;

function updateCounterDisplay(newCount) {
    if (newCount === state.count && lastAnnouncedCount === newCount) return;

    const panel = document.querySelector('.count-circle-container').parentNode;
    panel.className = 'counter-display-panel';

    const now = Date.now();

    if (newCount !== state.count) {
        if (newCount > 0) {
            if (newCount === state.targetCount) {
                playSound('success');
                speakText(`¡Ya llegaste a ${state.targetCount}! Pila lista.`);
                startConfetti();
            } else if (newCount > state.targetCount) {
                playSound('warning');
                speakText(`Te pasaste. Hay ${newCount}.`);
            } else {
                playSound('click');
                triggerCountPopEffect();
                
                if (state.mode === 'slide' || state.mode === 'detect' || (now - lastSpeechTime > 900)) {
                    speakText(newCount.toString());
                    lastSpeechTime = now;
                }
            }
        }
    }

    state.count = newCount;
    lastAnnouncedCount = newCount;
    currentCountEl.textContent = newCount;

    if (newCount === 0) {
        if (state.mode === 'edge') countStatusTextEl.textContent = "Coloca la pila frente a la línea";
        else if (state.mode === 'slide') countStatusTextEl.textContent = "Desliza la primera tarjeta";
        else countStatusTextEl.textContent = "Coloca tarjetas sobre la mesa";
        panel.classList.add('state-counting');
    } else if (newCount < state.targetCount) {
        countStatusTextEl.textContent = `Faltan ${state.targetCount - newCount} para llegar a ${state.targetCount}`;
        panel.classList.add('state-counting');
    } else if (newCount === state.targetCount) {
        countStatusTextEl.textContent = `¡EXACTO! ${state.targetCount} invitaciones contadas 🎉`;
        panel.classList.add('state-success');
    } else {
        countStatusTextEl.textContent = `¡Exceso! Hay ${newCount - state.targetCount} invitaciones de más`;
        panel.classList.add('state-warning');
    }
}

function triggerCountPopEffect() {
    currentCountEl.style.transform = 'scale(1.22)';
    setTimeout(() => {
        currentCountEl.style.transform = 'scale(1)';
    }, 110);
}

// Reset functions
function resetCount() {
    state.count = 0;
    state.calibratedBaseline = null;
    state.gridBaseline = null; // Forces recalculation in detection mode
    state.slideActive = false;
    confettiActive = false;
    lastAnnouncedCount = -1;

    updateCounterDisplay(0);

    if (state.mode === 'slide') {
        statusAlertEl.textContent = "Calibrando fondo... No muevas el teléfono.";
        statusAlertEl.style.borderColor = "var(--warning)";
    } else if (state.mode === 'detect') {
        statusAlertEl.textContent = "Calibrando mesa vacía... Despeja la mesa.";
        statusAlertEl.style.borderColor = "var(--warning)";
    } else {
        statusAlertEl.textContent = "Contador reiniciado";
        statusAlertEl.style.borderColor = "var(--success)";
    }
}

// Change target dynamically
function setTargetCount(newTarget) {
    if (newTarget < 1 || newTarget > 500) return;
    state.targetCount = newTarget;

    targetDisplayEl.textContent = `META: ${newTarget}`;
    targetDenominatorEl.textContent = `/ ${newTarget}`;
    autocalibrateTargetNumEl.textContent = newTarget;

    speakText(`Meta cambiada a ${newTarget}`);
    
    resetCount();
}

// Events
btnModeEdge.addEventListener('click', () => {
    state.mode = 'edge';
    btnModeEdge.classList.add('active');
    btnModeSlide.classList.remove('active');
    btnModeDetect.classList.remove('active');

    edgeControls.classList.remove('hidden');
    edgeGuide.classList.remove('hidden');
    slideRoi.classList.add('hidden');

    instructionEdge.classList.remove('hidden');
    instructionSlide.classList.add('hidden');
    instructionDetect.classList.add('hidden');

    speakText("Modo pila. Alinea los bordes con la línea roja.");
    resetCount();
});

btnModeSlide.addEventListener('click', () => {
    state.mode = 'slide';
    btnModeSlide.classList.add('active');
    btnModeEdge.classList.remove('active');
    btnModeDetect.classList.remove('active');

    edgeControls.classList.add('hidden');
    edgeGuide.classList.add('hidden');
    slideRoi.classList.remove('hidden');

    instructionEdge.classList.add('hidden');
    instructionSlide.classList.remove('hidden');
    instructionDetect.classList.add('hidden');

    speakText("Modo deslizar. Coloca el celular fijo en un soporte, despeja la mesa y pulsa reiniciar.");
    resetCount();
});

btnModeDetect.addEventListener('click', () => {
    state.mode = 'detect';
    btnModeDetect.classList.add('active');
    btnModeEdge.classList.remove('active');
    btnModeSlide.classList.remove('active');

    edgeControls.classList.remove('hidden');
    edgeGuide.classList.add('hidden');
    slideRoi.classList.add('hidden');

    instructionEdge.classList.add('hidden');
    instructionSlide.classList.add('hidden');
    instructionDetect.classList.remove('hidden');

    speakText("Modo mesa. Coloca el celular fijo apuntando a la mesa, retira las tarjetas y pulsa reiniciar.");
    resetCount();
});

btnReset.addEventListener('click', resetCount);
btnCameraToggle.addEventListener('click', toggleCamera);
btnToggleTorch.addEventListener('click', toggleTorch);
btnAutocalibrate.addEventListener('click', autoCalibrate);

// Voice toggle
btnToggleVoice.addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    if (state.voiceEnabled) {
        btnToggleVoice.classList.add('active');
        btnToggleVoice.textContent = "Voz: SI";
        speakText("Voz activada");
    } else {
        btnToggleVoice.classList.remove('active');
        btnToggleVoice.textContent = "Voz: NO";
    }
});

// Target Presets selection
document.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('custom-target').value = '';
        
        btn.classList.add('active');
        const targetVal = parseInt(btn.dataset.target);
        setTargetCount(targetVal);
    });
});

document.getElementById('custom-target').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
        document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
        setTargetCount(val);
    }
});

// Manual sliders
sliderSens.addEventListener('input', (e) => {
    state.sensitivity = parseInt(e.target.value);
    valSens.textContent = state.sensitivity;
});

sliderSmooth.addEventListener('input', (e) => {
    state.smoothing = parseInt(e.target.value);
    valSmooth.textContent = state.smoothing;
});

// DOM Load
window.addEventListener('DOMContentLoaded', () => {
    edgeGuide.classList.remove('hidden');
    chartCanvasEl.width = chartCanvasEl.parentElement.clientWidth - 16;

    document.body.addEventListener('click', () => {
        initAudio();
        speakText(""); 
    }, { once: true });

    startCamera();
});
