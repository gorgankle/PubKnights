const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');

const ignoredProductionDirectories = new Set([
    '.git',
    'e2e',
    'node_modules',
    'public',
    'scripts',
    'test'
]);

// These exports are intentionally wider than the live server's current import
// graph. Most are direct unit-test seams or stable domain-library APIs. Keeping
// the baseline explicit means a newly exported, unconsumed symbol fails this
// test; stale entries also fail once an export is removed or gains a live user.
const allowedNonRuntimeExports = {
    'adventureState.js': [
        'ADVENTURE_SCHEMA_VERSION',
        'PartyPowerBandCatalog',
        'createInitialAdventureState',
        'reconcileAdventureProgression',
        'isAdventureRequirementMet',
        'areAdventureRequirementsMet',
        'calculatePartyPower',
        'getPartyPowerBand',
        'resolveRouteEncounterPool',
        'resolveRouteEncounterSelection',
        'hasUnclaimedCombatRewards'
    ],
    'chapterOneCompanions.js': [
        'ChapterOneCompanionCatalog',
        'getNamedCompanion'
    ],
    'combatActors.js': [
        'COMPANION_LEVEL_GROWTH',
        'getCompanionEquipmentStat',
        'TEAM_PLAYER',
        'TEAM_ROGUE',
        'syncCombatParties',
        'getActorPartyId',
        'getPartyActors',
        'ensureCombatActors',
        'canActorTarget'
    ],
    'combatAI.js': [
        'attackTarget',
        'selectAttackTarget',
        'actorHasLineOfSight',
        'moveTowardTarget',
        'moveAwayFromTarget'
    ],
    'combatEncounters.js': [
        'createCombatEncounter',
        'getDeployedCompanions',
        'getCompanionFormationTiles',
        'getWildernessEnemyId',
        'getCellarEnemyId',
        'WILDERNESS_STANDARD_ENEMY_ROTATIONS',
        'MAX_STANDARD_PLAYER_ACTORS',
        'VALID_ZONES'
    ],
    'combatIntents.js': [
        'AI_PROFILE_CATALOG',
        'DEFAULT_AI_PROFILE',
        'getTargetFootprintTiles',
        'projectIntentTargetTiles'
    ],
    'combatParties.js': [
        'CONTROL_AUTO',
        'getActorControlMode'
    ],
    'combatPlayback.js': [
        'DEFAULT_COMBAT_PLAYBACK_TIMEOUT_MS',
        'releaseExpiredCombatPlayback',
        'clearCombatPlaybackLock'
    ],
    'combatResources.js': [
        'DEFAULT_ACTOR_MAX_STAMINA',
        'DEFAULT_ATTACK_STAMINA_COST',
        'DEFAULT_HEAL_STAMINA_COST',
        'REST_STAMINA_RATIO',
        'MOVE_STAMINA_PER_TILE'
    ],
    'combatRewards.js': [
        'EXPEDITION_DEFEAT_GOLD',
        'EXPEDITION_CAPTAIN_GOLD',
        'rollPetVictoryLoot'
    ],
    'combatTurnRecovery.js': [
        'PASS_STAMINA_RATIO_PER_UNUSED_ACTION',
        'getUnusedActionCredits'
    ],
    'companionRoster.js': [
        'createCompanionInstanceId',
        'canHireCompanion'
    ],
    'equipmentHandRules.js': [
        'isTwoHandedWeapon',
        'getConflictingHandSlot'
    ],
    'mercenaryProgression.js': [
        'ACTIVE_MERCENARY_XP_RATIO',
        'BENCHED_MERCENARY_XP_RATIO',
        'DEFAULT_TRAINING_GOLD_PER_TARGET_LEVEL',
        'normalizeMercenaryProgression',
        'applyMercenaryLifetimeXpLevelUps',
        'getMercenaryTrainingQuote'
    ],
    'saveMigrations.js': [
        'RETIRED_TOP_LEVEL_KEYS',
        'getStoredSaveVersion',
        'containsRetiredState'
    ],
    'serverSecurity.js': [
        'APPEARANCE_OPTIONS',
        'cleanString',
        'escapeHtml'
    ],
    'worldEvents.js': [
        'WORLD_EFFECT_TYPES',
        'WORLD_OBJECTIVE_TYPES',
        'eventMatchesObjective'
    ],
    'worldState.js': [
        'WORLD_SCHEMA_VERSION',
        'EPILOGUE_STATUSES',
        'createInitialWorldState',
        'mergeWorldStates'
    ]
};

const nonRuntimeExportReasons = {
    'adventureState.js': 'Pure progression and route-selection APIs retained for focused state-machine tests.',
    'chapterOneCompanions.js': 'Catalog and lookup APIs retained as the public companion-domain surface.',
    'combatActors.js': 'Actor construction and query primitives retained for isolated combat-domain tests.',
    'combatAI.js': 'AI selection and movement primitives retained for deterministic behavior tests.',
    'combatEncounters.js': 'Encounter builders and deployment constants retained for deployment/editor validation.',
    'combatIntents.js': 'Intent catalogs and target projection helpers retained for intent-preview tests.',
    'combatParties.js': 'Party control queries retained for party-state diagnostics and unit tests.',
    'combatPlayback.js': 'Playback timing and lock controls retained for recovery tests.',
    'combatResources.js': 'Named balance constants retained as the resource-system configuration surface.',
    'combatRewards.js': 'Reward constants and pet-loot rolling retained for deterministic reward tests.',
    'combatTurnRecovery.js': 'Recovery constant and calculator retained for turn-recovery tests.',
    'companionRoster.js': 'ID generation and hiring predicates retained for roster-domain tests.',
    'equipmentHandRules.js': 'Hand-rule predicates retained for equipment validation tests.',
    'mercenaryProgression.js': 'Progression ratios and pure helpers retained for progression tests.',
    'saveMigrations.js': 'Migration introspection helpers retained for compatibility tests.',
    'serverSecurity.js': 'Sanitizer primitives and appearance options retained as the security-library API.',
    'worldEvents.js': 'Effect catalogs and objective matching retained for declarative world-event tests.',
    'worldState.js': 'Schema/status constants and pure state constructors retained for compatibility tests.'
};

// The composition root injects this namespace instead of requiring individual
// helpers in each domain module. Only properties explicitly destructured from
// the named binding in these exact consumers count as runtime use.
const injectedNamespaceContracts = {
    'combatRouter/shared.js': {
        binding: 'shared',
        consumers: [
            'combatRouter/spellActions.js',
            'combatRouter/weaponActions.js',
            'combatRouter/consumableActions.js',
            'combatRouter/movementHandlers.js',
            'combatRouter/turnHandlers.js'
        ]
    }
};

function walkJavaScript(directory, ignoredDirectories = new Set()) {
    return fs.readdirSync(directory, { withFileTypes: true })
        .flatMap(entry => {
            if (entry.isDirectory()) {
                if (ignoredDirectories.has(entry.name)) return [];
                return walkJavaScript(
                    path.join(directory, entry.name),
                    ignoredDirectories
                );
            }
            return entry.isFile() && entry.name.endsWith('.js')
                ? [path.join(directory, entry.name)]
                : [];
        });
}

function splitTopLevel(source, delimiter = ',') {
    const parts = [];
    let start = 0;
    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    let curly = 0;
    let square = 0;
    let round = 0;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        const next = source[index + 1];

        if (lineComment) {
            if (char === '\n') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false;
                index++;
            }
            continue;
        }
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }
        if (char === '/' && next === '/') {
            lineComment = true;
            index++;
            continue;
        }
        if (char === '/' && next === '*') {
            blockComment = true;
            index++;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === '{') curly++;
        if (char === '}') curly--;
        if (char === '[') square++;
        if (char === ']') square--;
        if (char === '(') round++;
        if (char === ')') round--;

        if (
            char === delimiter
            && curly === 0
            && square === 0
            && round === 0
        ) {
            parts.push(source.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(source.slice(start));
    return parts;
}

function maskComments(source) {
    let output = '';
    let state = 'code';
    let escaped = false;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        const next = source[index + 1];
        if (state === 'line-comment') {
            if (char === '\n') {
                output += '\n';
                state = 'code';
            } else output += ' ';
            continue;
        }
        if (state === 'block-comment') {
            if (char === '*' && next === '/') {
                output += '  ';
                index++;
                state = 'code';
            } else output += char === '\n' ? '\n' : ' ';
            continue;
        }
        if (state !== 'code') {
            output += char;
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (
                (state === 'single-quote' && char === "'")
                || (state === 'double-quote' && char === '"')
                || (state === 'template' && char === '`')
            ) {
                state = 'code';
            }
            continue;
        }
        if (char === '/' && next === '/') {
            output += '  ';
            index++;
            state = 'line-comment';
        } else if (char === '/' && next === '*') {
            output += '  ';
            index++;
            state = 'block-comment';
        } else {
            output += char;
            if (char === "'") state = 'single-quote';
            else if (char === '"') state = 'double-quote';
            else if (char === '`') state = 'template';
        }
    }
    return output;
}

function getNamedExports(source) {
    source = maskComments(source);
    const names = new Set();
    const objectPattern = /module\.exports\s*=\s*\{([\s\S]*?)\}\s*;/g;
    let match;

    while ((match = objectPattern.exec(source))) {
        splitTopLevel(match[1]).forEach(entry => {
            const clean = entry
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .trim();
            if (!clean || clean.startsWith('...')) return;
            const nameMatch = clean.match(/^([A-Za-z_$][\w$]*)\s*(?::|$)/);
            if (nameMatch) names.add(nameMatch[1]);
        });
    }

    const propertyPattern = /(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g;
    while ((match = propertyPattern.exec(source))) names.add(match[1]);
    return names;
}

function resolveLocalRequire(consumerPath, request) {
    if (!request.startsWith('.')) return null;
    const candidate = path.resolve(path.dirname(consumerPath), request);
    const options = [candidate, `${candidate}.js`, path.join(candidate, 'index.js')];
    return options.find(option => fs.existsSync(option)) || null;
}

function getNamedRuntimeImports(consumerPath, source) {
    source = maskComments(source);
    const importsByPath = new Map();
    const add = (request, names) => {
        const resolved = resolveLocalRequire(consumerPath, request);
        if (!resolved) return;
        if (!importsByPath.has(resolved)) importsByPath.set(resolved, new Set());
        names.forEach(name => importsByPath.get(resolved).add(name));
    };
    let match;

    const destructured = /(?:const|let|var)\s*\{([^{};]+)\}\s*=\s*require\(\s*(['"])([^'"]+)\2\s*\)/g;
    while ((match = destructured.exec(source))) {
        const names = splitTopLevel(match[1])
            .map(entry => entry.trim().replace(/^\.\.\./, ''))
            .map(entry => entry.split(/\s*:/, 1)[0].trim())
            .map(entry => entry.replace(/\s*=.*$/, '').trim())
            .filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
        if (match[1].includes('...')) names.push('*');
        add(match[3], names);
    }

    const namespace = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"])([^'"]+)\2\s*\)/g;
    while ((match = namespace.exec(source))) {
        const variable = match[1];
        const request = match[3];
        const propertyPattern = new RegExp(
            `\\b${variable}\\s*(?:\\.\\s*([A-Za-z_$][\\w$]*)|\\[\\s*['"]([^'"]+)['"]\\s*\\])`,
            'g'
        );
        const names = [];
        let propertyMatch;
        while ((propertyMatch = propertyPattern.exec(source))) {
            names.push(propertyMatch[1] || propertyMatch[2]);
        }
        const sourceAfterDeclaration = source.slice(match.index + match[0].length);
        const escapingNamespace = new RegExp(
            `\\b${variable}\\b(?!\\s*(?:\\.|\\[))`
        );
        // Record namespaces passed into factories or other functions. An
        // explicit injectedNamespaceContracts entry resolves exact consumers.
        if (escapingNamespace.test(sourceAfterDeclaration)) names.push('*');
        add(request, names);
    }

    const direct = /require\(\s*(['"])([^'"]+)\1\s*\)\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*['"]([^'"]+)['"]\s*\])/g;
    while ((match = direct.exec(source))) add(match[2], [match[3] || match[4]]);

    return importsByPath;
}

function relative(filePath) {
    return path.relative(root, filePath).replaceAll('\\', '/');
}

function getDestructuredBindingNames(source, binding) {
    source = maskComments(source);
    const escapedBinding = binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
        `(?:const|let|var)\\s*\\{([^{};]+)\\}\\s*=\\s*${escapedBinding}\\b`,
        'g'
    );
    const names = new Set();
    let match;

    while ((match = pattern.exec(source))) {
        splitTopLevel(match[1]).forEach(entry => {
            const exportName = entry
                .trim()
                .replace(/^\.\.\./, '')
                .split(/\s*:/, 1)[0]
                .replace(/\s*=.*$/, '')
                .trim();
            if (/^[A-Za-z_$][\w$]*$/.test(exportName)) names.add(exportName);
        });
    }
    return names;
}

function getInjectedNamespaceNames(modulePath, sourcesByPath) {
    const contract = injectedNamespaceContracts[relative(modulePath)];
    if (!contract) return new Set();

    const names = new Set();
    contract.consumers.forEach(consumerRelativePath => {
        const consumerPath = path.resolve(root, consumerRelativePath);
        const source = sourcesByPath.get(consumerPath);
        assert.ok(source, `Missing namespace consumer ${consumerRelativePath}`);
        getDestructuredBindingNames(source, contract.binding)
            .forEach(name => names.add(name));
    });
    return names;
}

function isRuntimeExportUsed(name, importedNames, injectedNames) {
    return importedNames.has(name)
        || (importedNames.has('*') && injectedNames.has(name));
}

function readClassicScripts(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const scripts = [];
    const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    let inlineIndex = 0;

    while ((match = scriptPattern.exec(html))) {
        const attributes = match[1];
        if (/\btype\s*=\s*['"]module['"]/i.test(attributes)) continue;
        const sourceMatch = attributes.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i);
        if (!sourceMatch) {
            inlineIndex++;
            scripts.push({
                owner: `${path.basename(htmlPath)}#inline-${inlineIndex}`,
                source: match[2]
            });
            continue;
        }

        const sourcePath = sourceMatch[1].split('?')[0];
        if (!/^\/?js\//.test(sourcePath)) continue;
        const absolutePath = path.join(publicRoot, sourcePath.replace(/^\//, ''));
        scripts.push({
            owner: relative(absolutePath),
            source: fs.readFileSync(absolutePath, 'utf8')
        });
    }
    return scripts;
}

function maskCommentsAndStrings(source) {
    let output = '';
    let state = 'code';
    let escaped = false;

    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        const next = source[index + 1];
        if (state === 'line-comment') {
            if (char === '\n') {
                state = 'code';
                output += '\n';
            } else output += ' ';
            continue;
        }
        if (state === 'block-comment') {
            if (char === '*' && next === '/') {
                output += '  ';
                index++;
                state = 'code';
            } else output += char === '\n' ? '\n' : ' ';
            continue;
        }
        if (state !== 'code') {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (
                (state === 'single-quote' && char === "'")
                || (state === 'double-quote' && char === '"')
                || (state === 'template' && char === '`')
            ) {
                state = 'code';
            }
            output += char === '\n' ? '\n' : ' ';
            continue;
        }
        if (char === '/' && next === '/') {
            output += '  ';
            index++;
            state = 'line-comment';
        } else if (char === '/' && next === '*') {
            output += '  ';
            index++;
            state = 'block-comment';
        } else if (char === "'") {
            output += ' ';
            state = 'single-quote';
        } else if (char === '"') {
            output += ' ';
            state = 'double-quote';
        } else if (char === '`') {
            output += ' ';
            state = 'template';
        } else {
            output += char;
        }
    }
    return output;
}

function findClosingDelimiter(code, openIndex, openChar, closeChar) {
    let depth = 0;
    for (let index = openIndex; index < code.length; index++) {
        if (code[index] === openChar) depth++;
        else if (code[index] === closeChar) {
            depth--;
            if (depth === 0) return index;
        }
    }
    return -1;
}

function nextNonWhitespaceIndex(code, start) {
    let index = start;
    while (index < code.length && /\s/.test(code[index])) index++;
    return index;
}

function previousWord(code, start) {
    let end = start;
    while (end >= 0 && /\s/.test(code[end])) end--;
    let begin = end;
    while (begin >= 0 && /[A-Za-z0-9_$]/.test(code[begin])) begin--;
    return code.slice(begin + 1, end + 1);
}

function getFunctionBodyStarts(code) {
    const starts = new Set();
    let match;

    const functionPattern = /\bfunction\b/g;
    while ((match = functionPattern.exec(code))) {
        const parametersStart = code.indexOf('(', match.index + match[0].length);
        if (parametersStart < 0) continue;
        const parametersEnd = findClosingDelimiter(code, parametersStart, '(', ')');
        if (parametersEnd < 0) continue;
        const bodyStart = nextNonWhitespaceIndex(code, parametersEnd + 1);
        if (code[bodyStart] === '{') starts.add(bodyStart);
    }

    const arrowPattern = /=>\s*\{/g;
    while ((match = arrowPattern.exec(code))) {
        starts.add(match.index + match[0].lastIndexOf('{'));
    }

    const classPattern = /\bclass\b/g;
    while ((match = classPattern.exec(code))) {
        const bodyStart = code.indexOf('{', match.index + match[0].length);
        if (bodyStart >= 0) starts.add(bodyStart);
    }

    // Object/class method bodies have function scope without a `function`
    // keyword. A parenthesized control statement is the important exception.
    const controlWords = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
    const parenthesisStack = [];
    for (let index = 0; index < code.length; index++) {
        if (code[index] === '(') parenthesisStack.push(index);
        else if (code[index] === ')' && parenthesisStack.length) {
            const openIndex = parenthesisStack.pop();
            const bodyStart = nextNonWhitespaceIndex(code, index + 1);
            if (
                code[bodyStart] === '{'
                && !controlWords.has(previousWord(code, openIndex - 1))
            ) {
                starts.add(bodyStart);
            }
        }
    }
    return starts;
}

function isFunctionDeclarationPosition(code, functionIndex) {
    let previousIndex = functionIndex - 1;
    while (previousIndex >= 0 && /\s/.test(code[previousIndex])) previousIndex--;
    if (previousIndex < 0 || ';{}'.includes(code[previousIndex])) return true;

    const word = previousWord(code, previousIndex);
    if (word !== 'async') return false;
    const asyncIndex = previousIndex - word.length + 1;
    let beforeAsync = asyncIndex - 1;
    while (beforeAsync >= 0 && /\s/.test(code[beforeAsync])) beforeAsync--;
    return beforeAsync < 0 || ';{}'.includes(code[beforeAsync]);
}

function readVarDeclaration(code, afterToken) {
    let end = afterToken;
    let curly = 0;
    let round = 0;
    let square = 0;

    while (end < code.length) {
        const current = code[end];
        if (
            (current === ';' || current === ')')
            && curly === 0
            && round === 0
            && square === 0
        ) break;
        if (
            curly === 0
            && round === 0
            && square === 0
            && /[A-Za-z_$]/.test(current)
        ) {
            const keyword = code.slice(end).match(/^([A-Za-z_$][\w$]*)/)[1];
            if (keyword === 'in' || keyword === 'of') break;
        }
        if (current === '{') curly++;
        else if (current === '}') curly--;
        else if (current === '(') round++;
        else if (current === ')') round--;
        else if (current === '[') square++;
        else if (current === ']') square--;
        end++;
    }

    const names = splitTopLevel(code.slice(afterToken, end))
        .map(declaration => declaration.trim().match(/^([A-Za-z_$][\w$]*)/))
        .filter(Boolean)
        .map(match => match[1]);
    return { names, end };
}

// `const`, `let`, and `class` collisions are syntax errors caught by vm.Script.
// `var` is scoped to a script or function, not to if/for/standalone blocks, so
// this scanner tracks function bodies independently from brace/paren depth.
function getOverwriteableGlobals(source) {
    const code = maskCommentsAndStrings(source);
    const functionBodyStarts = getFunctionBodyStarts(code);
    const braceStack = [];
    const names = [];
    let functionDepth = 0;

    for (let index = 0; index < code.length;) {
        const char = code[index];
        if (char === '{') {
            const startsFunction = functionBodyStarts.has(index);
            braceStack.push(startsFunction);
            if (startsFunction) functionDepth++;
            index++;
            continue;
        }
        if (char === '}') {
            if (braceStack.pop()) functionDepth--;
            index++;
            continue;
        }
        if (/[A-Za-z_$]/.test(char)) {
            const tokenMatch = code.slice(index).match(/^([A-Za-z_$][\w$]*)/);
            const token = tokenMatch[1];
            const afterToken = index + token.length;
            if (
                token === 'function'
                && functionDepth === 0
                && isFunctionDeclarationPosition(code, index)
            ) {
                const nameMatch = code.slice(afterToken).match(/^\s*\*?\s*([A-Za-z_$][\w$]*)/);
                if (nameMatch) names.push(nameMatch[1]);
            } else if (token === 'var' && functionDepth === 0) {
                const declaration = readVarDeclaration(code, afterToken);
                names.push(...declaration.names);
                index = declaration.end;
                continue;
            }
            index = afterToken;
            continue;
        }
        index++;
    }
    return names;
}

test('production CommonJS named exports have a runtime consumer or an explicit compatibility reason', () => {
    const productionFiles = walkJavaScript(root, ignoredProductionDirectories);
    const productionSet = new Set(productionFiles.map(filePath => path.resolve(filePath)));
    const sourcesByPath = new Map();
    const exportsByPath = new Map();
    const importsByPath = new Map();

    productionFiles.forEach(filePath => {
        const source = fs.readFileSync(filePath, 'utf8');
        sourcesByPath.set(path.resolve(filePath), source);
        const exportedNames = getNamedExports(source);
        if (exportedNames.size) exportsByPath.set(path.resolve(filePath), exportedNames);
        getNamedRuntimeImports(filePath, source).forEach((names, targetPath) => {
            const resolvedTarget = path.resolve(targetPath);
            if (!productionSet.has(resolvedTarget)) return;
            if (!importsByPath.has(resolvedTarget)) importsByPath.set(resolvedTarget, new Set());
            names.forEach(name => importsByPath.get(resolvedTarget).add(name));
        });
    });

    const actualUnused = [];
    exportsByPath.forEach((exportedNames, filePath) => {
        const importedNames = importsByPath.get(filePath) || new Set();
        const injectedNames = getInjectedNamespaceNames(filePath, sourcesByPath);
        exportedNames.forEach(name => {
            if (!isRuntimeExportUsed(name, importedNames, injectedNames)) {
                actualUnused.push(`${relative(filePath)}#${name}`);
            }
        });
    });
    actualUnused.sort();

    const allowedUnused = Object.entries(allowedNonRuntimeExports)
        .flatMap(([filePath, names]) => names.map(name => `${filePath}#${name}`))
        .sort();

    assert.deepEqual(
        Object.keys(nonRuntimeExportReasons).sort(),
        Object.keys(allowedNonRuntimeExports).sort(),
        'Every unused-export allowlist group needs a module-specific reason.'
    );
    Object.entries(nonRuntimeExportReasons).forEach(([filePath, reason]) => {
        assert.ok(reason.length >= 20, `${filePath} needs a meaningful allowlist reason`);
    });

    assert.deepEqual(
        actualUnused,
        allowedUnused,
        'Update a production import, remove the dead export, or document an intentional non-runtime API in allowedNonRuntimeExports.'
    );
});

test('escaped namespaces only consume properties destructured by exact consumers', () => {
    const injectedNames = getDestructuredBindingNames(`
        const { liveExport } = shared;
        function commonName() {}
    `, 'shared');
    const importedNames = new Set(['*']);

    assert.equal(isRuntimeExportUsed('liveExport', importedNames, injectedNames), true);
    assert.equal(isRuntimeExportUsed('commonName', importedNames, injectedNames), false);
    assert.equal(isRuntimeExportUsed('deadExport', importedNames, injectedNames), false);
});

test('classic-global scanner preserves duplicate declarations from one source', () => {
    assert.deepEqual(
        getOverwriteableGlobals(`
            function repeated() {}
            function repeated() {}
            var shared = 1;
            var shared = 2;
            if (true) {
                var blockGlobal = true;
            }
            for (var loopIndex = 0, loopAlias = 1; loopIndex < 1; loopIndex++) {
                var loopBodyGlobal = true;
            }
            {
                var standaloneBlockGlobal = true;
            }
            function outer() {
                function nestedOnly() {}
                var localOnly = true;
            }
            const arrow = () => {
                var arrowLocalOnly = true;
            };
            (function namedExpression() {
                var iifeLocalOnly = true;
            })();
            const holder = {
                method() {
                    var methodLocalOnly = true;
                }
            };
        `),
        [
            'repeated',
            'repeated',
            'shared',
            'shared',
            'blockGlobal',
            'loopIndex',
            'loopAlias',
            'loopBodyGlobal',
            'standaloneBlockGlobal',
            'outer'
        ]
    );
});

test('each public page has one collision-free classic-script global scope', () => {
    const htmlFiles = fs.readdirSync(publicRoot)
        .filter(fileName => fileName.endsWith('.html'))
        .sort();

    htmlFiles.forEach(fileName => {
        const scripts = readClassicScripts(path.join(publicRoot, fileName));
        const externalOwners = scripts
            .map(script => script.owner)
            .filter(owner => owner.startsWith('public/js/'));
        assert.equal(
            new Set(externalOwners).size,
            externalOwners.length,
            `${fileName} loads the same local classic script more than once`
        );

        assert.doesNotThrow(
            () => new vm.Script(
                scripts.map(script => `\n// ${script.owner}\n${script.source}`).join('\n;\n'),
                { filename: fileName }
            ),
            `${fileName} contains duplicate lexical globals or invalid combined script syntax`
        );

        const ownerByGlobal = new Map();
        scripts.forEach(script => {
            getOverwriteableGlobals(script.source).forEach(globalName => {
                const previousOwner = ownerByGlobal.get(globalName);
                assert.equal(
                    previousOwner,
                    undefined,
                    `${fileName}: global ${globalName} is declared by both ${previousOwner} and ${script.owner}`
                );
                ownerByGlobal.set(globalName, script.owner);
            });
        });
    });
});
