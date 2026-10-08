import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, canMove, inCheck, isLegal, legalMoves, hasLegalMove, XiangqiGame } from '../engine.js';

const empty = () => Array.from({ length: 10 }, () => Array(9).fill(null));
const put = (board, x, y, side, type) => { board[y][x] = { side, type }; };
const kings = () => {
  const board = empty();
  put(board, 4, 0, 'black', 'king');
  put(board, 4, 9, 'red', 'king');
  put(board, 4, 5, 'red', 'pawn');
  return board;
};

test('initial board has 32 pieces, neither side checked, and red has 44 legal moves', () => {
  const board = initialBoard();
  assert.equal(board.flat().filter(Boolean).length, 32);
  assert.equal(inCheck(board, 'red'), false);
  assert.equal(inCheck(board, 'black'), false);
  let count = 0;
  board.forEach((row, y) => row.forEach((piece, x) => {
    if (piece?.side === 'red') count += legalMoves(board, { x, y }).length;
  }));
  assert.equal(count, 44);
});

test('rook moves in straight lines and cannot pass pieces or capture allies', () => {
  const b = empty();
  put(b, 0, 9, 'red', 'rook'); put(b, 0, 6, 'red', 'pawn');
  assert.equal(canMove(b, { x: 0, y: 9 }, { x: 0, y: 7 }), true);
  for (const to of [{ x: 0, y: 5 }, { x: 1, y: 8 }, { x: 0, y: 6 }]) {
    assert.equal(canMove(b, { x: 0, y: 9 }, to), false);
  }
});

test('horse requires an unblocked leg in the long direction', () => {
  const b = empty(); put(b, 4, 4, 'red', 'horse');
  assert.equal(canMove(b, { x: 4, y: 4 }, { x: 6, y: 5 }), true);
  put(b, 5, 4, 'black', 'pawn');
  assert.equal(canMove(b, { x: 4, y: 4 }, { x: 6, y: 5 }), false);
  assert.equal(canMove(b, { x: 4, y: 4 }, { x: 5, y: 6 }), true);
  put(b, 4, 5, 'red', 'pawn');
  assert.equal(canMove(b, { x: 4, y: 4 }, { x: 5, y: 6 }), false);
});

test('elephant cannot cross river or pass a blocked eye', () => {
  const b = empty(); put(b, 4, 5, 'red', 'elephant');
  assert.equal(canMove(b, { x: 4, y: 5 }, { x: 6, y: 7 }), true);
  assert.equal(canMove(b, { x: 4, y: 5 }, { x: 6, y: 3 }), false);
  put(b, 5, 6, 'red', 'pawn');
  assert.equal(canMove(b, { x: 4, y: 5 }, { x: 6, y: 7 }), false);
  put(b, 4, 4, 'black', 'elephant');
  assert.equal(canMove(b, { x: 4, y: 4 }, { x: 2, y: 6 }), false);
});

test('advisors and kings remain in palace', () => {
  const b = empty(); put(b, 3, 7, 'red', 'advisor'); put(b, 3, 9, 'red', 'king');
  assert.equal(canMove(b, { x: 3, y: 7 }, { x: 4, y: 8 }), true);
  assert.equal(canMove(b, { x: 3, y: 7 }, { x: 2, y: 8 }), false);
  assert.equal(canMove(b, { x: 3, y: 9 }, { x: 3, y: 8 }), true);
  assert.equal(canMove(b, { x: 3, y: 9 }, { x: 2, y: 9 }), false);
  assert.equal(canMove(b, { x: 3, y: 9 }, { x: 4, y: 8 }), false);
});

test('cannon needs exactly one screen to capture and none to move', () => {
  const b = empty(); put(b, 1, 7, 'red', 'cannon'); put(b, 1, 0, 'black', 'horse');
  assert.equal(canMove(b, { x: 1, y: 7 }, { x: 1, y: 0 }), false);
  put(b, 1, 4, 'black', 'pawn');
  assert.equal(canMove(b, { x: 1, y: 7 }, { x: 1, y: 0 }), true);
  assert.equal(canMove(b, { x: 1, y: 7 }, { x: 1, y: 3 }), false);
  assert.equal(canMove(b, { x: 1, y: 7 }, { x: 1, y: 5 }), true);
  put(b, 1, 2, 'red', 'pawn');
  assert.equal(canMove(b, { x: 1, y: 7 }, { x: 1, y: 0 }), false);
});

test('pawns gain sideways moves after crossing river but never move backwards', () => {
  for (const [side, y, forward] of [['red', 5, -1], ['black', 4, 1]]) {
    const b = empty(); put(b, 4, y, side, 'pawn');
    assert.equal(canMove(b, { x: 4, y }, { x: 4, y: y + forward }), true);
    assert.equal(canMove(b, { x: 4, y }, { x: 5, y }), false);
    put(b, 4, y + forward, side, 'pawn');
    assert.equal(canMove(b, { x: 4, y: y + forward }, { x: 5, y: y + forward }), true);
    b[y][4] = null;
    assert.equal(canMove(b, { x: 4, y: y + forward }, { x: 4, y }), false);
  }
});

test('moving a screen cannot expose facing kings', () => {
  const b = kings();
  assert.equal(canMove(b, { x: 4, y: 5 }, { x: 3, y: 5 }), false);
  b[5][4] = { side: 'red', type: 'rook' };
  assert.equal(canMove(b, { x: 4, y: 5 }, { x: 3, y: 5 }), true);
  assert.equal(isLegal(b, { x: 4, y: 5 }, { x: 3, y: 5 }), false);
  b[5][4] = null;
  assert.equal(inCheck(b, 'red'), true);
  assert.equal(inCheck(b, 'black'), true);
  assert.equal(isLegal(b, { x: 4, y: 9 }, { x: 4, y: 0 }), true);
});

test('a checked player cannot make unrelated moves and can escape attack', () => {
  const b = kings(); put(b, 0, 9, 'black', 'rook'); put(b, 8, 7, 'red', 'rook');
  assert.equal(inCheck(b, 'red'), true);
  assert.equal(isLegal(b, { x: 8, y: 7 }, { x: 8, y: 6 }), false);
  assert.equal(isLegal(b, { x: 4, y: 9 }, { x: 4, y: 8 }), true);
});

test('turn order, illegal moves, and undo preserve complete state', () => {
  const game = new XiangqiGame(); const initial = JSON.stringify(game.board);
  assert.equal(game.move({ x: 0, y: 3 }, { x: 0, y: 4 }), false);
  assert.equal(game.move({ x: 0, y: 6 }, { x: 1, y: 6 }), false);
  assert.equal(game.move({ x: 0, y: 6 }, { x: 0, y: 5 }), true);
  assert.equal(game.turn, 'black'); assert.equal(game.history.length, 1);
  assert.equal(game.undo(), true);
  assert.equal(game.turn, 'red'); assert.equal(JSON.stringify(game.board), initial);
  assert.equal(game.undo(), false);
});

test('capture and undo restore captured piece', () => {
  const game = new XiangqiGame(); game.board = kings();
  put(game.board, 0, 7, 'red', 'rook'); put(game.board, 0, 3, 'black', 'pawn');
  assert.equal(game.move({ x: 0, y: 7 }, { x: 0, y: 3 }), true);
  assert.equal(game.history[0].captured.type, 'pawn');
  game.undo(); assert.equal(game.board[3][0].type, 'pawn'); assert.equal(game.board[7][0].type, 'rook');
});

test('checkmate wins, blocks further play, and undo reopens game', () => {
  const game = new XiangqiGame(); game.board = kings();
  put(game.board, 3, 2, 'red', 'rook'); put(game.board, 5, 2, 'red', 'rook'); put(game.board, 0, 1, 'red', 'rook'); put(game.board, 4, 3, 'red', 'rook');
  assert.equal(game.move({ x: 0, y: 1 }, { x: 4, y: 1 }), true);
  assert.equal(game.winner, 'red'); assert.equal(game.reason, '将死');
  assert.equal(game.move({ x: 4, y: 0 }, { x: 3, y: 0 }), false);
  game.undo(); assert.equal(game.winner, null); assert.equal(game.turn, 'red');
});

test('stalemate counts as a loss in Chinese chess', () => {
  const game = new XiangqiGame(); game.board = kings();
  put(game.board, 3, 2, 'red', 'rook'); put(game.board, 5, 2, 'red', 'rook'); put(game.board, 0, 1, 'red', 'rook'); put(game.board, 0, 6, 'red', 'pawn');
  assert.equal(game.move({ x: 0, y: 6 }, { x: 0, y: 5 }), true);
  assert.equal(inCheck(game.board, 'black'), false);
  assert.equal(hasLegalMove(game.board, 'black'), false);
  assert.equal(game.winner, 'red'); assert.equal(game.reason, '困毙');
});

test('capturing the king ends the game and reset restores starting position', () => {
  const game = new XiangqiGame(); game.board = kings(); put(game.board, 0, 0, 'red', 'rook');
  assert.equal(game.move({ x: 0, y: 0 }, { x: 4, y: 0 }), true);
  assert.equal(game.winner, 'red'); assert.equal(game.reason, '擒将');
  game.reset(); assert.equal(game.winner, null); assert.equal(game.history.length, 0);
  assert.deepEqual(game.board, initialBoard());
});
