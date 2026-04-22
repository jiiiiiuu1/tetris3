'use client';

import React, { useEffect, useCallback } from 'react';
import { useTetris } from './hooks/useTetris';
import { TETROMINOS, COLS, ROWS } from './constants';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqicSyGob8jb6ODzlr15TqfUR-VZCMcx9xK_Lwxss74kWa9tbFXmHMRULkiJPdnjw/exec";

export default function Home() {
  const {
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
  } = useTetris();

  const [playerName, setPlayerName] = React.useState('');
  const [isGameStarted, setIsGameStarted] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState<{ name: string; time: number }[]>([]);

  const [mounted, setMounted] = React.useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // 캐시 방지를 위해 타임스탬프 추가
      const response = await fetch(`${APPS_SCRIPT_URL}?action=get&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // 0.5초(500ms) 이하의 비정상 기록 필터링 및 데이터 형식 확인
        const validData = Array.isArray(data) 
          ? data.filter((entry: any) => entry.time > 500)
          : [];
        setLeaderboard(validData);
      }
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const hasSavedRef = React.useRef(false);

  useEffect(() => {
    if (gameClear && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const finalName = playerName.trim() || 'Anonymous';
      const finalTime = time;

      // 1. Update Local UI immediately (optional, for responsiveness)
      setLeaderboard(prev => {
        const updated = [...prev, { name: finalName, time: finalTime }]
          .sort((a, b) => a.time - b.time)
          .slice(0, 3);
        return updated;
      });

      // 1. Send to Google Sheets and Refresh
      const TARGET_URL = APPS_SCRIPT_URL;
      const queryString = `?name=${encodeURIComponent(finalName)}&finishtime=${encodeURIComponent((finalTime / 1000).toString())}`;
      
      fetch(TARGET_URL + queryString, {
        method: 'GET',
        mode: 'no-cors',
      })
      .then(() => {
        console.log('✅ Record saved automatically to Google Sheets');
        // 저장 후 1초 뒤에 전역 순위를 다시 가져와서 모든 기기 동기화
        setTimeout(fetchLeaderboard, 1000);
      })
      .catch(err => {
        console.error('❌ Failed to save record:', err);
      });
    }
    if (!gameClear) {
      hasSavedRef.current = false;
    }
  }, [gameClear, playerName, time]);

  // Cleanup local storage if still present
  useEffect(() => {
    if (mounted) {
      localStorage.removeItem('tetris-leaderboard');
    }
  }, [mounted]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameOver || !isGameStarted) return;

    switch (e.key) {
      case 'ArrowLeft': movePiece({ x: -1, y: 0 }); break;
      case 'ArrowRight': movePiece({ x: 1, y: 0 }); break;
      case 'ArrowDown': movePiece({ x: 0, y: 1 }); break;
      case 'ArrowUp': handleRotate(); break;
      case ' ': e.preventDefault(); hardDrop(); break;
      case 'p': case 'P': setIsPaused(prev => !prev); break;
    }
  }, [movePiece, handleRotate, hardDrop, gameOver, setIsPaused, isGameStarted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const ghostPos = getGhostPos();

  // Helper to render pieces in small previews
  const renderThumbnail = (type: string | null) => {
    if (!type) return <div className="w-16 h-16 flex items-center justify-center text-gray-600">NONE</div>;
    const shape = TETROMINOS[type as keyof typeof TETROMINOS].shape;
    const color = TETROMINOS[type as keyof typeof TETROMINOS].color;
    
    const cols = shape[0].length;
    
    return (
      <div 
        className="grid gap-1 p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {shape.map((row, y) => 
          row.map((cell, x) => (
            <div 
              key={`${y}-${x}`} 
              className={`w-4 h-4 rounded-sm ${cell ? '' : 'bg-transparent'}`}
              style={{ 
                backgroundColor: cell ? color : 'transparent', 
                boxShadow: cell ? `0 0 8px ${color}` : 'none' 
              }}
            />
          ))
        )}
      </div>
    );
  };

  if (!mounted) return <div className="min-h-screen bg-[#1a1a1a]" />;

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#1a1a1a]">
        <div className="glass-panel p-8 w-full max-w-md flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <h1 className="text-4xl font-black text-cyan-400 tracking-tighter italic">NEON TETRIS</h1>
          <div className="w-full flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Enter Player Name</label>
            <input 
              type="text" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="PLAYER 1"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono"
            />
          </div>
          <button 
            onClick={() => {
              setIsGameStarted(true);
              startGame();
            }}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-cyan-500/20"
          >
            START GAME
          </button>
          
          {leaderboard.length > 0 && (
            <div className="w-full mt-4 p-4 bg-white/5 rounded-xl border border-white/5 group/leaderboard">
              <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Global Top 3</h3>
              </div>
              <div className="flex flex-col gap-2">
                {leaderboard.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center font-mono text-sm">
                    <span className="text-gray-400">#{i+1} {entry.name}</span>
                    <span className="text-cyan-400">{formatTime(entry.time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#1a1a1a]">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left Panel: Stats */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-4 flex flex-col gap-4 w-32 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/30"></div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Time</p>
              <p className="text-xl font-mono text-white animate-pulse">{formatTime(time)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Score</p>
              <p className="text-xl font-mono text-cyan-400">{score.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Lines</p>
              <p className="text-xl font-mono text-yellow-400">{totalLinesCleared} / 3</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsPaused(prev => !prev)}
              className="glass-panel p-2 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/10 transition-colors uppercase tracking-widest"
            >
              {isPaused ? '▶ Resume' : '‖ Pause'}
            </button>
            <button 
              onClick={() => {
                if (confirm('Restart game?')) startGame();
              }}
              className="glass-panel p-2 text-[10px] font-bold text-yellow-400 hover:bg-yellow-500/10 transition-colors uppercase tracking-widest"
            >
              ↺ Restart
            </button>
            <button 
              onClick={() => {
                if (confirm('Exit to menu?')) setIsGameStarted(false);
              }}
              className="glass-panel p-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors uppercase tracking-widest"
            >
              ← Exit
            </button>
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="relative glass-panel p-1 border-white/20 shadow-cyan-500/10 shadow-2xl">
          <div className="absolute -top-6 left-0 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{playerName || 'PLAYER 1'}</span>
          </div>
          <div 
            className="grid gap-[1px] bg-white/5 border border-white/10"
            style={{ 
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              width: 'min(70vw, 300px)',
              aspectRatio: `${COLS} / ${ROWS}`
            }}
          >
            {grid.map((row, y) => 
              row.map((cell, x) => {
                let color = cell;
                let isGhost = false;
                let isActive = false;

                // Active Piece
                if (activePiece) {
                  const pieceY = y - activePiece.pos.y;
                  const pieceX = x - activePiece.pos.x;
                  if (
                    pieceY >= 0 && pieceY < activePiece.shape.length &&
                    pieceX >= 0 && pieceX < activePiece.shape[0].length &&
                    activePiece.shape[pieceY][pieceX]
                  ) {
                    color = TETROMINOS[activePiece.type].color;
                    isActive = true;
                  }
                }

                // Ghost Piece
                if (!isActive && ghostPos) {
                  const pieceY = y - ghostPos.y;
                  const pieceX = x - ghostPos.x;
                  if (
                    pieceY >= 0 && pieceY < activePiece!.shape.length &&
                    pieceX >= 0 && pieceX < activePiece!.shape[0].length &&
                    activePiece!.shape[pieceY][pieceX]
                  ) {
                    color = TETROMINOS[activePiece!.type].color;
                    isGhost = true;
                  }
                }

                return (
                  <div 
                    key={`${y}-${x}`}
                    className={`relative w-full h-full rounded-[2px] ${isGhost ? 'opacity-20' : ''}`}
                    style={{ 
                      backgroundColor: color || 'rgba(255,255,255,0.02)',
                      boxShadow: color && !isGhost ? `inset 0 0 10px rgba(0,0,0,0.5), 0 0 12px ${color}66` : 'none',
                      border: color ? '1px solid rgba(255,255,255,0.2)' : 'none'
                    }}
                  />
                );
              })
            )}
          </div>

          {/* Overlays */}
          {(!activePiece && !gameOver) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg z-10">
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-transform active:scale-95 shadow-lg shadow-cyan-500/50"
              >
                START GAME
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-lg z-20 animate-in fade-in zoom-in duration-300">
              <h2 className="text-4xl font-black text-red-500 mb-2 tracking-tighter">GAME OVER</h2>
              <p className="text-gray-400 mb-6">Final Score: {score}</p>
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-cyan-400 transition-colors"
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {gameClear && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl rounded-lg z-30 animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="mb-4 text-6xl">🏆</div>
              <h2 className="text-5xl font-black text-yellow-400 mb-1 tracking-tighter italic shadow-yellow-500/20 drop-shadow-2xl">MISSION CLEAR</h2>
              <p className="text-white font-mono text-2xl mb-8 uppercase tracking-widest">{formatTime(time)}</p>
              
              <div className="w-full max-w-[200px] mb-8 p-4 bg-white/5 rounded-xl border border-yellow-400/20">
                <h3 className="text-[10px] font-bold text-yellow-400 uppercase tracking-[0.2em] mb-4 text-center border-b border-white/10 pb-2">Wall of Fame</h3>
                <div className="flex flex-col gap-3">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className={`flex justify-between items-center text-xs font-mono ${entry.time === time && entry.name === (playerName || 'Anonymous') ? 'text-yellow-400 scale-110' : 'text-gray-400'}`}>
                      <span>{i+1}. {entry.name}</span>
                      <span>{formatTime(entry.time)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsGameStarted(false)}
                className="px-10 py-4 bg-yellow-400 text-black font-black rounded-full hover:bg-white transition-all transform hover:scale-105 active:scale-95"
              >
                NEXT CHALLENGE
              </button>
            </div>
          )}

          {isPaused && !gameClear && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg z-10">
              <h2 className="text-3xl font-bold text-white tracking-widest">PAUSED</h2>
            </div>
          )}
        </div>

        {/* Right Panel: Next */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-4 flex flex-col items-center w-32 border-cyan-500/30">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Next</h2>
            <div className="w-20 h-20 bg-black/40 rounded-lg flex items-center justify-center border border-white/5">
              {renderThumbnail(nextPieceType)}
            </div>
          </div>
          
          {/* Mobile visible score */}
          <div className="glass-panel p-4 flex md:hidden flex-row gap-4 w-full justify-between px-6">
            <div className="text-left">
              <p className="text-[10px] text-gray-400 uppercase">Score</p>
              <p className="text-lg font-mono text-cyan-400">{score}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase">Level</p>
              <p className="text-lg font-mono text-purple-400">{level}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-8 flex flex-col gap-4 md:hidden w-full max-w-[320px]">
        <div className="flex justify-between items-center px-4">
          <div className="w-16"></div> {/* Spacer for symmetry */}
          <button className="control-btn w-20 h-20 border-cyan-500/50 shadow-lg shadow-cyan-500/20" onPointerDown={() => handleRotate()}>
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button className="control-btn" onPointerDown={() => setIsPaused(p => !p)}>
            <span className="text-xs font-bold text-gray-400">{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>
        </div>
        
        <div className="flex justify-center gap-12 items-center">
          <button className="control-btn" onPointerDown={() => movePiece({x: -1, y: 0})}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="control-btn w-20 h-20 bg-cyan-500/10" onPointerDown={() => hardDrop()}>
            <svg className="w-8 h-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 14l-7 7-7-7m14-8l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="control-btn" onPointerDown={() => movePiece({x: 1, y: 0})}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        
        <div className="flex justify-center mt-2">
          <button className="control-btn w-full max-w-[200px] rounded-2xl h-12" onPointerDown={() => movePiece({x: 0, y: 1})}>
            <span className="font-bold text-gray-300">SOFT DROP</span>
          </button>
        </div>
      </div>

      <footer className="mt-12 text-gray-600 text-[10px] tracking-widest uppercase">
        Modern Tetris &copy; 2026
      </footer>
    </main>
  );
}
