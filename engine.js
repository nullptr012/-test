export const NAMES = {
  red: { king: '帅', advisor: '仕', elephant: '相', horse: '马', rook: '车', cannon: '炮', pawn: '兵' },
  black: { king: '将', advisor: '士', elephant: '象', horse: '马', rook: '车', cannon: '炮', pawn: '卒' },
};

export const opponent = side => side === 'red' ? 'black' : 'red';
export const cloneBoard = board => board.map(row => row.map(piece => piece ? { ...piece } : null));
const inside = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;
const palace = (side, x, y) => x >= 3 && x <= 5 && (side === 'red' ? y >= 7 && y <= 9 : y >= 0 && y <= 2);

export function initialBoard() {
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  const back = ['rook', 'horse', 'elephant', 'advisor', 'king', 'advisor', 'elephant', 'horse', 'rook'];
  for (const side of ['black', 'red']) {
    const rank = side === 'black' ? 0 : 9;
    back.forEach((type, x) => { board[rank][x] = { side, type }; });
    for (const x of [1, 7]) board[side === 'black' ? 2 : 7][x] = { side, type: 'cannon' };
    for (const x of [0, 2, 4, 6, 8]) board[side === 'black' ? 3 : 6][x] = { side, type: 'pawn' };
  }
  return board;
}

function blockers(board, from, to) {
  const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
  let count = 0;
  for (let x = from.x + dx, y = from.y + dy; x !== to.x || y !== to.y; x += dx, y += dy) {
    if (board[y][x]) count++;
  }
  return count;
}

export function canMove(board, from, to) {
  if (!inside(from.x, from.y) || !inside(to.x, to.y)) return false;
  const piece = board[from.y][from.x], target = board[to.y][to.x];
  if (!piece || target?.side === piece.side || (from.x === to.x && from.y === to.y)) return false;
  const dx = to.x - from.x, dy = to.y - from.y;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  switch (piece.type) {
    case 'rook': return (dx === 0 || dy === 0) && blockers(board, from, to) === 0;
    case 'cannon': return (dx === 0 || dy === 0) && blockers(board, from, to) === (target ? 1 : 0);
    case 'horse':
      if (ax === 2 && ay === 1) return !board[from.y][from.x + Math.sign(dx)];
      if (ax === 1 && ay === 2) return !board[from.y + Math.sign(dy)][from.x];
      return false;
    case 'elephant':
      return ax === 2 && ay === 2 && (piece.side === 'red' ? to.y >= 5 : to.y <= 4)
        && !board[from.y + dy / 2][from.x + dx / 2];
    case 'advisor': return ax === 1 && ay === 1 && palace(piece.side, to.x, to.y);
    case 'king':
      if (target?.type === 'king' && dx === 0) return blockers(board, from, to) === 0;
      return ax + ay === 1 && palace(piece.side, to.x, to.y);
    case 'pawn':
      if (dx === 0 && dy === (piece.side === 'red' ? -1 : 1)) return true;
      return (piece.side === 'red' ? from.y <= 4 : from.y >= 5) && ay === 0 && ax === 1;
    default: return false;
  }
}

export function inCheck(board, side) {
  let king;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (board[y][x]?.side === side && board[y][x]?.type === 'king') king = { x, y };
  }
  if (!king) return true;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (board[y][x]?.side === opponent(side) && canMove(board, { x, y }, king)) return true;
  }
  return false;
}

export function isLegal(board, from, to) {
  if (!canMove(board, from, to)) return false;
  const side = board[from.y][from.x].side;
  const next = cloneBoard(board);
  next[to.y][to.x] = next[from.y][from.x];
  next[from.y][from.x] = null;
  return !inCheck(next, side);
}

export function legalMoves(board, from) {
  const result = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (isLegal(board, from, { x, y })) result.push({ x, y });
  }
  return result;
}

export function hasLegalMove(board, side) {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (board[y][x]?.side === side && legalMoves(board, { x, y }).length) return true;
  }
  return false;
}

export class XiangqiGame {
  constructor() { this.reset(); }
  reset() {
    this.board = initialBoard();
    this.turn = 'red';
    this.history = [];
    this.winner = null;
    this.reason = '';
  }
  move(from, to) {
    if (this.winner || this.board[from.y]?.[from.x]?.side !== this.turn || !isLegal(this.board, from, to)) return false;
    const piece = this.board[from.y][from.x], captured = this.board[to.y][to.x];
    this.history.push({ board: cloneBoard(this.board), turn: this.turn, from: { ...from }, to: { ...to }, piece: { ...piece }, captured: captured ? { ...captured } : null });
    this.board[to.y][to.x] = piece;
    this.board[from.y][from.x] = null;
    this.turn = opponent(this.turn);
    if (captured?.type === 'king' || !hasLegalMove(this.board, this.turn)) {
      this.winner = piece.side;
      this.reason = captured?.type === 'king' ? '擒将' : inCheck(this.board, this.turn) ? '将死' : '困毙';
    }
    return true;
  }
  undo() {
    const previous = this.history.pop();
    if (!previous) return false;
    this.board = previous.board;
    this.turn = previous.turn;
    this.winner = null;
    this.reason = '';
    return true;
  }
}
