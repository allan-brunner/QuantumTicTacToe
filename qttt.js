const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],    // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],    // Columns
    [0, 4, 8], [2, 4, 6]                // Diagonals
];

// Data representation
const gameState = {
    currentMoveNb: 1,
    currentPlayer: 'X',

    gameMode: 'multiplayer',

    selectedCells: [],

    boardState: Array(9).fill(null).map(() => ({
        collapsed: null,
        quantumMoves: [],
        originMoveNumber: null
    })),

    winningLine: null,

    isCollapsePhase: false,
    hasEntanglements: false,
}

// UI Renderer
function renderBoard() {
    const boardEl = document.getElementById('board');
    const cellElements = document.querySelectorAll('.cell');

    if (gameState.isCollapsePhase) {
        boardEl.classList.add('collapsing-mode');
    } else {
        boardEl.classList.remove('collapsing-mode');
    }

    cellElements.forEach((cellEl, index) => {
        const cellData = gameState.boardState[index];
        const classicalEl = cellEl.querySelector('.classical');
        const quantumEl = cellEl.querySelector('.quantum-grid');

        // Reset classes from previous renders
        cellEl.classList.remove('collapsed', 'selected', 'in-cycle', 'winner-cell');
        classicalEl.classList.remove('X', 'O');

        if (gameState.winningLine && gameState.winningLine.includes(index)) {
            cellEl.classList.add('winner-cell');
        }

        if (gameState.isCollapsePhase && gameState.activeCycle) {
            const isCellInCycle = gameState.activeCycle.some(step => step.node === index);
            if (isCellInCycle) {
                cellEl.classList.add('in-cycle');
            }
        }

        if (cellData.collapsed) {
            // Classical State
            cellEl.classList.add('collapsed');
            classicalEl.textContent = cellData.collapsed;
            classicalEl.classList.add(cellData.collapsed);
        } else {
            // Quantum State
            classicalEl.textContent = '';

            quantumEl.innerHTML = cellData.quantumMoves
                .map(move => {
                    const player = move[0];
                    const subscript = move.slice(1);

                    return `<span class="q-mark ${player}">${player}<sub>${subscript}</sub></span>`;
                })
                .join('');
        }
    });
}

function updateStatusLine() {
    const statusLineEl = document.getElementById('status-line');
    statusLineEl.classList.remove('X', 'O');

    statusLineEl.innerText = `Player ${gameState.currentPlayer}'s turn (Select ${2 - gameState.selectedCells.length} cell${gameState.selectedCells.length < 1 ? 's' : ''})`;
    statusLineEl.classList.add(gameState.currentPlayer);
}

function updateSidebarHighlights() {
    const superpositionSec = document.getElementById('superposition');
    const entanglementSec = document.getElementById('entanglement');
    const collapseSec = document.getElementById('collapse');

    // Clear existing highlights
    [superpositionSec, entanglementSec, collapseSec].forEach(el => el.classList.remove('active-science'));

    if (gameState.isCollapsePhase) {
        collapseSec.classList.add('active-science');
    } else if (gameState.hasEntanglements) {
        entanglementSec.classList.add('active-science');
    } else {
        superpositionSec.classList.add('active-science');
    }
}

function advancePlayerTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    gameState.currentMoveNb++;

    updateStatusLine();
}

function handleCellClick(index, cellEl) {
    if (gameState.isGameOver) return;

    if (gameState.isOPlayerABot && gameState.currentPlayer === 'O') return;

    if (gameState.isCollapsePhase) {
        const isCellInCycle = gameState.activeCycle.some(step => step.node === index);
        if (!isCellInCycle) return;

        resolveCollapse(index);
        return;
    }

    const targetCell = gameState.boardState[index];

    // Rule 1: Can't click a cell that has already collapsed classical
    if (targetCell.collapsed) return;

    // Rule 2: Can't click the exact same cell twice in one turn
    if (gameState.selectedCells.includes(index)) {
        // Deselect the cell
        gameState.selectedCells = [];
        cellEl.classList.remove('selected');

        updateStatusLine();
        return;
    }

    gameState.selectedCells.push(index);

    if (gameState.selectedCells.length === 1) {
        // Visual indicator
        cellEl.classList.add('selected');
    } else {
        const moveLabel = `${gameState.currentPlayer}${gameState.currentMoveNb}`;

        // Push the move into both cells
        gameState.selectedCells.forEach(cell => gameState.boardState[cell].quantumMoves.push(moveLabel));
        for (cell in gameState.selectedCells) {
            if (gameState.boardState[cell].quantumMoves.length > 1) {
                gameState.hasEntanglements = true;
                updateSidebarHighlights();
                break;
            }
        }

        // Cleanup selection
        gameState.selectedCells = [];

        const detectedCycle = findCycle();

        if (detectedCycle) {
            gameState.isCollapsePhase = true;
            updateSidebarHighlights();

            const decider = gameState.currentPlayer === 'X' ? 'O' : 'X';
            const statusLineEl = document.getElementById('status-line');
            statusLineEl.classList.remove('X', 'O');
            document.getElementById('status-line').textContent =
                `Loop formed! Player ${decider}, click an entangled cell to collapsed reality`;
            statusLineEl.classList.add(decider);

            gameState.activeCycle = detectedCycle;
            renderBoard();
            return;
        }

        advancePlayerTurn();
        checkAndResolveLastCell();
        renderBoard();

        if (!gameState.isGameOver && gameState.gameMode === 'bot' && gameState.currentPlayer === 'O' && !gameState.isCollapsePhase) {
            setTimeout(() => {
                makeBotMove();
            }, 500);
        }
    }

    updateStatusLine();
}

function buildAdjacencyList() {
    // Array of 9 empty array for each cell
    const adjList = Array(9).fill(null).map(() => []);

    gameState.boardState.forEach((cell, cellIndex) => {
        // Collapsed cells are out of the quantum graph
        if (cell.collapsed) return;

        cell.quantumMoves.forEach(moveLabel => {
            // Find the companion cell for the quantum move
            const companionIndex = gameState.boardState.findIndex((c, idx) =>
                idx !== cellIndex && c.quantumMoves.includes(moveLabel)
            );

            // If companion is found and not recorded yet
            if (companionIndex !== -1) {
                adjList[cellIndex].push({
                    node: companionIndex,
                    move: moveLabel
                });
            }
        });
    });

    return adjList;
}

function findCycle() {
    const adjList = buildAdjacencyList();
    const visited = new Set();

    function dfs(currentNode, parentNode, incomingMove, path) {
        visited.add(currentNode);
        path.push({ node: currentNode, move: incomingMove });

        for (let neighbor of adjList[currentNode]) {
            // Don't immediatly walk backward along the exact same quantum move
            if (neighbor.move === incomingMove) continue;

            // If an already visited node is hit => cycle
            if (visited.has(neighbor.node)) {
                // Trace back the path to extract only the nodes involved in the loop
                const cycleStartIndex = path.findIndex(p => p.node === neighbor.node);
                const cyclePath = path.slice(cycleStartIndex);
                // Add the closing edge details
                cyclePath.push({ node: neighbor.node, move: neighbor.move });
                return cyclePath;
            }

            // Continue searching down the branch
            const result = dfs(neighbor.node, currentNode, neighbor.move, path);
            if (result) return result;
        }

        path.pop();
        return null;
    }

    for (let i = 0; i < 9; i++) {
        if (!visited.has(i) && adjList[i].length > 0) {
            const cycle = dfs(i, null, null, []);
            // Only return first cycle
            if (cycle) return cycle;
        }
    }

    return null;
}

function resolveCollapse(startingCellIndex) {
    const cycleCellIndices = gameState.activeCycle.map(step => step.node);
    const usedMoves = gameState.activeCycle.map(step => step.move).filter(Boolean);

    const resolutions = {};


    // Recursive helper to force a domino effect through the cycle
    function propagateCollapse(cellIndex, forcedMove) {
        const playerChar = forcedMove[0];
        resolutions[cellIndex] = playerChar;

        const companionIndex = gameState.boardState.findIndex((c, idx) =>
            idx !== cellIndex && c.quantumMoves.includes(forcedMove)
        );

        // if the companion cell is part of our cycle and hasn't been resolved yet
        if (companionIndex !== -1 && cycleCellIndices.includes(companionIndex) && !resolutions.hasOwnProperty(companionIndex)) {
            // Find the other quantum move inside that companion cell which belongs to the cycle
            const companionCellData = gameState.boardState[companionIndex];
            const nextMove = companionCellData.quantumMoves.find(move =>
                move !== forcedMove && usedMoves.includes(move)
            );

            // If there is another entangled link, keep pushing the dominoes down the line
            if (nextMove) {
                propagateCollapse(companionIndex, nextMove);
            }
        }
    }

    // Kickstart the chain reaction using the cell the player clicked
    const clickedCellData = gameState.boardState[startingCellIndex];
    // Take the first move available in the cell that belongs to the cycle
    const initialMove = clickedCellData.quantumMoves.find(move => usedMoves.includes(move));

    if (!initialMove) return;

    // Run the recursive chain
    propagateCollapse(startingCellIndex, initialMove);

    // Apply the calculated classical resolution to the real board state
    Object.keys(resolutions).forEach(cellIdx => {
        const idx = parseInt(cellIdx, 10);
        gameState.boardState[idx].collapsed = resolutions[idx];
        // Evaporate the quantum state
        gameState.boardState[idx].quantumMoves = [];

        const resolvingMove = gameState.activeCycle.find(step => step.node === idx)?.move;
        if (resolvingMove) {
            gameState.boardState[idx].originMoveNumber = parseInt(resolvingMove.slice(1), 10);
        }
    });

    gameState.boardState.forEach(cell => {
        if (!cell.collapsed) {
            cell.quantumMoves = cell.quantumMoves.filter(move => !usedMoves.includes(move));
        }
    });

    gameState.isCollapsePhase = false;
    gameState.activeCycle = null;
    gameState.hasEntanglements = gameState.boardState.some(cell => cell.quantumMoves.length > 1);
    updateSidebarHighlights();

    checkWinCondition();

    if (!gameState.isGameOver) {
        advancePlayerTurn();

        checkAndResolveLastCell();

        if (gameState.gameMode === 'bot' && gameState.currentPlayer === 'O' && !gameState.isGameOver) {
            setTimeout(() => {
                makeBotMove();
            }, 500);
        }
    }
    renderBoard();
}

function checkWinCondition() {
    let xWins = [];
    let oWins = [];

    // Scan the board for any classical 3-in-a-rows
    WINNING_COMBOS.forEach(combo => {
        const [a, b, c] = combo;
        const cellA = gameState.boardState[a].collapsed;
        const cellB = gameState.boardState[b].collapsed;
        const cellC = gameState.boardState[c].collapsed;

        if (cellA && cellA === cellB && cellA === cellC) {
            const maxSubscript = calculateLineAge(combo, cellA);

            const winObject = { combo, maxSubscript };
            if (cellA === 'X') xWins.push(winObject);
            if (cellA === 'O') oWins.push(winObject);
        }
    });

    // Evaluate the results
    if (xWins.length > 0 && oWins.length > 0) {
        // Simultaneous win: find the lowest max-subscript between both players
        const minX = Math.min(...xWins.map(w => w.maxSubscript));
        const minO = Math.min(...oWins.map(w => w.maxSubscript));

        if (minX < minO) {
            const winningObject = xWins.find(w => w.maxSubscript === minX);
            gameState.winningLine = winningObject.combo;
            return declareWinner('X', minX, minO);
        }
        if (minO < minX) {
            const winningObject = oWins.find(w => w.maxSubscript === minO);
            gameState.winningLine = winningObject.combo;
            return declareWinner('O', minX, minO);
        }

        gameState.winningLine = [...xWins[0].combo, ...oWins[0].combo];
        return declareWinner('Tie', minX, minO);
    }

    if (xWins.length > 0) {
        gameState.winningLine = xWins[0].combo;
        return declareWinner('X');
    }
    if (oWins.length > 0) {
        gameState.winningLine = oWins[0].combo;
        return declareWinner('O');
    }

    const isBoardFull = gameState.boardState.every(cell => cell.collapsed !== null);
    if (isBoardFull) return declareWinner('Tie');

    return null;
}

// Helper to determine the highest move subscript that contributed to a classical cell
function calculateLineAge(combo) {
    const [a, b, c] = combo;
    const ageA = gameState.boardState[a].originMoveNumber || 0;
    const ageB = gameState.boardState[b].originMoveNumber || 0;
    const ageC = gameState.boardState[c].originMoveNumber || 0;

    // The maximum subscript in this line dictates its completion time
    return Math.max(ageA, ageB, ageC);
}

function declareWinner(winner, xAge = null, oAge = null) {
    gameState.isGameOver = true;
    const statusEl = document.getElementById('status-line');
    const tiebreakerEl = document.getElementById('tiebreaker-line');

    if (winner === 'Tie') {
        statusEl.textContent = "✨ Quantum Decoherence! It's a Draw! ✨";
        statusEl.style.color = "#eeeeee";

        if (xAge && oAge) {
            tiebreakerEl.textContent = `Both players completed lines simultaneously on Move ${xAge}. Perfect historical tie!`;
        }
    } else {
        statusEl.textContent = `🎉 Player ${winner} Wins the Match! 🎉`;
        statusEl.style.color = winner === 'X' ? '#00adb5' : '#ff5722';

        if (xAge !== null && oAge !== null) {
            tiebreakerEl.innerHTML = `
        <strong>Simultaneous Win Tie-Breaker:</strong><br>
        Player X's line was completed at move <strong>${xAge}</strong>.<br>
        Player O's line was completed at move <strong>${oAge}</strong>.<br>
        <em>Player ${winner} wins because their chain was locked into history earlier!</em>
      `;
        }
    }
}

function checkAndResolveLastCell() {
    // Count how many cells are still open
    const openCells = [];
    gameState.boardState.forEach((cell, idx) => {
        if (!cell.collapsed) openCells.push(idx);
    });

    // If there is exactly 1 open cell left, it cannot support a 2-cell quantum move
    if (openCells.length === 1) {
        const lastCellIdx = openCells[0];
        const lastCell = gameState.boardState[lastCellIdx];

        if (lastCell.quantumMoves.length > 0) {
            // Find the oldest move that was placed in this cell
            let oldestMove = lastCell.quantumMoves[0];
            let lowestSubscript = parseInt(oldestMove.slice(1), 10);

            lastCell.quantumMoves.forEach(move => {
                const sub = parseInt(move.slice(1), 10);
                if (sub < lowestSubscript) {
                    lowestSubscript = sub;
                    oldestMove = move;
                }
            });

            const finalPlayer = oldestMove[0];
            lastCell.collapsed = finalPlayer;
            lastCell.originMoveNumber = lowestSubscript;
            lastCell.quantumMoves = [];

            console.log(`Last cell automated: Cell ${lastCellIdx} collapsed to ${finalPlayer} via move ${oldestMove}`);
        } else {
            // If the last cell is completely empty, resolve the win to the current player
            lastCell.collapsed = gameState.currentPlayer;
            lastCell.originMoveNumber = gameState.currentMoveNb;
        }

        checkWinCondition();
        renderBoard();
    }
}

function makeBotMove() {
    if (gameState.isGameOver || gameState.isCollapsePhase) return;

    const validCells = [];
    gameState.boardState.forEach((cell, idx) => {
        if (!cell.collapsed) validCells.push(idx);
    });

    if (validCells.length < 2) return;

    let bestPair = null;
    let highestScore = -Infinity;

    // Evaluate every possible pair of available cells
    for (let i = 0; i < validCells.length; i++) {
        for (let j = i + 1; j < validCells.length; j++) {
            const cell1 = validCells[i];
            const cell2 = validCells[j];

            let score = scoreQuantumPair(cell1, cell2);

            // Add a tiny bit of randomness so the bot doesn't play identically every game
            score += Math.random() * 0.35;

            if (score > highestScore) {
                highestScore = score;
                bestPair = [cell1, cell2];
            }
        }
    }

    if (bestPair) {
        const moveLabel = `${gameState.currentPlayer}${gameState.currentMoveNb}`;

        bestPair.forEach(cell => gameState.boardState[cell].quantumMoves.push(moveLabel));
        advancePlayerTurn();

        // Check if the bot's move closed a loop
        const detectedCycle = findCycle();
        if (detectedCycle) {
            gameState.isCollapsePhase = true;
            gameState.activeCycle = detectedCycle;

            // Since the bot caused the loop, the human player gets to choose how to collapse it!
            document.getElementById('status-line').textContent =
                `The bot formed a loop! Click an entangled cell to collapse reality.`;

            renderBoard();
            return;
        }

        checkAndResolveLastCell();
        renderBoard();
    }
}

function scoreQuantumPair(c1, c2) {
    let score = 0;

    // Heuristic: Bias toward the center (Cell 4) and corners (0, 2, 6, 8)
    const strategicCells = [4, 0, 2, 6, 8];
    if (strategicCells.includes(c1)) score += 1;
    if (strategicCells.includes(c2)) score += 1;

    // Heuristic: Check classic lines for block/win opportunities
    WINNING_COMBOS.forEach(combo => {
        const values = combo.map(idx => {
            if (idx === c1 || idx === c2) return 'potential';
            return gameState.boardState[idx].collapsed;
        });

        const oCount = values.filter(v => v === 'O').length;
        const xCount = values.filter(v => v === 'X').length;
        const potentialCount = values.filter(v => v === 'potential').length;

        if (gameState.currentPlayer === 'O') {
            if (xCount === 2 && potentialCount === 1) score += 100; // Block Player X from winning
            if (oCount === 2 && potentialCount === 1) score += 50;  // Push for own victory line
        } else {
            if (oCount === 2 && potentialCount === 1) score += 100; // Block Player O from winning
            if (xCount === 2 && potentialCount === 1) score += 50;  // Push for own victory line
        }
    });

    return score;
}

function resetBoard() {
    gameState.boardState = Array(9).fill(null).map(() => ({ collapsed: null, quantumMoves: [], originMoveNumber: null }));
    gameState.currentPlayer = 'X';
    gameState.currentMoveNb = 1;
    gameState.selectedCells = [];
    gameState.hasEntanglements = false;
    gameState.isCollapsePhase = false;
    gameState.activeCycle = null;
    gameState.isGameOver = false;
    gameState.winningLine = null;

    document.getElementById('tiebreaker-line').textContent = "";

    updateStatusLine();
    renderBoard();
    updateSidebarHighlights();
}

document.getElementById('board').addEventListener('click', (event) => {
    // Find the closest parent cell element that was clicked
    const cellEl = event.target.closest('.cell');
    if (!cellEl) return; // Clicked outside a cell

    const cellIndex = parseInt(cellEl.dataset.index, 10);
    handleCellClick(cellIndex, cellEl);
});

document.getElementById('mode-btn').addEventListener('click', (event) => {
    const btn = event.target;

    if (gameState.gameMode === 'multiplayer') {
        gameState.gameMode = 'bot';
        btn.textContent = "Mode: Vs Bot (AI)";
        btn.classList.remove('multiplayer');
        btn.classList.add('vs-bot');
    } else {
        gameState.gameMode = 'multiplayer';
        btn.textContent = "Mode: 2 Players";
        btn.classList.remove('vs-bot');
        btn.classList.add('multiplayer');
    }

    document.getElementById('reset-btn').click();
});

updateStatusLine();
renderBoard();
updateSidebarHighlights();