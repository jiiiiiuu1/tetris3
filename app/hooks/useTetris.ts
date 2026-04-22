import { useState, useEffect, useCallback, useRef } from 'react';
import { COLS, ROWS, TETROMINOS, RANDOM_TETROMINOS, TetrominoType } from '../constants';

export const useTetris = () => {
  const [grid, setGrid] = useState<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [activePiece, setActivePiece] = useState<{
    type: TetrominoType;
    pos: { x: number; y: number };
    shape: number[][];
  } | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>('I');
  const [score, setScore] = useState(0);
  const [totalLinesCleared, setTotalLinesCleared] = useState(0);
  const [gameClear, setGameClear] = useState(false);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const getRandomType = () => RANDOM_TETROMINOS[Math.floor(Math.random() * RANDOM_TETROMINOS.length)];

  const spawnPiece = useCallback((typeOverride?: TetrominoType) => {
    const type = typeOverride || nextPieceType;
    if (!typeOverride) {
      setNextPieceType(getRandomType());
    }
    
    const shape = TETROMINOS[type].shape;
    const pos = { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };

    if (checkCollision(pos, shape, grid)) {
      setGameOver(true);
      return;
    }

    setActivePiece({ type, pos, shape });
  }, [nextPieceType, grid]);

  const checkCollision = (pos: { x: number; y: number }, shape: number[][], currentGrid: (string | null)[][]) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;

          if (
            newX < 0 || 
            newX >= COLS || 
            newY >= ROWS ||
            (newY >= 0 && currentGrid[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotate = (shape: number[][]) => {
    const newShape = shape[0].map((_, index) =>
      shape.map((col) => col[index]).reverse()
    );
    return newShape;
  };

  const movePiece = (dir: { x: number; y: number }) => {
    if (!activePiece || gameOver || isPaused) return false;

    const newPos = { x: activePiece.pos.x + dir.x, y: activePiece.pos.y + dir.y };
    if (!checkCollision(newPos, activePiece.shape, grid)) {
      setActivePiece({ ...activePiece, pos: newPos });
      return true;
    }

    if (dir.y > 0) {
      lockPiece();
    }
    return false;
  };

  const lockPiece = () => {
    if (!activePiece) return;

    const newGrid = [...grid.map(row => [...row])];
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = activePiece.pos.y + y;
          const gridX = activePiece.pos.x + x;
          if (gridY >= 0) {
            newGrid[gridY][gridX] = TETROMINOS[activePiece.type].color;
          }
        }
      });
    });

    // Line clearing
    let linesClearedInThisTurn = 0;
    const finalGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesClearedInThisTurn++;
      return !isFull;
    });

    while (finalGrid.length < ROWS) {
      finalGrid.unshift(Array(COLS).fill(null));
    }

    if (linesClearedInThisTurn > 0) {
      const linePoints = [0, 100, 300, 500, 800];
      setScore(prev => prev + linePoints[linesClearedInThisTurn] * level);
      
      const newTotal = totalLinesCleared + linesClearedInThisTurn;
      setTotalLinesCleared(newTotal);
      
      if (newTotal >= 3) {
        setGameClear(true);
      }

      if (Math.floor((score + linePoints[linesClearedInThisTurn] * level) / 1000) > Math.floor(score / 1000)) {
        setLevel(prev => prev + 1);
      }
    }

    setGrid(finalGrid);
    spawnPiece();
  };

  const handleRotate = () => {
    if (!activePiece || gameOver || isPaused) return;
    const newShape = rotate(activePiece.shape);
    
    // Basic Wall Kick
    let newPos = { ...activePiece.pos };
    if (checkCollision(newPos, newShape, grid)) {
      newPos.x += 1;
      if (checkCollision(newPos, newShape, grid)) {
        newPos.x -= 2;
        if (checkCollision(newPos, newShape, grid)) {
          newPos.x += 1; // reset and give up
          return;
        }
      }
    }
    setActivePiece({ ...activePiece, shape: newShape, pos: newPos });
  };

  const hardDrop = () => {
    if (!activePiece || gameOver || isPaused) return;
    let newY = activePiece.pos.y;
    while (!checkCollision({ x: activePiece.pos.x, y: newY + 1 }, activePiece.shape, grid)) {
      newY++;
    }
    const finalActivePiece = { ...activePiece, pos: { ...activePiece.pos, y: newY } };
    
    // Manual lock for hard drop
    const newGrid = [...grid.map(row => [...row])];
    finalActivePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = finalActivePiece.pos.y + y;
          const gridX = finalActivePiece.pos.x + x;
          if (gridY >= 0) newGrid[gridY][gridX] = TETROMINOS[finalActivePiece.type].color;
        }
      });
    });

    let linesCleared = 0;
    const finalGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });
    while (finalGrid.length < ROWS) finalGrid.unshift(Array(COLS).fill(null));

    if (linesCleared > 0) {
      const linePoints = [0, 100, 300, 500, 800];
      setScore(prev => prev + linePoints[linesCleared] * level);
      const newTotal = totalLinesCleared + linesCleared;
      setTotalLinesCleared(newTotal);
      if (newTotal >= 3) {
        setGameClear(true);
      }
    }
    setGrid(finalGrid);
    spawnPiece();
  };


  const startGame = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0);
    setTotalLinesCleared(0);
    setGameClear(false);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    setTime(0);
    spawnPiece(getRandomType());
  };

  // Ghost Piece calculation
  const getGhostPos = () => {
    if (!activePiece) return null;
    let ghostY = activePiece.pos.y;
    while (!checkCollision({ x: activePiece.pos.x, y: ghostY + 1 }, activePiece.shape, grid)) {
      ghostY++;
    }
    return { ...activePiece.pos, y: ghostY };
  };

  useEffect(() => {
    setNextPieceType(getRandomType());
  }, []);

  const [gravityTrigger, setGravityTrigger] = useState(0);

  useEffect(() => {
    if (gameOver || isPaused || !activePiece) return;
    const dropSpeed = Math.max(100, 1000 - (level - 1) * 100);
    const id = setInterval(() => setGravityTrigger(t => t + 1), dropSpeed);
    return () => clearInterval(id);
  }, [level, gameOver, isPaused, !!activePiece]);

  useEffect(() => {
    if (gravityTrigger > 0 && activePiece && !isPaused && !gameOver) {
      movePiece({ x: 0, y: 1 });
    }
  }, [gravityTrigger]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (activePiece && !isPaused && !gameOver && !gameClear) {
      timerId = setInterval(() => {
        setTime(t => t + 10);
      }, 10);
    }
    return () => clearInterval(timerId);
  }, [activePiece, isPaused, gameOver, gameClear]);

  return {
    grid,
    activePiece,
    nextPieceType,
    score,
    totalLinesCleared,
    level,
    gameOver,
    gameClear,
    isPaused,
    time,
    setIsPaused,
    movePiece,
    handleRotate,
    hardDrop,
    startGame,
    getGhostPos,
  };
};
