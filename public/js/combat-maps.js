

// --- COMBAT LAYER MAP ENGINE ---

let mapObstacles = [];

function getGridDistance(x1, y1, x2, y2, size2 = 1) {
    let closeX = Math.max(x2, Math.min(x1, x2 + size2 - 1));
    let closeY = Math.max(y2, Math.min(y1, y2 + size2 - 1));
    return Math.max(Math.abs(x1 - closeX), Math.abs(y1 - closeY));
}

function hasLineOfSight(x1, y1, x2, y2) {
    let dx = Math.abs(x2 - x1); let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1; let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy; let cx = x1; let cy = y1;
    while (true) {
        if (cx === x2 && cy === y2) return true;
        if (cx !== x1 || cy !== y1) {
            if (mapObstacles.some(o => o.x === cx && o.y === cy)) return false;
        }
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
}

// === LOBOTOMIZED MAP REQUEST ===
function transitionToCombat(zoneChoice = 'WILDERNESS') {
    // We do NO math here. We just ask the server to build the map and beam it down.
    socket.emit('deployToCombat', {
        zoneChoice: zoneChoice,
        activeLevel: (zoneChoice === 'CELLARS') ? player.selectedCellarLevel : player.selectedWildernessLevel
    });
}