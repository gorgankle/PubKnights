const crypto = require('crypto');

const USERNAME_PATTERN = /^[A-Za-z0-9 _-]{1,24}$/;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 128;

const DEFAULT_APPEARANCE = Object.freeze({
    gender: 'male',
    skin: 'light',
    hair: 'hair_messy',
    hairColor: 'brown',
    eyes: 'eyes_blue',
    shirtColor: 'blue',
    pantsColor: 'dark',
    bootsColor: 'leather'
});

const APPEARANCE_OPTIONS = Object.freeze({
    gender: ['male', 'female'],
    skin: ['light', 'tan', 'dark', 'deep', 'pale', 'orc', 'goblin', 'undead'],
    hair: [
        'hair_messy', 'hair_spiky', 'hair_long', 'hair_bob',
        'hair_braid', 'hair_buzzcut', 'hair_mohawk', 'hair_ponytail',
        'hair_undercut', 'hair_topknot', 'hair_curly', 'hair_twintails',
        'hair_bald'
    ],
    hairColor: ['brown', 'blonde', 'black', 'white', 'orange', 'red', 'blue', 'purple', 'auburn', 'silver', 'pink', 'teal', 'green'],
    eyes: ['eyes_blue', 'eyes_green', 'eyes_brown', 'eyes_red', 'eyes_purple', 'eyes_gold', 'eyes_grey', 'eyes_black', 'eyes_white'],
    shirtColor: ['blue', 'red', 'green', 'black', 'white', 'purple', 'brown', 'navy', 'olive', 'gold', 'burgundy', 'teal'],
    pantsColor: ['dark', 'brown', 'grey', 'tan', 'blue', 'olive', 'khaki', 'charcoal', 'maroon'],
    bootsColor: ['leather', 'black', 'grey', 'suede', 'iron', 'burgundy', 'olive']
});

const PET_OPTIONS = Object.freeze({
    type: ['dog', 'cat'],
    furColor: ['brown', 'gray', 'orange', 'white', 'black', 'golden', 'cream'],
    collarColor: ['red', 'blue', 'green', 'yellow', 'purple', 'pink']
});

const ROOM_IDS = new Set(['ZONE_HUB', 'TAVERN', 'COMMUNITY_SQUARE', 'GILDED_TAVERN', 'TRAINING_GROUNDS']);

function normalizeUsername(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!USERNAME_PATTERN.test(normalized)) return null;
    return normalized;
}

function validatePassword(value) {
    return typeof value === 'string' &&
        value.length >= PASSWORD_MIN_LENGTH &&
        value.length <= PASSWORD_MAX_LENGTH;
}

function hashPassword(password) {
    const iterations = 120000;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
    if (typeof password !== 'string' || typeof storedPassword !== 'string') return false;

    if (!storedPassword.startsWith('pbkdf2$')) {
        return storedPassword === password;
    }

    const parts = storedPassword.split('$');
    if (parts.length !== 4) return false;

    const iterations = Number.parseInt(parts[1], 10);
    const salt = parts[2];
    const storedHash = parts[3];
    if (!Number.isInteger(iterations) || !salt || !/^[a-f0-9]+$/i.test(storedHash)) return false;

    const calculated = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const stored = Buffer.from(storedHash, 'hex');
    return stored.length === calculated.length && crypto.timingSafeEqual(stored, calculated);
}

function needsPasswordUpgrade(storedPassword) {
    return typeof storedPassword === 'string' && !storedPassword.startsWith('pbkdf2$');
}

function cleanString(value, maxLength, fallback = '') {
    if (typeof value !== 'string') return fallback;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return cleaned.substring(0, maxLength);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function sanitizeChatMessage(value, maxLength = 100) {
    return escapeHtml(cleanString(value, maxLength));
}

function sanitizeTitle(value, maxLength = 30) {
    const title = cleanString(value, maxLength, 'Untitled');
    return title ? escapeHtml(title) : 'Untitled';
}

function sanitizeToken(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim();
    return SAFE_TOKEN_PATTERN.test(normalized) ? normalized : fallback;
}

function pickAllowed(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

function sanitizeAppearance(value) {
    const input = value && typeof value === 'object' ? value : {};
    const output = {};

    for (const [key, allowed] of Object.entries(APPEARANCE_OPTIONS)) {
        output[key] = pickAllowed(input[key], allowed, DEFAULT_APPEARANCE[key]);
    }

    return output;
}

function sanitizePetCosmetics(value, existing = {}) {
    const input = value && typeof value === 'object' ? value : {};
    const current = existing && typeof existing === 'object' ? existing : {};

    return {
        ...current,
        name: escapeHtml(cleanString(input.name, 20, current.name || 'Companion')) || 'Companion',
        type: pickAllowed(input.type, PET_OPTIONS.type, current.type || 'dog'),
        furColor: pickAllowed(input.furColor, PET_OPTIONS.furColor, current.furColor || 'brown'),
        collarColor: pickAllowed(input.collarColor, PET_OPTIONS.collarColor, current.collarColor || 'red')
    };
}

function toInt(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.trunc(num);
}

function clampInt(value, min, max, fallback = min) {
    const num = toInt(value, fallback);
    return Math.max(min, Math.min(max, num));
}

function getArrayIndex(value, array) {
    const index = toInt(value, -1);
    return Array.isArray(array) && index >= 0 && index < array.length ? index : -1;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeZoneId(value) {
    if (value === null || value === undefined || value === '') return null;
    const token = sanitizeToken(value, null);
    if (!token || !ROOM_IDS.has(token)) return null;
    return token;
}

function sanitizeUGCContent(type, contentData) {
    if (!Array.isArray(contentData)) return null;

    if (type === 'ART') {
        if (contentData.length > 576) return null;
        return contentData.map(cell => sanitizeToken(cell, '.'));
    }

    if (type === 'MUSIC') {
        if (contentData.length > 32) return null;
        return contentData.map(step => {
            if (!step || typeof step !== 'object' || Array.isArray(step)) return {};
            return Object.fromEntries(
                Object.entries(step)
                    .slice(0, 16)
                    .map(([key, value]) => [sanitizeToken(key, 'note'), clampInt(value, 0, 127, 0)])
            );
        });
    }

    return null;
}

module.exports = {
    DEFAULT_APPEARANCE,
    APPEARANCE_OPTIONS,
    normalizeUsername,
    validatePassword,
    hashPassword,
    verifyPassword,
    needsPasswordUpgrade,
    cleanString,
    escapeHtml,
    sanitizeChatMessage,
    sanitizeTitle,
    sanitizeToken,
    sanitizeAppearance,
    sanitizePetCosmetics,
    clampInt,
    getArrayIndex,
    escapeRegExp,
    sanitizeZoneId,
    sanitizeUGCContent
};
