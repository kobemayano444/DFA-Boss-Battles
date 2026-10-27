"use strict";

// Each boss is a COMPLETE DFA: one transition for each (state, symbol).
// These are data definitions, not hardcoded answers to the puzzle.
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
    currentStateLabel: $("currentStateLabel"), nextBossBtn: $("nextBossBtn"),
    totalScore: $("totalScore"), clearBtn: $("clearBtn"), backspaceBtn: $("backspaceBtn")
};

const STORAGE_KEY = "dead-state-hunt-v1";
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
let selectedBoss = "gatekeeper";
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
    }
}
verifyMachines();

function prettyState(state) { return state.replace(/q([0-9])/g, (_, digit) => "q" + "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]); }
function prettySet(states) { return `{${states.map(prettyState).join(", ")}}`; }
function machine() { return BOSSES[selectedBoss]; }
function updateScoreboard() {
    refs.totalScore.textContent = Object.values(progress).reduce((sum, record) => sum + record.best, 0).toLocaleString();
    for (const id of Object.keys(BOSSES)) {
        const status = $(`status-${id}`);
        status.textContent = progress[id].defeated ? "✓ DEFEATED" : "UNDEFEATED";
        status.classList.toggle("beaten", progress[id].defeated);
    }
    refs.bestScore.textContent = progress[selectedBoss].best ? progress[selectedBoss].best.toLocaleString() : "—";
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
        markup += `<g class="state-node ${kind}" data-state="${node.id}" transform="translate(${node.x} ${node.y})">
      <title>${prettyState(node.id)}: ${dead.has(node.id) ? "dead state" : acceptance ? "accepting state" : "nonaccepting but recoverable"}</title>
      <circle class="state-circle" r="30" />
      ${acceptance ? `<circle class="accept-ring" r="24" />` : ""}
      <text class="node-label" y="1">${prettyState(node.id)}</text>
      <text class="node-caption" y="66">${node.caption}</text>
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
    refs.nextBossBtn.hidden = true;
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
    refs.bossPanel.classList.toggle("parity", id === "parity");
    refs.bossPortrait.classList.toggle("parity", id === "parity");
    refs.bossRank.textContent = m.rank;
    refs.bossSubtitle.textContent = m.subtitle;
    refs.bossTitle.textContent = m.name;
    refs.bossLore.textContent = m.lore;
    refs.difficulty.textContent = m.difficulty;
    refs.missionText.textContent = m.mission;
    refs.machineId.textContent = `${id === "gatekeeper" ? "M₁" : "M₂"} = (Q, {0,1}, δ, q₀, F)`;
    refs.minLength.textContent = `${shortestWinningString(m).length} bits`;
    document.querySelectorAll(".level-tab").forEach(btn => {
        const selected = btn.dataset.boss === id;
        btn.classList.toggle("selected", selected);
        btn.setAttribute("aria-pressed", String(selected));
    });
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
        if (selectedBoss === "gatekeeper") refs.nextBossBtn.hidden = false;
    } else if (m.accepting.includes(current)) {
        appendResult("ATTACK FAILED — ACCEPTING STATE", `${prettyState(current)} is accepting, so the boss survives. Try a different binary string.`, false);
    } else {
        appendResult("ATTACK FAILED — NOT DEAD", `${prettyState(current)} is nonaccepting, but there is still a path to an accepting state. Keep searching.`, false);
    }
}

// UI actions
refs.attackForm.addEventListener("submit", executeAttack);
document.querySelectorAll("[data-boss]").forEach(btn => btn.addEventListener("click", () => selectBoss(btn.dataset.boss)));
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
refs.nextBossBtn.addEventListener("click", () => { selectBoss("parity"); document.querySelector(".level-nav").scrollIntoView({ behavior: "smooth", block: "start" }); });
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

window.DeadStateHunt = { BOSSES, deadStates, shortestWinningString };
selectBoss("gatekeeper");
