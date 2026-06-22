// Data representation
const gameState = {
    currentMoveNb: 3,
    currentPlayer: 'X',

    selectedCells: [5],

    boardState: [
        { collapsed: null, quantumMoves: ['X1', 'O2'] },
        { collapsed: 'X', quantumMoves: [] },
        { collapsed: 'O', quantumMoves: [] },
        { collapsed: null, quantumMoves: ['O2'] },
        { collapsed: null, quantumMoves: [] },
        { collapsed: null, quantumMoves: [] },
        { collapsed: null, quantumMoves: ['X1'] },
        { collapsed: null, quantumMoves: [] },
        { collapsed: null, quantumMoves: [] }
    ],

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
        cellEl.classList.remove('collapsed', 'selected', 'in-cycle');
        classicalEl.classList.remove('X', 'O');

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
        renderBoard();
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
    });

    gameState.boardState.forEach(cell => {
        if (!cell.collapsed) {
            cell.quantumMoves = cell.quantumMoves.filter(move => !usedMoves.includes(move));
        }
    });

    gameState.isCollapsePhase = false;
    gameState.activeCycle = null;

    advancePlayerTurn();
    renderBoard();
}

function resetBoard() {
    gameState.boardState = Array(9).fill(null).map(() => ({ collapsed: null, quantumMoves: [] }));
    gameState.currentPlayer = 'X';
    gameState.currentMoveNb = 1;
    gameState.selectedCells = [];
    gameState.hasEntanglements = false;
    gameState.isCollapsePhase = false;

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

updateStatusLine();
renderBoard();
updateSidebarHighlights();