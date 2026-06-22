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
    const cellElements = document.querySelectorAll('.cell');

    cellElements.forEach((cellEl, index) => {
        const cellData = gameState.boardState[index];
        const classicalEl = cellEl.querySelector('.classical');
        const quantumEl = cellEl.querySelector('.quantum-grid');

        // Reset classes from previous renders
        cellEl.classList.remove('collapsed');
        cellEl.classList.remove('selected');
        classicalEl.classList.remove('X', 'O');

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
    statusLineEl.classList.remove('X');
    statusLineEl.classList.remove('O');

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

function handleCellClick(index, cellEl) {
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

        // Switch turn
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
        gameState.currentMoveNb++;
        renderBoard();
    }

    updateStatusLine();
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