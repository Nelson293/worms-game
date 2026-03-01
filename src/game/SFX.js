// Procedural sound effects using Web Audio API - no files needed
let audioCtx = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// Unlock audio on first user interaction
document.addEventListener('click', () => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
}, { once: false });

document.addEventListener('keydown', () => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
}, { once: false });

function noise(ctx, duration, volume = 0.3) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * volume;
    }
    return buffer;
}

export const SFX = {
    explosion(size = 1) {
        const ctx = getCtx();
        const now = ctx.currentTime;

        // Low rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80 * size, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
        gain.gain.setValueAtTime(0.4 * size, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // Noise burst
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noise(ctx, 0.3, 0.4);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5 * size, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        noiseSource.connect(filter).connect(noiseGain).connect(ctx.destination);
        noiseSource.start(now);
        noiseSource.stop(now + 0.3);

        // Crack
        const crack = ctx.createOscillator();
        const crackGain = ctx.createGain();
        crack.type = 'square';
        crack.frequency.setValueAtTime(400, now);
        crack.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        crackGain.gain.setValueAtTime(0.3, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        crack.connect(crackGain).connect(ctx.destination);
        crack.start(now);
        crack.stop(now + 0.1);
    },

    shoot() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    },

    shotgunBlast() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noise(ctx, 0.15, 0.6);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 0.5;
        noiseSource.connect(filter).connect(gain).connect(ctx.destination);
        noiseSource.start(now);
        noiseSource.stop(now + 0.15);
    },

    bounce() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    },

    teleport() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    },

    hit() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    },

    death() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        // Descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.6);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
    },

    splash() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noise(ctx, 0.4, 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.4);
        noiseSource.connect(filter).connect(gain).connect(ctx.destination);
        noiseSource.start(now);
        noiseSource.stop(now + 0.4);
    },

    cratePickup() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        // Happy ascending notes
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = [523, 659, 784][i]; // C5, E5, G5
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.15);
        }
    },

    tick() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
    },

    warning() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    },

    earthquake() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(30, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.5);
        osc.frequency.linearRampToValueAtTime(25, now + 1.5);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.setValueAtTime(0.3, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2);
    },

    meteor() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    },

    turnStart() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    },

    victory() {
        const ctx = getCtx();
        const now = ctx.currentTime;

        const notes = [523, 659, 784, 1047]; // C E G C
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, now + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    },
};
