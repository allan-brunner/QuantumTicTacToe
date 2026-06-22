# Quantum Tic-Tac-Toe

A complete, interactive web implementation of **Quantum Tic-Tac-Toe**. This game introduces the concepts of quantum superposition, entanglement, and wave-function collapse into the classic framework of Tic-Tac-Toe, eliminating draws and introducing deep mathematical strategy.

Built entirely from scratch using vanilla JavaScript, semantic HTML5, and responsive CSS3. Includes both a **Local 2-Player** mode and a **Heuristic AI Bot** opponent.

---

## 🌌 The Quantum Rules

Traditional Tic-Tac-Toe heavily favors the first player and almost always results in a draw between experienced players. Quantum Tic-Tac-Toe fixes this by allowing moves to exist in a state of **superposition**.

### 1. Superposition & Entanglement

* On your turn, you do not place a solid piece. Instead, you select **two different cells**.
* Your move is split into two halves (e.g., $X_1$ appears in both chosen cells).
* These cells are now **entangled**. They do not belong to either player completely; they hold a probabilistic share of reality.

### 2. Cyclical Paradoxes (Loops)

* As players continue to link cells together, an **undirected graph network** forms across the board.
* The moment a player places a move that links back to an already entangled chain, a **loop (cycle)** is formed.
* This represents a quantum paradox that the universe must resolve.

### 3. Wave-Function Collapse

* When a loop is detected, the game pauses into the **Collapse Phase**.
* **The Rule of Measurement:** The player who *did not* cause the loop gets to choose how reality collapses.
* The decider clicks any cell inside the highlighted purple loop. This forces that cell to pick a single definitive state, triggering a deterministic **domino effect** that cascades down the chain, collapsing every entangled cell in the cycle simultaneously into solid classical `X` or `O` pieces.
* Any remaining "ghost" halves of those moves existing in cells outside the loop instantly evaporate.

### 4. The Match Timeline Tie-Breaker (Max-Subscript Rule)

Because a major wave-function collapse can resolve multiple cells simultaneously, **both players can get a 3-in-a-row at the exact same moment**.

* The engine looks back through the timeline of the match to check the move numbers (subscripts) of the winning lines.
* The player whose winning line has the **lowest maximum move subscript** wins.
* *Why?* Because they mathematically established their winning chain earlier in history, overriding the tie.

---

## 🛠️ Features

* **Dual Game Modes:** Toggle seamlessly between local **2-Player Mode** (pass-and-play) and **Vs Bot Mode** using a dynamic visual switch.
* **Heuristic AI Opponent:** A custom algorithmic bot that evaluates the board in real-time. It prioritizes blocking opponent wins, completing its own lines, and avoiding bad self-entanglements.
* **Deterministic Collapse Engine:** An index-based path tracker that walks cyclical graphs to perfectly resolve complex multi-move entanglements.
* **Automatic Degeneracy Resolution:** If the board gets restricted to exactly one remaining uncollapsed square, the engine automatically auto-collapses it based on historical move age to prevent game-breaking softlocks.
* **UX Transparency:** Shows a green border overlay highlighting the winning line, along with an implicit text breakdown explaining the historical tie-breaker math if a simultaneous win occurs.

---

## 📂 Project Architecture

The codebase is built around a decoupled **State-to-UI Architecture**, ensuring that the physics engine is completely independent of the visual layout.

```
├── index.html       # Game grid layout, control buttons, and educational sidebar
├── style.css        # Cyberpunk neon layout styling, grid transitions, and active phase overlays
└── qttt.js          # Core engine: Graph DFS, collapse cascade, AI, and win validation

```

### Core Engine States (`qttt.js`)

* `findCycle()`: Uses a Depth-First Search (DFS) algorithm to constantly map cell relationships and isolate circular paths.
* `resolveCollapse()`: Iterates down the pre-calculated graph path to force state resolutions without breaking loose data strings.
* `scoreQuantumPair()`: The heuristic matrix responsible for grading bot positioning strategy.

---

## 🚀 Getting Started

No compilers, bundles, or servers are required. The game runs locally directly inside any modern web browser.

1. Clone or download this repository to your local machine.
2. Open the `index.html` file in your favorite web browser (Chrome, Firefox, Safari, Edge).
3. Select your mode and start entangling particles!

---

## 📝 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.