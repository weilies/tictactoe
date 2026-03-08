'use client';

import { useState, useEffect } from 'react';

type Player = 'X' | 'O';
type Cell = Player | null;

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: Player; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return null;
}

function minimax(board: Cell[], isMaximizing: boolean): number {
  const result = checkWinner(board);
  if (result?.winner === 'O') return 10;
  if (result?.winner === 'X') return -10;
  if (board.every(Boolean)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function bestMove(board: Cell[]): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > best) { best = score; move = i; }
    }
  }
  return move;
}

export default function Home() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>('X');
  const [mode, setMode] = useState<'2p' | 'ai'>('ai');
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);

  function init() {
    setBoard(Array(9).fill(null));
    setCurrent('X');
    setWinLine(null);
    setGameOver(false);
    setStatus('');
  }

  function handleResult(newBoard: Cell[]) {
    const result = checkWinner(newBoard);
    if (result) {
      setWinLine(result.line);
      setScores(s => ({ ...s, [result.winner]: s[result.winner as 'X' | 'O'] + 1 }));
      setStatus(`${result.winner} wins!`);
      setGameOver(true);
      return true;
    }
    if (newBoard.every(Boolean)) {
      setScores(s => ({ ...s, draws: s.draws + 1 }));
      setStatus("It's a draw!");
      setGameOver(true);
      return true;
    }
    return false;
  }

  function handleClick(i: number) {
    if (gameOver || board[i]) return;
    if (mode === 'ai' && current === 'O') return;

    const newBoard = [...board];
    newBoard[i] = current;
    setBoard(newBoard);

    if (!handleResult(newBoard)) {
      setCurrent(c => c === 'X' ? 'O' : 'X');
    }
  }

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || current !== 'O' || gameOver) return;
    const timer = setTimeout(() => {
      const move = bestMove([...board]);
      if (move === -1) return;
      const newBoard = [...board];
      newBoard[move] = 'O';
      setBoard(newBoard);
      if (!handleResult(newBoard)) {
        setCurrent('X');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [current, mode, gameOver, board]);

  function switchMode(m: '2p' | 'ai') {
    setMode(m);
    setBoard(Array(9).fill(null));
    setCurrent('X');
    setWinLine(null);
    setGameOver(false);
    setStatus('');
  }

  const aiThinking = mode === 'ai' && current === 'O' && !gameOver;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Funko TTT</h1>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-zinc-800 p-1 rounded-lg">
        {(['ai', '2p'] as const).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {m === 'ai' ? 'vs AI' : '2 Players'}
          </button>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="flex gap-8 text-center">
        {[['X', scores.X], ['Draw', scores.draws], ['O', scores.O]].map(([label, val]) => (
          <div key={label}>
            <div className="text-2xl font-bold">{val}</div>
            <div className="text-xs text-zinc-400 uppercase tracking-widest">
              {label === 'X' ? (mode === 'ai' ? 'You' : 'X') : label === 'O' ? (mode === 'ai' ? 'AI' : 'O') : 'Draw'}
            </div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const isWin = winLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={!!cell || gameOver || aiThinking}
              className={`w-24 h-24 text-4xl font-bold rounded-xl transition-colors
                ${isWin ? 'bg-yellow-400 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-700'}
                ${cell === 'X' ? 'text-sky-400' : 'text-rose-400'}
                disabled:cursor-not-allowed
              `}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Status / Turn */}
      <div className="h-8 text-lg font-medium text-zinc-300">
        {status || (aiThinking ? 'AI is thinking...' : `${current}'s turn`)}
      </div>

      {/* New game */}
      {gameOver && (
        <button
          onClick={init}
          className="px-6 py-2 bg-zinc-100 text-zinc-900 rounded-full font-medium hover:bg-zinc-300 transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
