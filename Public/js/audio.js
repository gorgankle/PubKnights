// --- COZY RETRO AUDIO SYNTH MATRIX (REMASTERED) ---
let audioCtx; 
let musicPlaying = false;
let nextNoteTime = 0;
let currentNote = 0;
let tempo = 80; 
let lookahead = 25.0; 
let scheduleAheadTime = 0.1; 
let timerID;

let musicVolume = 1.0;
let sfxVolume = 1.0;
let noiseBuffer = null; 

function updateMusicVolume(val) { musicVolume = parseFloat(val); }
function updateSfxVolume(val) { sfxVolume = parseFloat(val); }

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!noiseBuffer) {
        noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        let output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < audioCtx.sampleRate * 2; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }
}

// === NEW: MULTI-TRACK 32-STEP SEQUENCER PLAYLIST ===
const musicTracks = [
    {
        name: "Tavern Grind", tempo: 80,
        melody: [ 293.66, null, 349.23, null, 392.00, null, 440.00, null, 349.23, null, 293.66, null, 261.63, null, 293.66, null, 440.00, null, 523.25, null, 440.00, null, 392.00, null, 349.23, null, 392.00, null, 293.66, null, null, null ],
        harmony: [ 146.83, 220.00, 293.66, 220.00, 146.83, 220.00, 293.66, 220.00, 174.61, 261.63, 349.23, 261.63, 174.61, 261.63, 349.23, 261.63, 220.00, 261.63, 349.23, 261.63, 220.00, 261.63, 349.23, 261.63, 196.00, 293.66, 392.00, 293.66, 196.00, 293.66, 392.00, 293.66 ],
        bass: [ 73.42, null, null, null, 73.42, null, 65.41, null, 87.31, null, null, null, 87.31, null, 73.42, null, 110.0, null, null, null, 110.0, null, 98.00, null, 87.31, null, null, null, 87.31, null, 73.42, null ],
        drums: [ 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'k', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'k', 'h', 's', 'h', 'h', 'h' ]
    },
    {
        name: "Wilderness March", tempo: 90,
        melody: [ 329.63, null, null, 329.63, 392.00, null, 329.63, null, 293.66, null, null, 293.66, 261.63, null, 293.66, null, 329.63, null, 440.00, null, 392.00, null, 329.63, null, 293.66, null, 261.63, null, 220.00, null, null, null ],
        harmony: [ 164.81, null, 246.94, null, 164.81, null, 246.94, null, 146.83, null, 220.00, null, 146.83, null, 220.00, null, 164.81, null, 246.94, null, 164.81, null, 246.94, null, 146.83, null, 220.00, null, 146.83, null, 220.00, null ],
        bass: [ 82.41, null, null, null, 82.41, null, null, null, 73.42, null, null, null, 73.42, null, null, null, 82.41, null, null, null, 82.41, null, null, null, 73.42, null, null, null, 73.42, null, null, null ],
        drums: [ 'k', 'h', 'k', 'h', 's', 'h', 'k', 'h', 'k', 'h', 'k', 'h', 's', 'h', 'k', 'h', 'k', 'h', 'k', 'h', 's', 'h', 'k', 'h', 'k', 'h', 'k', 'h', 's', 'h', 'k', 'h' ]
    },
    {
        name: "Cellar Dirge", tempo: 60,
        melody: [ 220.00, null, null, null, null, null, 233.08, null, 220.00, null, null, null, null, null, 196.00, null, 220.00, null, null, null, 261.63, null, null, null, 293.66, null, null, null, null, null, null, null ],
        harmony: [ 110.00, null, 146.83, null, 110.00, null, 146.83, null, 110.00, null, 146.83, null, 110.00, null, 146.83, null, 110.00, null, 146.83, null, 110.00, null, 146.83, null, 110.00, null, 146.83, null, 110.00, null, 146.83, null ],
        bass: [ 55.00, null, null, null, null, null, null, null, 55.00, null, null, null, null, null, null, null, 55.00, null, null, null, null, null, null, null, 55.00, null, null, null, null, null, null, null ],
        drums: [ 'k', null, null, null, 's', null, null, null, 'k', null, 'k', null, 's', null, null, null, 'k', null, null, null, 's', null, null, null, 'k', null, 'k', null, 's', null, 'h', 'h' ]
    },
{
        name: "Midnight Grind", tempo: 50, 
        melody: [ 329.63, null, null, 329.63, 293.66, null, null, 293.66, 261.63, null, null, 261.63, 220.00, null, null, null, 392.00, null, null, 392.00, 329.63, null, null, 329.63, 261.63, null, null, 261.63, 220.00, null, null, null ],
        harmony: [ 164.81, 220.00, 164.81, 246.94, 164.81, 220.00, 164.81, 246.94, 130.81, 196.00, 130.81, 220.00, 130.81, 196.00, 130.81, 220.00, 196.00, 261.63, 196.00, 293.66, 196.00, 261.63, 196.00, 293.66, 130.81, 196.00, 130.81, 220.00, 130.81, 196.00, 130.81, 220.00 ],
        bass: [ 82.41, null, null, null, null, null, null, null, 65.41, null, null, null, null, null, null, null, 98.00, null, null, null, null, null, null, null, 65.41, null, null, null, null, null, null, null ],
        drums: [ 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h' ],
        // === NEW: Long, sustained background drone notes ===
        ambience: [ 164.81, null, null, null, null, null, null, null, 130.81, null, null, null, null, null, null, null, 196.00, null, null, null, null, null, null, null, 130.81, null, null, null, null, null, null, null ]
    }
];

let activeTrackIndex = 0;

function cycleMusicTrack() {
    activeTrackIndex++;
    if (activeTrackIndex >= musicTracks.length) activeTrackIndex = 0;
    
    tempo = musicTracks[activeTrackIndex].tempo;
    currentNote = 0; 
    
    let trackNameDisplay = document.getElementById("current-track-name");
    if (trackNameDisplay) {
        trackNameDisplay.innerText = `🎵 Trk ${activeTrackIndex + 1}: ${musicTracks[activeTrackIndex].name}`;
    }
    if (typeof playRetroSound === 'function') playRetroSound('menu');
}

function nextMusicNote() {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTime += 0.25 * secondsPerBeat; 
    currentNote++;
    if (currentNote >= musicTracks[activeTrackIndex].melody.length) currentNote = 0; 
}

function scheduleNote(beatNumber, time) {
    if (musicVolume <= 0) return;
    
    let track = musicTracks[activeTrackIndex];

    // --- MELODY ---
    if (track.melody[beatNumber]) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = track.melody[beatNumber];
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // True 0 start, ramp up, ramp down to 0, delayed stop
        gain.gain.setValueAtTime(0, time); 
        gain.gain.linearRampToValueAtTime(0.015 * musicVolume, time + 0.015); 
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        gain.gain.linearRampToValueAtTime(0, time + 0.17); // Hard zero
        
        osc.start(time);
        osc.stop(time + 0.2); // Destroy node 30ms AFTER absolute zero
    }
    
    // --- HARMONY ---
    if (track.harmony[beatNumber]) {
        const oscH = audioCtx.createOscillator();
        const gainH = audioCtx.createGain();
        oscH.type = 'square';
        oscH.frequency.value = track.harmony[beatNumber];
        oscH.connect(gainH);
        gainH.connect(audioCtx.destination);
        
        gainH.gain.setValueAtTime(0, time); 
        gainH.gain.linearRampToValueAtTime(0.005 * musicVolume, time + 0.01); 
        gainH.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        gainH.gain.linearRampToValueAtTime(0, time + 0.07);
        
        oscH.start(time);
        oscH.stop(time + 0.1);
    }

    // --- BASS ---
    if (track.bass[beatNumber]) {
        const oscB = audioCtx.createOscillator();
        const gainB = audioCtx.createGain();
        oscB.type = 'triangle';
        oscB.frequency.value = track.bass[beatNumber];
        oscB.connect(gainB);
        gainB.connect(audioCtx.destination);
        
        gainB.gain.setValueAtTime(0, time);
        gainB.gain.linearRampToValueAtTime(0.03 * musicVolume, time + 0.02);
        gainB.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        gainB.gain.linearRampToValueAtTime(0, time + 0.27);
        
        oscB.start(time);
        oscB.stop(time + 0.3);
    }

    // --- AMBIENCE PAD ---
    if (track.ambience && track.ambience[beatNumber]) {
        const oscA = audioCtx.createOscillator();
        const gainA = audioCtx.createGain();
        oscA.type = 'sine'; 
        oscA.frequency.value = track.ambience[beatNumber];
        oscA.connect(gainA);
        gainA.connect(audioCtx.destination);
        
        gainA.gain.setValueAtTime(0, time);
        gainA.gain.linearRampToValueAtTime(0.03 * musicVolume, time + 0.5); 
        gainA.gain.exponentialRampToValueAtTime(0.001, time + 2.5);
        gainA.gain.linearRampToValueAtTime(0, time + 2.6);
        
        oscA.start(time);
        oscA.stop(time + 2.7);
    }

    // --- DRUMS ---
    if (track.drums[beatNumber]) {
        const dType = track.drums[beatNumber];
        const gainD = audioCtx.createGain();
        gainD.connect(audioCtx.destination);

        if (dType === 'k') { // KICK
            const oscK = audioCtx.createOscillator();
            oscK.type = 'sine';
            oscK.connect(gainD);
            oscK.frequency.setValueAtTime(150, time);
            oscK.frequency.exponentialRampToValueAtTime(10, time + 0.1);
            
            gainD.gain.setValueAtTime(0, time);
            gainD.gain.linearRampToValueAtTime(0.06 * musicVolume, time + 0.01);
            gainD.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            gainD.gain.linearRampToValueAtTime(0, time + 0.12);
            
            oscK.start(time);
            oscK.stop(time + 0.15);
        } 
        else if ((dType === 's' || dType === 'h') && noiseBuffer) {
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = audioCtx.createBiquadFilter();
            
            if (dType === 's') { // SNARE
                filter.type = 'bandpass';
                filter.frequency.value = 1500;
                
                gainD.gain.setValueAtTime(0, time); 
                gainD.gain.linearRampToValueAtTime(0.008 * musicVolume, time + 0.01); 
                gainD.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                gainD.gain.linearRampToValueAtTime(0, time + 0.12);
                
                noise.start(time);
                noise.stop(time + 0.15);
            } else { // HI-HAT
                filter.type = 'highpass';
                filter.frequency.value = 5000;
                
                gainD.gain.setValueAtTime(0, time);
                gainD.gain.linearRampToValueAtTime(0.01 * musicVolume, time + 0.01);
                gainD.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
                gainD.gain.linearRampToValueAtTime(0, time + 0.07);
                
                noise.start(time);
                noise.stop(time + 0.1);
            }
            noise.connect(filter);
            filter.connect(gainD);
        }
    }
}

function musicScheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentNote, nextNoteTime);
        nextMusicNote();
    }
    timerID = setTimeout(musicScheduler, lookahead);
}

// Add a master gain node at the top of audio.js with your other globals
let masterGain; 

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a master gain that stays silent initially
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    // ... rest of your existing initAudio code ...
}

// Update your playRetroSound and scheduleNote to connect to masterGain instead of audioCtx.destination
// Example for playRetroSound:
// gainNode.connect(masterGain); 

function startBackgroundMusic() {
    initAudio();
    if (!musicPlaying) {
        musicPlaying = true;
        
        // Master Fade-In: Ramp the entire game's master volume from 0 to 1 over 1 full second
        masterGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 1.0);
        
        nextNoteTime = audioCtx.currentTime + 0.05;
        musicScheduler();
    }
}

// --- STANDARD & ENVIRONMENTAL SFX ---
function playRetroSound(type) {
    if (sfxVolume <= 0) return; 

    initAudio(); 
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    // DYNAMIC NOISE GENERATORS
    if (type === 'explosion' || type === 'splat') {
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer; 
        const filter = audioCtx.createBiquadFilter();
        
        if (type === 'explosion') {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.52);
            
            noise.connect(filter); filter.connect(gainNode);
            noise.start(now); noise.stop(now + 0.55);
        } else if (type === 'splat') {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.22);
            
            noise.connect(filter); filter.connect(gainNode);
            noise.start(now); noise.stop(now + 0.25);
        }
        return; 
    }

    const osc = audioCtx.createOscillator();
    osc.connect(gainNode);

    // SYNTHESIZED SOUNDS
    switch (type) {
        case 'xpTick':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800 + (Math.random() * 200), now); 
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.04 * sfxVolume, now + 0.005); // Faster attack for rapid sounds
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.06);
            osc.start(now); osc.stop(now + 0.08);
            return;
        case 'coin': 
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(987.77, now); 
            osc.frequency.setValueAtTime(1318.51, now + 0.08); 
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.08 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.32);
            osc.start(now); osc.stop(now + 0.35);
            return;
        case 'attack': 
            osc.type = 'sawtooth'; 
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.12);
            osc.start(now); osc.stop(now + 0.15);
            return;
        case 'heavyAttack': 
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.2);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.12 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.24);
            osc.start(now); osc.stop(now + 0.27);
            return;
        case 'chug': 
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
            osc.frequency.setValueAtTime(300, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.27);
            osc.start(now); osc.stop(now + 0.3);
            return;
        case 'error': 
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.17);
            osc.start(now); osc.stop(now + 0.2);
            return;
        case 'menu':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.03 * sfxVolume, now + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.06);
            osc.start(now); osc.stop(now + 0.08);
            return;
        case 'equip':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(450, now + 0.05);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.12);
            osc.start(now); osc.stop(now + 0.15);
            return;
        case 'statUp':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.08 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.22);
            osc.start(now); osc.stop(now + 0.25);
            return;
        case 'deflect':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.17);
            osc.start(now); osc.stop(now + 0.2);
            return;
        case 'combatStart':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.1); 
            osc.frequency.setValueAtTime(659.25, now + 0.2); 
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.42);
            osc.start(now); osc.stop(now + 0.45);
            return;
        case 'claim':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); 
            osc.frequency.setValueAtTime(659.25, now + 0.05); 
            osc.frequency.setValueAtTime(783.99, now + 0.1); 
            osc.frequency.setValueAtTime(1046.50, now + 0.15); 
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.32);
            osc.start(now); osc.stop(now + 0.35);
            return;
        case 'door':
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.17);
            osc.start(now); osc.stop(now + 0.2);
            return;
        case 'playerHit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.25 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.27);
            osc.start(now); osc.stop(now + 0.3);
            return;
        case 'step':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15 * sfxVolume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.12);
            osc.start(now); osc.stop(now + 0.15);
            return;
        case 'playerCrit':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.22);
            osc.start(now); osc.stop(now + 0.25);
            return;
        case 'enemyCrit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.42);
            osc.start(now); osc.stop(now + 0.45);
            return;
        case 'victory':
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, now); 
            osc.frequency.setValueAtTime(659.25, now + 0.15); 
            osc.frequency.setValueAtTime(783.99, now + 0.3); 
            osc.frequency.setValueAtTime(1046.50, now + 0.45); 
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1 * sfxVolume, now + 0.015);
            gainNode.gain.setValueAtTime(0.1 * sfxVolume, now + 0.45); 
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.82);
            osc.start(now); osc.stop(now + 0.85);
            return; 
        case 'death':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(349.23, now); 
            osc.frequency.setValueAtTime(311.13, now + 0.2); 
            osc.frequency.setValueAtTime(277.18, now + 0.4); 
            osc.frequency.setValueAtTime(233.08, now + 0.6); 
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15 * sfxVolume, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            gainNode.gain.linearRampToValueAtTime(0, now + 1.22);
            osc.start(now); osc.stop(now + 1.25);
            return; 
    }
}
    