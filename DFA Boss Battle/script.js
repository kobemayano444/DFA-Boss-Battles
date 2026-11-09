"use strict";

// Each boss is a COMPLETE DFA: one transition for each (state, symbol).
const BOSSES = {
    gatekeeper: {
        name: "The Gatekeeper",
        subtitle: "THE FIRST TRIAL",
        rank: "RANK 01 / INITIATE",
        difficulty: "EASY",
        lore: "One wrong step can seal the gate forever.",
        mission: "Mission: force the Gatekeeper to encounter two consecutive zeros.",
        hint: "After one 0, the machine can still recover by reading 1. See what a second 0 does instead.",
        alphabet: ["0", "1"],
        states: ["q0", "q1", "D"],
        start: "q0",
        accepting: ["q0"],
        transitions: {
            q0: { "0": "q1", "1": "q0" },
            q1: { "0": "D", "1": "q0" },
            D:  { "0": "D", "1": "D" }
        },
        graph: {
            nodes: [
                { id: "q0", x: 120, y: 151, caption: "START / ACCEPT" },
                { id: "q1", x: 330, y: 151, caption: "RECOVERABLE" },
                { id: "D",  x: 545, y: 151, caption: "DEAD STATE" }
            ],
            edges: [
                { from: "q0", to: "q1", symbols: "0", d: "M150 137 Q225 73 300 137", x: 225, y: 91 },
                { from: "q1", to: "q0", symbols: "1", d: "M300 168 Q225 230 150 168", x: 225, y: 223 },
                { from: "q0", to: "q0", symbols: "1", d: "M108 122 C57 57 182 53 136 125", x: 117, y: 52 },
                { from: "q1", to: "D", symbols: "0", d: "M361 151 L514 151", x: 439, y: 136 },
                { from: "D", to: "D", symbols: "01", d: "M533 121 C482 56 608 56 561 125", x: 548, y: 51, label: "0, 1" }
            ]
        }
    },
    parity: {
        name: "The Parity Knight",
        subtitle: "THE SECOND TRIAL",
        rank: "RANK 02 / ADEPT",
        difficulty: "MEDIUM",
        lore: "The knight counts your ones. Strike at the precise moment.",
        mission: "Mission: read a 0 when the total number of 1s seen so far is positive and even.",
        hint: "You begin at zero 1s. Reach the positive-even state (q₂) using 1s, then see what 0 does.",
        alphabet: ["0", "1"],
        states: ["q0", "q1", "q2", "D"],
        start: "q0",
        accepting: ["q0", "q1"],
        transitions: {
            q0: { "0": "q0", "1": "q1" },
            q1: { "0": "q1", "1": "q2" },
            q2: { "0": "D", "1": "q1" },
            D:  { "0": "D", "1": "D" }
        },
        graph: {
            nodes: [
                { id: "q0", x: 84, y: 157, caption: "START / ACCEPT" },
                { id: "q1", x: 235, y: 157, caption: "ACCEPTING" },
                { id: "q2", x: 400, y: 157, caption: "RECOVERABLE" },
                { id: "D", x: 564, y: 157, caption: "DEAD STATE" }
            ],
            edges: [
                { from: "q0", to: "q0", symbols: "0", d: "M72 128 C22 64 146 64 99 129", x: 86, y: 64 },
                { from: "q0", to: "q1", symbols: "1", d: "M115 157 L204 157", x: 160, y: 143 },
                { from: "q1", to: "q1", symbols: "0", d: "M222 127 C170 62 301 62 250 129", x: 235, y: 64 },
                { from: "q1", to: "q2", symbols: "1", d: "M265 142 Q316 93 370 142", x: 318, y: 105 },
                { from: "q2", to: "q1", symbols: "1", d: "M370 172 Q317 232 265 172", x: 318, y: 222 },
                { from: "q2", to: "D", symbols: "0", d: "M431 157 L532 157", x: 480, y: 143 },
                { from: "D", to: "D", symbols: "01", d: "M553 127 C503 62 633 62 579 130", x: 565, y: 64, label: "0, 1" }
            ]
        }
    }
};


// Boss Rush always runs in this order. Later stages are longer and have more states.
const BOSS_ORDER = ["gatekeeper", "parity", "cipher", "echo", "sovereign"];
const ADVANCE_DELAY_MS = 2600;

// Construct a complete DFA that recognizes whether a binary pattern has occurred.
// qN means that the last N input symbols match a prefix of the pattern.
// Once the complete pattern appears, the DFA enters the absorbing dead state D.
function makePatternDFA(pattern) {
    const states = [...Array(pattern.length).keys()].map(n => `q${n}`).concat("D");
    const transitions = {};

    for (let i = 0; i < pattern.length; i++) {
        const state = `q${i}`;
        transitions[state] = {};

        for (const bit of ["0", "1"]) {
            const candidate = pattern.slice(0, i) + bit;
            if (candidate.endsWith(pattern)) {
                transitions[state][bit] = "D";
                continue;
            }

            // Find the longest suffix of candidate that is also a pattern prefix.
            // This handles overlapping patterns without restarting from scratch.
            let matched = 0;
            for (let k = 1; k < pattern.length; k++) {
                if (candidate.endsWith(pattern.slice(0, k))) matched = k;
            }
            transitions[state][bit] = `q${matched}`;
        }
    }

    transitions.D = { "0": "D", "1": "D" };
    return { states, transitions };
}

// Generate a readable SVG layout from the DFA transition table.
// Forward edges are straight; resets curve below; self-loops curve above.
function makePatternGraph(states, transitions, pattern) {
    const y = 146;
    const left = 64;
    const right = 596;
    const spacing = (right - left) / (states.length - 1);
    const nodes = states.map((id, index) => ({
        id,
        x: Math.round(left + index * spacing),
        y,
        captionY: -55,
        caption: id === "D" ? "DEAD" : index === 0 ? "START" : `${index}/${pattern.length}`
    }));
    const edges = [];

    for (const from of states) {
        const grouped = new Map();
        for (const bit of ["0", "1"]) {
            const to = transitions[from][bit];
            if (!grouped.has(to)) grouped.set(to, []);
            grouped.get(to).push(bit);
        }

        for (const [to, bits] of grouped) {
            const source = nodes.find(node => node.id === from);
            const target = nodes.find(node => node.id === to);
            const a = states.indexOf(from);
            const b = states.indexOf(to);
            const label = bits.join(", ");
            let d;
            let x;
            let labelY;

            if (a === b) {
                d = `M${source.x - 16} ${y - 26} C${source.x - 82} ${y - 118} ${source.x + 82} ${y - 118} ${source.x + 16} ${y - 26}`;
                x = source.x;
                labelY = y - 109;
            } else if (b > a) {
                d = `M${source.x + 31} ${y} L${target.x - 32} ${y}`;
                x = (source.x + target.x) / 2;
                labelY = y - 15;
            } else {
                const span = a - b;
                const bendY = 235 + span * 18;
                d = `M${source.x - 21} ${y + 23} Q${(source.x + target.x)/2} ${bendY} ${target.x + 21} ${y + 23}`;
                x = (source.x + target.x) / 2;
                labelY = (y + 23 + bendY) / 2 + 15;
            }

            edges.push({ from, to, symbols: bits.join(""), label, d, x, y: labelY });
        }
    }
    return { nodes, edges };
}

function addPatternBoss(id, details) {
    const { states, transitions } = makePatternDFA(details.pattern);
    BOSSES[id] = {
        ...details,
        alphabet: ["0", "1"],
        states,
        start: "q0",
        accepting: ["q0"],
        transitions,
        graph: makePatternGraph(states, transitions, details.pattern),
        targetLength: details.pattern.length
    };
}

addPatternBoss("cipher", {
    name: "The Cipher Wraith",
    subtitle: "THE THIRD TRIAL",
    rank: "RANK 03 / VETERAN",
    difficulty: "HARD",
    lore: "A spectral lock. Every incorrect bit shifts the pattern you're trying to complete.",
    mission: "Find the hidden four-bit sequence that sends the Wraith into D. Follow the diagram carefully.",
    hint: "The shortest route goes q₀ → q₁ → q₂ → q₃ → D. It starts with 1, then 0.",
    pattern: "1011"
});

addPatternBoss("echo", {
    name: "The Echo Serpent",
    subtitle: "THE FOURTH TRIAL",
    rank: "RANK 04 / ELITE",
    difficulty: "VERY HARD",
    lore: "Its overlapping loops punish careless guesses. Keep track of each partial match.",
    mission: "Find the five-bit trap. Some transitions preserve partial progress instead of resetting it.",
    hint: "The shortest solution alternates 0 and 1 for five bits, starting with 0.",
    pattern: "01010"
});

addPatternBoss("sovereign", {
    name: "The Null Sovereign",
    subtitle: "THE FINAL TRIAL",
    rank: "RANK 05 / FINAL BOSS",
    difficulty: "NIGHTMARE",
    lore: "The final automaton uses overlapping prefixes to lure you off the winning path.",
    mission: "Defeat the Sovereign with a six-bit sequence. Read every transition before committing.",
    hint: "The shortest path begins 1, 1, 0. From q₃, continue along the forward edges.",
    pattern: "110101"
});

// The first two bosses use handcrafted diagrams but share the same logic.
BOSSES.gatekeeper.targetLength = 2;
BOSSES.parity.targetLength = 3;

const $ = id => document.getElementById(id);
const refs = {
    bossPanel: $("bossPanel"), bossPortrait: $("bossPortrait"), bossRank: $("bossRank"),
    bossSubtitle: $("bossSubtitle"), bossTitle: $("bossTitle"), bossLore: $("bossLore"),
    difficulty: $("difficulty"), missionText: $("missionText"), healthText: $("healthText"),
    healthFill: $("healthFill"), attemptCount: $("attemptCount"), minLength: $("minLength"),
    bestScore: $("bestScore"), machineId: $("machineId"), graph: $("dfaGraph"),
    transitionTable: $("transitionTable"), acceptingSummary: $("acceptingSummary"),
    attackForm: $("attackForm"), attackInput: $("attackInput"), inputCount: $("inputCount"),
    inputError: $("inputError"), attackBtn: $("attackBtn"), hintBtn: $("hintBtn"),
    hintBox: $("hintBox"), resetBtn: $("resetBtn"), skipBtn: $("skipBtn"),
    battleOutput: $("battleOutput"), traceCount: $("traceCount"),
    currentStateLabel: $("currentStateLabel"),
    totalScore: $("totalScore"), clearBtn: $("clearBtn"), backspaceBtn: $("backspaceBtn"),
    levelNav: $("levelNav"), advanceNotice: $("advanceNotice"),
    rushComplete: $("rushComplete"), finalScore: $("finalScore"),
    replayRushBtn: $("replayRushBtn")
};

const STORAGE_KEY = "dead-state-hunt-five-boss-rush-v1";
function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return Object.fromEntries(Object.keys(BOSSES).map(id => {
            const entry = saved[id] || {};
            const best = Number(entry.best);
            return [id, { defeated: entry.defeated === true, best: Number.isFinite(best) && best > 0 ? Math.floor(best) : 0 }];
        }));
    } catch (_) {
        return Object.fromEntries(Object.keys(BOSSES).map(id => [id, { defeated: false, best: 0 }]));
    }
}
const progress = loadProgress();
function saveProgress() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (_) { /* local file browsers may disable storage */ } }
// Resume at the first unbeaten boss after refresh (or the final boss if finished).
let selectedBoss = BOSS_ORDER.find(id => !progress[id].defeated) || BOSS_ORDER.at(-1);
let advanceTimer = null;
let advancing = false;
let attempts = 0;
let hintUsed = false;
let encounterWon = false;
let animating = false;
let fastForward = false;
let runNumber = 0;
let waitingTimer = null;
let wakeAnimation = null;
const visitedEdges = new Set();

// Reverse-reachability: a state is dead if it cannot reach ANY accepting state.
function deadStates(machine) {
    const canReachAcceptance = new Set(machine.accepting);
    let changed = true;
    while (changed) {
        changed = false;
        for (const state of machine.states) {
            if (canReachAcceptance.has(state)) continue;
            if (machine.alphabet.some(symbol => canReachAcceptance.has(machine.transitions[state][symbol]))) {
                canReachAcceptance.add(state);
                changed = true;
            }
        }
    }
    return new Set(machine.states.filter(state => !canReachAcceptance.has(state)));
}

// BFS: finds an actual shortest attack that reaches any dead state.
function shortestWinningString(machine) {
    const dead = deadStates(machine);
    const queue = [{ state: machine.start, input: "" }];
    const seen = new Set([machine.start]);
    while (queue.length) {
        const item = queue.shift();
        if (dead.has(item.state)) return item.input;
        for (const symbol of machine.alphabet) {
            const nextState = machine.transitions[item.state][symbol];
            if (!seen.has(nextState)) {
                seen.add(nextState);
                queue.push({ state: nextState, input: item.input + symbol });
            }
        }
    }
    return null;
}

function verifyMachines() {
    for (const [id, machine] of Object.entries(BOSSES)) {
        for (const state of machine.states) {
            for (const symbol of machine.alphabet) {
                if (!machine.states.includes(machine.transitions[state]?.[symbol])) {
                    throw new Error(`Invalid DFA transition: ${id} / ${state} / ${symbol}`);
                }
            }
        }
        const answer = shortestWinningString(machine);
        if (answer === null) throw new Error(`Boss ${id} is unbeatable`);
        if (answer.length !== machine.targetLength) {
            throw new Error(`Difficulty mismatch: ${id} requires ${machine.targetLength} bits`);
        }
        const dead = deadStates(machine);
        if (dead.size !== 1 || !dead.has("D")) {
            throw new Error(`Unexpected dead-state set for ${id}`);
        }
    }
}
verifyMachines();

function prettyState(state) { return state.replace(/q([0-9])/g, (_, digit) => "q" + "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]); }
function prettySet(states) { return `{${states.map(prettyState).join(", ")}}`; }
function machine() { return BOSSES[selectedBoss]; }
// Five progress cards, always shown in the fixed Boss Rush order.
function renderLevelNav() {
    refs.levelNav.innerHTML = BOSS_ORDER.map((id, index) => {
        const m = BOSSES[id];
        return `<div class="level-tab" data-boss="${id}">
      <span class="level-num">${String(index + 1).padStart(2, "0")}</span>
      <span class="level-identity"><strong>${m.name.toUpperCase()}</strong><small>${m.states.length} states · min. ${m.targetLength} bits</small></span>
      <span class="level-outcome" id="status-${id}">LOCKED</span>
    </div>`;
    }).join("");
}

function updateScoreboard() {
    refs.totalScore.textContent = Object.values(progress)
        .reduce((sum, record) => sum + record.best, 0).toLocaleString();

    for (const id of BOSS_ORDER) {
        const beaten = progress[id].defeated;
        const active = id === selectedBoss && !beaten;
        const card = refs.levelNav.querySelector(`[data-boss="${id}"]`);
        const status = $(`status-${id}`);
        status.textContent = beaten ? "✓ DEFEATED" : active ? "IN BATTLE" : "LOCKED";
        status.classList.toggle("beaten", beaten);
        card.classList.toggle("beaten", beaten);
        card.classList.toggle("selected", active);
        card.classList.toggle("locked", !beaten && !active);
        if (active) card.setAttribute("aria-current", "step");
        else card.removeAttribute("aria-current");
    }

    refs.bestScore.textContent = progress[selectedBoss].best
        ? progress[selectedBoss].best.toLocaleString() : "—";
}

// Draw the precise DFA from its configured nodes and transitions.
function renderGraph() {
    const m = machine();
    const dead = deadStates(m);
    let markup = `<defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#7b8fa9"/></marker>
    <marker id="activeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#69ffee"/></marker>
  </defs>`;
    const startPos = m.graph.nodes.find(node => node.id === m.start);
    markup += `<path class="entry-line" d="M${startPos.x - 73} ${startPos.y} L${startPos.x - 32} ${startPos.y}"/>`;
    for (const edge of m.graph.edges) {
        markup += `<g class="dfa-edge" data-from="${edge.from}" data-symbols="${edge.symbols}">
      <path class="edge-line" d="${edge.d}"/>
      <text class="edge-label" x="${edge.x}" y="${edge.y}">${edge.label || edge.symbols}</text>
    </g>`;
    }
    for (const node of m.graph.nodes) {
        const acceptance = m.accepting.includes(node.id);
        const kind = dead.has(node.id) ? "dead" : acceptance ? "accepting" : "nonaccepting";
        markup += `<g class="state-node ${kind}${node.captionY !== undefined ? " generated" : ""}" data-state="${node.id}" transform="translate(${node.x} ${node.y})">
      <title>${prettyState(node.id)}: ${dead.has(node.id) ? "dead state" : acceptance ? "accepting state" : "nonaccepting but recoverable"}</title>
      <circle class="state-circle" r="30" />
      ${acceptance ? `<circle class="accept-ring" r="24" />` : ""}
      <text class="node-label" y="1">${prettyState(node.id)}</text>
      <text class="node-caption" y="${node.captionY ?? 66}">${node.caption}</text>
    </g>`;
    }
    refs.graph.innerHTML = markup;
    refs.graph.setAttribute("aria-label", `${m.name} DFA diagram, ${m.states.length} states, accepting states ${prettySet(m.accepting)}`);
}

function renderTable() {
    const m = machine();
    const dead = deadStates(m);
    refs.acceptingSummary.textContent = `F = ${prettySet(m.accepting)}`;
    refs.transitionTable.innerHTML = m.states.map(state => `<tr data-row="${state}" class="${dead.has(state) ? "dead-row" : ""}">
    <td>${state === m.start ? "→ " : ""}${m.accepting.includes(state) ? "★ " : ""}${prettyState(state)}</td>
    <td>${prettyState(m.transitions[state]["0"])}</td>
    <td>${prettyState(m.transitions[state]["1"])}</td>
  </tr>`).join("");
}

function highlightState(state, from = null, symbol = null) {
    refs.graph.querySelectorAll(".state-node").forEach(el => {
        el.classList.toggle("current", el.dataset.state === state);
        el.classList.toggle("visited", el.dataset.state === state);
    });
    if (from !== null && symbol !== null) visitedEdges.add(`${from}:${symbol}`);
    refs.graph.querySelectorAll(".dfa-edge").forEach(el => {
        const symbols = el.dataset.symbols;
        el.classList.toggle("visited", [...symbols].some(bit => visitedEdges.has(`${el.dataset.from}:${bit}`)));
        el.classList.toggle("active", el.dataset.from === from && symbols.includes(symbol));
    });
    refs.transitionTable.querySelectorAll("tr").forEach(row => row.classList.toggle("is-current", row.dataset.row === state));
    refs.currentStateLabel.textContent = `CURRENT STATE: ${prettyState(state)}`;
}

function outputIdle() {
    refs.battleOutput.innerHTML = `<div class="empty-output"><span class="empty-glyph">δ</span><strong>AWAITING INPUT</strong><p>Submit a string to see each state transition here.</p></div>`;
    refs.traceCount.textContent = "NO ATTACK YET";
}

function appendTrace(from, symbol, to, number) {
    const line = document.createElement("div");
    const dead = deadStates(machine());
    line.className = `trace-row ${dead.has(to) ? "dead-trace" : ""}`;
    const note = dead.has(to) ? "DEAD" : machine().accepting.includes(to) ? "ACCEPT" : "NOT DEAD";
    line.innerHTML = `<span class="trace-index">${String(number).padStart(2, "0")}</span><span class="trace-from">${prettyState(from)}</span><span>→</span><span class="trace-symbol">${symbol}</span><span>→</span><span class="trace-to">${prettyState(to)}</span><span class="trace-note">${note}</span>`;
    refs.battleOutput.appendChild(line);
    refs.battleOutput.scrollTop = refs.battleOutput.scrollHeight;
}

function appendResult(title, description, won) {
    const result = document.createElement("div");
    result.className = `result-message ${won ? "" : "fail"}`;
    const strong = document.createElement("strong");
    strong.textContent = title;
    const info = document.createElement("span");
    info.textContent = description;
    result.append(strong, info);
    refs.battleOutput.appendChild(result);
    refs.battleOutput.scrollTop = refs.battleOutput.scrollHeight;
}

function updateInputCount() { refs.inputCount.textContent = `${refs.attackInput.value.length} BITS`; }
function setInput(value) {
    refs.attackInput.value = String(value).replace(/[^01]/g, "").slice(0, 64);
    refs.inputError.textContent = "";
    updateInputCount();
}
function cancelAnimation() {
    runNumber++;
    if (advanceTimer !== null) clearTimeout(advanceTimer);
    advanceTimer = null;
    advancing = false;
    refs.advanceNotice.hidden = true;
    if (waitingTimer !== null) clearTimeout(waitingTimer);
    waitingTimer = null;
    if (wakeAnimation) { const wake = wakeAnimation; wakeAnimation = null; wake(); }
    animating = false;
    fastForward = false;
    refs.skipBtn.hidden = true;
    refs.attackBtn.disabled = false;
    refs.attackInput.disabled = false;
    refs.hintBtn.disabled = false;
    refs.resetBtn.disabled = false;
    document.querySelectorAll(".key-button").forEach(btn => btn.disabled = false);
}
function pause(ms) {
    if (fastForward) return Promise.resolve();
    return new Promise(resolve => {
        wakeAnimation = resolve;
        waitingTimer = setTimeout(() => { waitingTimer = null; wakeAnimation = null; resolve(); }, ms);
    });
}
function setAnimating(on) {
    animating = on;
    refs.skipBtn.hidden = !on;
    refs.attackBtn.disabled = on;
    refs.attackInput.disabled = on;
    refs.hintBtn.disabled = on;
    refs.resetBtn.disabled = on;
    document.querySelectorAll(".key-button").forEach(btn => btn.disabled = on);
}

function resetEncounter() {
    cancelAnimation();
    attempts = 0;
    hintUsed = false;
    encounterWon = false;
    visitedEdges.clear();
    refs.attemptCount.textContent = "0";
    refs.healthText.textContent = "100 / 100";
    refs.healthFill.style.width = "100%";
    refs.bossPanel.classList.remove("defeated", "hit");
    refs.hintBox.hidden = true;

    refs.inputError.textContent = "";
    refs.attackInput.value = "";
    updateInputCount();
    outputIdle();
    highlightState(machine().start);
    updateScoreboard();
}

function selectBoss(id) {
    if (!(id in BOSSES)) return;
    cancelAnimation();
    selectedBoss = id;
    const m = machine();
    for (const element of [refs.bossPanel, refs.bossPortrait]) {
        element.classList.remove("parity", "cipher", "echo", "sovereign");
        if (id !== "gatekeeper") element.classList.add(id);
    }
    refs.bossRank.textContent = m.rank;
    refs.bossSubtitle.textContent = m.subtitle;
    refs.bossTitle.textContent = m.name;
    refs.bossLore.textContent = m.lore;
    refs.difficulty.textContent = m.difficulty;
    refs.missionText.textContent = m.mission;
    const stageIndex = BOSS_ORDER.indexOf(id);
    refs.machineId.textContent = `M${"₀₁₂₃₄₅₆₇₈₉"[stageIndex + 1]} = (Q, {0,1}, δ, q₀, F)`;
    refs.minLength.textContent = `${shortestWinningString(m).length} bits`;
    renderGraph();
    renderTable();
    resetEncounter();
}

async function executeAttack(event) {
    if (event) event.preventDefault();
    if (animating) return;
    const input = refs.attackInput.value;
    if (!/^[01]*$/.test(input)) {
        refs.inputError.textContent = "Only 0 and 1 are valid symbols.";
        return;
    }
    const m = machine();
    const dead = deadStates(m);
    const shortest = shortestWinningString(m);
    if (shortest === null) return;
    const thisRun = ++runNumber;
    attempts++;
    encounterWon = false;
    refs.attemptCount.textContent = String(attempts);
    refs.bossPanel.classList.remove("defeated", "hit");
    refs.healthText.textContent = "100 / 100";
    refs.healthFill.style.width = "100%";
    refs.inputError.textContent = "";
    refs.battleOutput.innerHTML = "";
    refs.traceCount.textContent = `${input.length} SYMBOL${input.length === 1 ? "" : "S"} LOADED`;
    visitedEdges.clear();
    highlightState(m.start);
    setAnimating(true);

    let current = m.start;
    if (input === "") {
        appendResult("EMPTY STRING ε", `The automaton stays in ${prettyState(current)}.`, false);
        await pause(400);
    }

    for (let index = 0; index < input.length; index++) {
        if (thisRun !== runNumber) return;
        const symbol = input[index];
        const from = current;
        current = m.transitions[from][symbol];
        highlightState(current, from, symbol);
        appendTrace(from, symbol, current, index + 1);
        refs.traceCount.textContent = `${index + 1} / ${input.length} EXECUTED`;
        await pause(540);
    }
    if (thisRun !== runNumber) return;
    setAnimating(false);
    refs.skipBtn.hidden = true;
    fastForward = false;

    const won = dead.has(current);
    if (won) {
        encounterWon = true;
        refs.bossPanel.classList.add("hit");
        refs.bossPanel.classList.add("defeated");
        refs.healthText.textContent = "0 / 100";
        refs.healthFill.style.width = "0%";
        // Accuracy, failed attacks, and hint usage influence the score.
        const extra = input.length - shortest.length;
        const earned = Math.max(150, 1000 - extra * 80 - (attempts - 1) * 45 - (hintUsed ? 140 : 0));
        const optimal = extra === 0;
        progress[selectedBoss].defeated = true;
        progress[selectedBoss].best = Math.max(progress[selectedBoss].best, earned);
        saveProgress();
        updateScoreboard();
        appendResult("☠ BOSS DEFEATED!", `${optimal ? "Perfect — shortest possible attack. " : `Victory! The shortest attack has ${shortest.length} bits. `}+${earned} points. Final state ${prettyState(current)} is dead.`, true);
        scheduleNextBoss();
    } else if (m.accepting.includes(current)) {
        appendResult("ATTACK FAILED — ACCEPTING STATE", `${prettyState(current)} is accepting, so the boss survives. Try a different binary string.`, false);
    } else {
        appendResult("ATTACK FAILED — NOT DEAD", `${prettyState(current)} is nonaccepting, but there is still a path to an accepting state. Keep searching.`, false);
    }
}

// A victory automatically starts the next encounter. The player never
// needs to click a Next Boss button, and locked bosses cannot be skipped.
function scheduleNextBoss() {
    const finishedBoss = selectedBoss;
    const nextId = BOSS_ORDER[BOSS_ORDER.indexOf(finishedBoss) + 1];
    const upcoming = nextId ? BOSSES[nextId].name : "Rush complete";

    advancing = true;
    setAnimating(true); // freeze input during the victory scene
    refs.skipBtn.hidden = true;
    refs.advanceNotice.textContent = nextId
        ? `✓ ${machine().name} defeated! ${upcoming} approaches...`
        : "✓ FINAL BOSS DEFEATED! Preparing your victory screen...";
    refs.advanceNotice.hidden = false;

    advanceTimer = setTimeout(() => {
        advanceTimer = null;
        if (selectedBoss !== finishedBoss) return;
        advancing = false;
        refs.advanceNotice.hidden = true;

        if (nextId) {
            selectBoss(nextId);
            refs.attackInput.focus({ preventScroll: true });
            document.querySelector(".level-nav").scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            showRushComplete();
        }
    }, ADVANCE_DELAY_MS);
}

function showRushComplete() {
    refs.finalScore.textContent = Object.values(progress)
        .reduce((sum, item) => sum + item.best, 0).toLocaleString();
    refs.rushComplete.hidden = false;
    refs.replayRushBtn.focus({ preventScroll: true });
}

function restartRush() {
    // Keep personal best scores, but replay all five encounters in order.
    for (const id of BOSS_ORDER) progress[id].defeated = false;
    saveProgress();
    refs.rushComplete.hidden = true;
    selectBoss(BOSS_ORDER[0]);
    document.querySelector(".level-nav").scrollIntoView({ behavior: "smooth", block: "start" });
    refs.attackInput.focus({ preventScroll: true });
}

// UI actions
refs.attackForm.addEventListener("submit", executeAttack);
document.querySelectorAll("[data-bit]").forEach(btn => btn.addEventListener("click", () => {
    if (animating) return;
    setInput(refs.attackInput.value + btn.dataset.bit);
    refs.attackInput.focus();
}));
refs.backspaceBtn.addEventListener("click", () => { if (!animating) setInput(refs.attackInput.value.slice(0, -1)); });
refs.clearBtn.addEventListener("click", () => { if (!animating) { setInput(""); refs.attackInput.focus(); } });
refs.attackInput.addEventListener("input", () => {
    const raw = refs.attackInput.value;
    const clean = raw.replace(/[^01]/g, "").slice(0, 64);
    refs.attackInput.value = clean;
    refs.inputError.textContent = raw === clean ? "" : "Only 0 and 1 are valid symbols.";
    updateInputCount();
});
refs.hintBtn.addEventListener("click", () => {
    hintUsed = true;
    refs.hintBox.textContent = machine().hint;
    refs.hintBox.hidden = !refs.hintBox.hidden;
});
refs.resetBtn.addEventListener("click", () => { resetEncounter(); refs.attackInput.focus(); });
refs.replayRushBtn.addEventListener("click", restartRush);
refs.skipBtn.addEventListener("click", () => {
    fastForward = true;
    if (waitingTimer !== null) clearTimeout(waitingTimer);
    waitingTimer = null;
    if (wakeAnimation) { const wake = wakeAnimation; wakeAnimation = null; wake(); }
});

window.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey || animating) return;
    const tag = event.target?.tagName;
    if (["INPUT", "TEXTAREA"].includes(tag) || event.target?.isContentEditable) return;
    if (event.key === "0" || event.key === "1") {
        event.preventDefault();
        setInput(refs.attackInput.value + event.key);
    } else if (event.key === "Backspace") {
        event.preventDefault();
        setInput(refs.attackInput.value.slice(0, -1));
    }
});

// Useful for automated verification.
window.DeadStateHunt = { BOSSES, BOSS_ORDER, deadStates, shortestWinningString, makePatternDFA };
renderLevelNav();
selectBoss(selectedBoss);
if (BOSS_ORDER.every(id => progress[id].defeated)) showRushComplete();
