DEAD STATE HUNT - CS 6041 DFA Boss Battle
========================================

GET STARTED
1. Keep index.html, style.css, and script.js in the same folder.
2. Double-click index.html to play in any modern browser.
3. No npm, dependencies, or internet connection are required.

CONTROLS
- Click Boss 1 or Boss 2 at the top to switch fights.
- Type a binary string (0s and 1s) or use the onscreen 0/1 buttons.
- Press Enter or click EXECUTE ATTACK.
- Click SKIP ANIMATION to jump through a long trace.
- Empty input means epsilon (the empty string), which is a valid DFA input.
- Request Hint gives a clue (with a points penalty on a winning attempt).
- Reset Boss resets your encounter, but your best scores remain stored locally.

THEORY
- A state is dead iff NO accepting state can be reached from it on any string.
- A nonaccepting state can still be recoverable.
- The app computes the dead-state set with reverse-reachability.
- The app computes a shortest winning string using breadth-first search (BFS).
- Boss 1 shortest win: 00, length 2.
- Boss 2 shortest win: 110, length 3.
- All transitions are defined in the BOSSES object in script.js.

SCORING
1000 - 80*(extra bits) - 45*(earlier failed attempts) - 140*(if hint used)
(minimum winning score 150)
Best boss scores are recorded using localStorage when supported.

MAINTENANCE
Edit the BOSSES object at the top of script.js to configure more levels.
Add node layout positions and SVG edge curves under each boss's graph field.
