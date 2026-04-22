export const COLS = 10;
export const ROWS = 20;
export const INITIAL_LEVEL = 1;
export const INITIAL_SCORE = 0;

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Tetromino {
  shape: number[][];
  color: string;
}

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 'var(--neon-i)',
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--neon-j)',
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--neon-l)',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'var(--neon-o)',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: 'var(--neon-s)',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--neon-t)',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--neon-z)',
  },
};

export const RANDOM_TETROMINOS = (Object.keys(TETROMINOS) as TetrominoType[]);

// Wall kick data (SRS - simplified)
// For simplicity, we'll implement basic rotation and wall checking, 
// but we can add more complex SRS offsets if needed.
