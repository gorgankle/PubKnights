// === REPLACED ===
// --- COZY RETRO AUDIO SYNTH MATRIX (REMASTERED) ---
let audioCtx; 
let musicPlaying = false;
let nextNoteTime = 0;
let currentNote = 0;
let tempo = 80; 
let lookahead = 25.0; 
let scheduleAheadTime = 0.1; 
let timerID;

// === THE FIX: ARRANGEMENT STATE POINTERS ===
let currentPhraseIndex = 0; 
let currentLoopCount = 0;   

let musicVolume = 1.0;
let sfxVolume = 1.0;
let noiseBuffer = null; 

const NOTES = {
    "C5": 523.25, "B4": 493.88, "A4": 440.00, "G4": 392.00, "F4": 349.23, "E4": 329.63, "D4": 293.66, "C4": 261.63,
    "B3": 246.94, "A3": 220.00, "G3": 196.00, "F3": 174.61, "E3": 164.81, "D3": 146.83, "C3": 130.81, 
    "B2": 123.47, "A2": 110.00, "G2": 98.00, "F2": 87.31, "E2": 82.41, "D2": 73.42, "C2": 65.41
};

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
        ambience: [ 164.81, null, null, null, null, null, null, null, 130.81, null, null, null, null, null, null, null, 196.00, null, null, null, null, null, null, null, 130.81, null, null, null, null, null, null, null ]
    },
	{
        name: "DOOM OF THE OVERLORD",
        tempo: 140,
        arrangement: ["B", "A", "A", "A"], // Plays Phrase A three times, then shifts into the B breakdown!
        phrases: {
            "A": {
                "fx_impact": { vol: 1, pan: 0, sequence: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                "kick": { vol: 1, pan: 0, sequence: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0] },
                "snare": { vol: 0.8, pan: 0, sequence: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1] },
                "hihat": { vol: 0.5, pan: 0, sequence: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0] },
                "tom": { vol: 0.9, pan: 0, sequence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1] },
               "saw": { vol: 0.9, pan: 0, sequence: ["A2", 0, "A2", "C3", "A2", 0, "A2", "D3", "A2", 0, "A2", "E3", "F3", "-", "E3", "-", "A2", 0, "A2", "C3", "A2", 0, "A2", "G2", "F2", "-", 0, "G2", "E2", "-", "-", "-"] },
                "pluck": { vol: 0.6, pan: -0.4, sequence: ["A3", "C4", "E4", "A4", "E4", "C4", "A3", "C4", "A3", "D4", "F4", "A4", "F4", "D4", "A3", "D4", "F3", "A3", "C4", "F4", "C4", "A3", "F3", "A3", "E3", "G3", "B3", "E4", "B3", "G3", "E3", "G3"] },
                // THE FIX: Replaced 'Rhine' with '-'
                "melody": { vol: 0.85, pan: 0.3, sequence: ["A4", "-", "-", "-", "-", "-", "G4", "-", "A4", "-", "-", "-", "C5", "-", "B4", "-", "A4", "-", "-", "-", "-", "-", "F4", "-", "E4", "-", "-", "-", "-", "-", "-", "-"] }
            },
            "B": {
                "fx_impact": { vol: 1, pan: 0, sequence: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                "kick": { vol: 1, pan: 0, sequence: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1] },
                "snare": { vol: 0.8, pan: 0, sequence: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1] },
                "hihat": { vol: 0.6, pan: 0.2, sequence: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0] },
                "tom": { vol: 0.0, pan: 0, sequence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                "saw": { vol: 0.9, pan: 0, sequence: ["D3", "-", "D3", "-", "F3", "-", "D3", "-", "E3", "-", "E3", "-", "G3", "-", "E3", "-", "A3", "-", "A3", "-", "C4", "-", "B3", "-", "F3", "-", "G3", "-", "E3", "-", "-", "-"] },
                "pluck": { vol: 0.7, pan: 0.4, sequence: ["D4", "F4", "A4", "D5", "A4", "F4", "E4", "G4", "B4", "E5", "B4", "G4", "A4", "C5", "E5", "A5", "E5", "C5", "F4", "A4", "C5", "F5", "C5", "A4", "E4", "G4", "B4", "E5", "B4", "G4", "E4", "C4"] },
                // THE FIX: Replaced 'Rhine' with '-'
                "melody": { vol: 0.9, pan: -0.2, sequence: ["D5", "-", "-", "-", "F5", "-", "E5", "-", "E5", "-", "-", "-", "G5", "-", "F5", "-", "A5", "-", "-", "-", "B5", "-", "A5", "-", "F5", "-", "G5", "-", "E5", "-", "-", "-"] }
            }
        }
    }
	
];

let activeTrackIndex = 0;

function cycleMusicTrack() {
    activeTrackIndex++;
    if (activeTrackIndex >= musicTracks.length) activeTrackIndex = 0;
    
    tempo = musicTracks[activeTrackIndex].tempo;
    
    // THE FIX: Reset arrangement timeline pointers on track swap
    currentNote = 0; 
    currentPhraseIndex = 0;
    currentLoopCount = 0;
    
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
    
    if (currentNote >= 32) {
        currentNote = 0; 
        
        let currentSong = musicTracks[activeTrackIndex];
        // THE FIX: Advance the timeline array if a multi-phrase arrangement exists
        if (currentSong.arrangement && currentSong.arrangement.length > 0) {
            currentPhraseIndex++;
            if (currentPhraseIndex >= currentSong.arrangement.length) {
                currentPhraseIndex = 0;
                currentLoopCount++; // Full song loop completed
            }
        } else {
            currentLoopCount++;
        }
    } 
}

function buildTrackRouting(vol, pan) {
    let masterGain = audioCtx.createGain(); masterGain.gain.value = vol;
    let panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : audioCtx.createPanner();
    if (panner.pan) panner.pan.value = pan;
    masterGain.connect(panner); panner.connect(audioCtx.destination);
    return masterGain; 
}

// === REPLACED ===
function scheduleNote(stepNum, time) {
    if (musicVolume <= 0) return;
    
    let currentSong = musicTracks[activeTrackIndex];
    const secondsPerStep = (60.0 / currentSong.tempo) / 4;

    // --- NEW FORMAT: DYNAMIC TRACK PHRASES & ARRANGEMENTS ---
    if (currentSong.arrangement && currentSong.phrases) {
        // Find out if we should play phrase 'A' or 'B' right now
        let activePhraseKey = currentSong.arrangement[currentPhraseIndex];
        let trackSource = currentSong.phrases[activePhraseKey];
        
        if (trackSource) {
            Object.keys(trackSource).forEach(instId => {
                let track = trackSource[instId];
                if (!track.sequence || track.sequence[stepNum] === 0 || track.sequence[stepNum] === '-') return;
                
                let sustainBlocks = 1;
                for (let k = stepNum + 1; k < track.sequence.length; k++) {
                    if (track.sequence[k] === '-') sustainBlocks++;
                    else break;
                }
                let totalDuration = sustainBlocks * secondsPerStep;
                playSoundEvent(instId, track.sequence[stepNum], time, track.vol * musicVolume, track.pan, totalDuration);
            });
        }
    } 
    // Single static track data format configuration (for newly uploaded or export items)
    else if (currentSong.tracks) {
        Object.keys(currentSong.tracks).forEach(instId => {
            let track = currentSong.tracks[instId];
            if (!track.sequence || track.sequence[stepNum] === 0 || track.sequence[stepNum] === '-') return;
            
            let sustainBlocks = 1;
            for (let k = stepNum + 1; k < track.sequence.length; k++) {
                if (track.sequence[k] === '-') sustainBlocks++;
                else break;
            }
            let totalDuration = sustainBlocks * secondsPerStep;
            playSoundEvent(instId, track.sequence[stepNum], time, track.vol * musicVolume, track.pan, totalDuration);
        });
    } 
    // --- LEGACY FORMAT BACKWARD COMPATIBILITY ---
    else {
        if (currentSong.melody && currentSong.melody[stepNum]) playSoundEvent('melody', currentSong.melody[stepNum], time, 1.0 * musicVolume, 0, secondsPerStep);
// ============================================
        if (currentSong.harmony && currentSong.harmony[stepNum]) playSoundEvent('melody', currentSong.harmony[stepNum], time, 0.6 * musicVolume, 0, secondsPerStep);
        if (currentSong.bass && currentSong.bass[stepNum]) playSoundEvent('bass', currentSong.bass[stepNum], time, 1.0 * musicVolume, 0, secondsPerStep);
        if (currentSong.ambience && currentSong.ambience[stepNum]) playSoundEvent('pad', currentSong.ambience[stepNum], time, 1.0 * musicVolume, 0, secondsPerStep * 4);
        
        if (currentSong.drums && currentSong.drums[stepNum]) {
            let d = currentSong.drums[stepNum];
            if (d === 'k') playSoundEvent('kick', 'HIT', time, 1.0 * musicVolume, 0);
            if (d === 's') playSoundEvent('snare', 'HIT', time, 1.0 * musicVolume, 0);
            if (d === 'h') playSoundEvent('hihat', 'HIT', time, 1.0 * musicVolume, 0);
        }
    }
}

// Router for triggering the correct Web Audio API math
function playSoundEvent(instId, note, time, vol, pan, duration) {
    if (instId === 'kick') playKick(time, vol, pan);
    else if (instId === 'snare') playSnare(time, vol, pan);
    else if (instId === 'hihat') playHihat(time, duration || 0.1, vol, pan);
    else if (instId === 'openhat') playHihat(time, duration || 0.3, vol, pan);
    else if (instId === 'tom') playTom(time, vol, pan);
    else if (instId === 'clap') playClap(time, vol, pan);
    else if (instId === 'fx_sweep') playSweep(time, vol, pan, duration || 2.0);
    else if (instId === 'fx_impact') playImpact(time, vol, pan);
    else if (instId === 'amb_vinyl') playVinyl(time, vol, pan, duration || 2.0);
    else {
        // It's a Synth, use frequency mapping
        let freq = typeof note === 'number' ? note : (NOTES[note] || 440);
        if (instId === 'bass') playTone(freq, time, 'triangle', duration || 0.2, false, false, vol, pan);
        else if (instId === 'saw') playTone(freq, time, 'sawtooth', duration || 0.2, false, false, vol, pan);
        else if (instId === 'pad') playTone(freq, time, 'sine', duration || 0.5, true, false, vol, pan);
        else if (instId === 'pluck') playTone(freq, time, 'triangle', duration || 0.1, false, true, vol, pan);
        else if (instId === 'trumpet') playTone(freq, time, 'sawtooth', duration || 0.3, false, false, vol, pan);
        else playTone(freq, time, 'square', duration || 0.15, false, false, vol, pan); 
    }
}

function playKick(time, vol, pan) {
    let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain(); let trackOut = buildTrackRouting(vol, pan);
    osc.connect(gain); gain.connect(trackOut);
    osc.frequency.setValueAtTime(150, time); osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(1, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.start(time); osc.stop(time + 0.5);
}

function playSnare(time, vol, pan) {
    let trackOut = buildTrackRouting(vol, pan);
    let noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    let filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000;
    let gain = audioCtx.createGain(); gain.gain.setValueAtTime(1, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.connect(filter); filter.connect(gain); gain.connect(trackOut);
    noise.start(time); noise.stop(time + 0.2);
    
    let osc = audioCtx.createOscillator(); let oscGain = audioCtx.createGain(); osc.type = 'triangle';
    osc.connect(oscGain); oscGain.connect(trackOut);
    osc.frequency.setValueAtTime(250, time); oscGain.gain.setValueAtTime(0.5, time); oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.start(time); osc.stop(time + 0.2);
}

function playHihat(time, duration, vol, pan) {
    let trackOut = buildTrackRouting(vol, pan);
    let noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    let filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 7000;
    let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.5, time); gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(trackOut);
    noise.start(time); noise.stop(time + duration);
}

function playTom(time, vol, pan) {
    let trackOut = buildTrackRouting(vol, pan);
    let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(trackOut);
    osc.frequency.setValueAtTime(200, time); osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
    gain.gain.setValueAtTime(0.8, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.start(time); osc.stop(time + 0.3);
}

function playClap(time, vol, pan) {
    let trackOut = buildTrackRouting(vol, pan);
    let filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000;
    let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.5, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    filter.connect(gain); gain.connect(trackOut);
    [0, 0.02, 0.04].forEach(offset => {
        let noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
        noise.connect(filter); noise.start(time + offset); noise.stop(time + offset + 0.1);
    });
}

function playTone(freq, time, type, duration, slowAttack=false, fastDecay=false, vol, pan) {
    if (!freq) return;
    let trackOut = buildTrackRouting(vol, pan);
    let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain(); osc.type = type;
    osc.connect(gain); gain.connect(trackOut);
    osc.frequency.setValueAtTime(freq, time); 
    
    if (slowAttack) {
        gain.gain.setValueAtTime(0.01, time); gain.gain.linearRampToValueAtTime(0.4, time + Math.min(0.2, duration/2)); gain.gain.linearRampToValueAtTime(0.01, time + duration);
    } else if (fastDecay) {
        gain.gain.setValueAtTime(0.4, time); gain.gain.exponentialRampToValueAtTime(0.01, time + Math.min(0.1, duration));
    } else {
        gain.gain.setValueAtTime(0.3, time); gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    }
    osc.start(time); osc.stop(time + duration);
}

function playSweep(time, vol, pan, duration) {
    let trackOut = buildTrackRouting(vol, pan);
    let noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    let filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(6000, time + duration);
    let gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.8, time + duration * 0.9); 
    gain.gain.linearRampToValueAtTime(0.01, time + duration); 
    noise.connect(filter); filter.connect(gain); gain.connect(trackOut);
    noise.start(time); noise.stop(time + duration);
}

function playImpact(time, vol, pan) {
    let trackOut = buildTrackRouting(vol, pan);
    let osc = audioCtx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(100, time); osc.frequency.exponentialRampToValueAtTime(20, time + 1.5);
    let gainOsc = audioCtx.createGain(); gainOsc.gain.setValueAtTime(1.0, time); gainOsc.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
    osc.connect(gainOsc); gainOsc.connect(trackOut); osc.start(time); osc.stop(time + 1.5);

    let noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500;
    let gainNoise = audioCtx.createGain(); gainNoise.gain.setValueAtTime(0.5, time); gainNoise.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    noise.connect(filter); filter.connect(gainNoise); gainNoise.connect(trackOut);
    noise.start(time); noise.stop(time + 0.5);
}

function playVinyl(time, vol, pan, duration) {
    let trackOut = buildTrackRouting(vol, pan);
    let noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer;
    let filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 3000;
    let gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.05, time); gain.gain.linearRampToValueAtTime(0.01, time + duration);
    noise.connect(filter); filter.connect(gain); gain.connect(trackOut);
    noise.start(time); noise.stop(time + duration);
}

// === MUSIC SCHEDULER & HEARTBEAT ===
function musicScheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentNote, nextNoteTime);
        nextMusicNote();
    }
    timerID = setTimeout(musicScheduler, lookahead);
}

function startBackgroundMusic() {
    initAudio();
    if (!musicPlaying) {
        musicPlaying = true;
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

    switch (type) {
        case 'xpTick':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800 + (Math.random() * 200), now); 
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.04 * sfxVolume, now + 0.005);
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