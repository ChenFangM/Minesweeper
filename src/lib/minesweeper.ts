/**
 * Minesweeper game logic utilities
 */

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

/**
 * Generate a new minesweeper board with randomly placed mines
 */
export function generateMinesweeperBoard(width: number, height: number, mines: number): Cell[][] {
  // Create empty board
  const board: Cell[][] = Array(height).fill(null).map(() => 
    Array(width).fill(null).map(() => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0
    }))
  );
  
  // Place mines randomly
  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    
    // Skip if already a mine
    if (board[row][col].isMine) continue;
    
    // Place mine
    board[row][col].isMine = true;
    minesPlaced++;
    
    // Update adjacent mine counts
    for (let r = Math.max(0, row - 1); r <= Math.min(height - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(width - 1, col + 1); c++) {
        if (r === row && c === col) continue; // Skip the mine itself
        board[r][c].adjacentMines++;
      }
    }
  }
  
  return board;
}

/**
 * Reveal a cell and handle cascading reveals for empty cells
 */
export function revealCell(board: Cell[][], row: number, col: number): { 
  board: Cell[][];
  gameOver: boolean;
  gameWon: boolean;
} {
  // Clone the board to avoid direct mutations
  const newBoard = JSON.parse(JSON.stringify(board));
  const height = newBoard.length;
  const width = newBoard[0].length;
  
  // If cell is already revealed or flagged, do nothing
  if (newBoard[row][col].isRevealed || newBoard[row][col].isFlagged) {
    return { board: newBoard, gameOver: false, gameWon: false };
  }
  
  // Reveal the cell
  newBoard[row][col].isRevealed = true;
  
  // If it's a mine, game over
  if (newBoard[row][col].isMine) {
    // Reveal all mines
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (newBoard[r][c].isMine) {
          newBoard[r][c].isRevealed = true;
        }
      }
    }
    return { board: newBoard, gameOver: true, gameWon: false };
  }
  
  // If it's an empty cell (no adjacent mines), reveal adjacent cells recursively
  if (newBoard[row][col].adjacentMines === 0) {
    const revealAdjacent = (r: number, c: number) => {
      for (let i = Math.max(0, r - 1); i <= Math.min(height - 1, r + 1); i++) {
        for (let j = Math.max(0, c - 1); j <= Math.min(width - 1, c + 1); j++) {
          // Skip if already revealed or flagged
          if (newBoard[i][j].isRevealed || newBoard[i][j].isFlagged) continue;
          
          // Reveal this cell
          newBoard[i][j].isRevealed = true;
          
          // If it's also empty, recursively reveal its neighbors
          if (newBoard[i][j].adjacentMines === 0) {
            revealAdjacent(i, j);
          }
        }
      }
    };
    
    revealAdjacent(row, col);
  }
  
  // Check if game is won (all non-mine cells are revealed)
  let gameWon = true;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!newBoard[r][c].isMine && !newBoard[r][c].isRevealed) {
        gameWon = false;
        break;
      }
    }
    if (!gameWon) break;
  }
  
  return { 
    board: newBoard, 
    gameOver: gameWon, 
    gameWon 
  };
}

/**
 * Toggle flag on a cell
 */
export function flagCell(board: Cell[][], row: number, col: number): {
  board: Cell[][];
  minesRemaining: number;
} {
  // Clone the board to avoid direct mutations
  const newBoard = JSON.parse(JSON.stringify(board));
  
  // If cell is already revealed, do nothing
  if (newBoard[row][col].isRevealed) {
    return { 
      board: newBoard, 
      minesRemaining: countRemainingMines(newBoard) 
    };
  }
  
  // Toggle flag
  newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;
  
  return { 
    board: newBoard, 
    minesRemaining: countRemainingMines(newBoard) 
  };
}

/**
 * Count remaining mines (total mines - flagged cells)
 */
function countRemainingMines(board: Cell[][]): number {
  let totalMines = 0;
  let flaggedCells = 0;
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[0].length; col++) {
      if (board[row][col].isMine) totalMines++;
      if (board[row][col].isFlagged) flaggedCells++;
    }
  }
  
  return totalMines - flaggedCells;
}

/**
 * Calculate game progress (percentage of non-mine cells revealed)
 */
export function calculateGameProgress(board: Cell[][]): number {
  let totalNonMineCells = 0;
  let revealedNonMineCells = 0;
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[0].length; col++) {
      if (!board[row][col].isMine) {
        totalNonMineCells++;
        if (board[row][col].isRevealed) {
          revealedNonMineCells++;
        }
      }
    }
  }
  
  return totalNonMineCells > 0 ? revealedNonMineCells / totalNonMineCells : 0;
}
