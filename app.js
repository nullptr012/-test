import { XiangqiGame, NAMES, legalMoves, inCheck } from './engine.js';

const game = new XiangqiGame();
const board = document.querySelector('#board');
const records = document.querySelector('#records');
const dialog = document.querySelector('#restart-dialog');
let selected = null;
let destinations = [];
const sideName = side => side === 'red' ? '红方' : '黑方';
const same = (a, b) => a && b && a.x === b.x && a.y === b.y;
const pos = ({ x, y }) => `left:${(50 + x * 100) / 9}%;top:${(50 + y * 100) / 10}%`;

function boardArt() {
  let lines = '';
  for (let y = 0; y < 10; y++) lines += `<path d="M50 ${50 + y * 100}H850"/>`;
  for (let x = 0; x < 9; x++) {
    const px = 50 + x * 100;
    lines += x === 0 || x === 8 ? `<path d="M${px} 50V950"/>` : `<path d="M${px} 50V450M${px} 550V950"/>`;
  }
  lines += '<path d="M350 50L550 250M550 50L350 250M350 750L550 950M550 750L350 950"/>';
  for (const [x, y] of [[1, 2], [7, 2], [1, 7], [7, 7], ...[0, 2, 4, 6, 8].flatMap(x => [[x, 3], [x, 6]])]) {
    const px = 50 + x * 100, py = 50 + y * 100;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      if ((x === 0 && sx === -1) || (x === 8 && sx === 1)) continue;
      lines += `<path d="M${px + sx * 23} ${py + sy * 8}H${px + sx * 8}V${py + sy * 23}"/>`;
    }
  }
  return `<svg viewBox="0 0 900 1000" aria-hidden="true"><g fill="none" stroke="#735530" stroke-width="1.7">${lines}<rect x="43" y="43" width="814" height="914" stroke-width="3"/></g><g fill="#785933" font-family="KaiTi,STKaiti,serif" font-size="40" letter-spacing="17"><text x="190" y="514">楚 河</text><text x="555" y="514">汉 界</text></g></svg>`;
}

function render() {
  const last = game.history.at(-1);
  const checked = !game.winner && inCheck(game.board, game.turn);
  board.innerHTML = boardArt();
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    const location = { x, y }, piece = game.board[y][x];
    const available = destinations.some(to => same(to, location));
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = pos(location);
    if (piece) {
      button.className = `piece ${piece.side}${same(selected, location) ? ' selected' : ''}${available ? ' capture' : ''}${same(last?.to, location) ? ' last' : ''}${checked && piece.side === game.turn && piece.type === 'king' ? ' checked' : ''}`;
      button.textContent = NAMES[piece.side][piece.type];
      button.setAttribute('aria-label', `${sideName(piece.side)}${button.textContent}，第${x + 1}列第${y + 1}行${available ? '，可吃' : ''}`);
      button.setAttribute('aria-pressed', String(Boolean(same(selected, location))));
    } else {
      button.className = `square${available ? ' available' : ''}${same(last?.from, location) ? ' last-square' : ''}`;
      button.setAttribute('aria-label', `第${x + 1}列第${y + 1}行${available ? '，可走' : ''}`);
    }
    button.addEventListener('click', () => choose(location));
    board.append(button);
  }
  document.querySelector('#turn-dot').className = `turn-dot ${game.turn}`;
  document.querySelector('#turn-label').textContent = game.winner ? '棋局结束' : `${sideName(game.turn)}回合`;
  document.querySelector('#round').textContent = `第 ${Math.floor(game.history.length / 2) + 1} 回合`;
  document.querySelector('#status').textContent = game.winner ? `${sideName(game.winner)}获胜` : checked ? `${sideName(game.turn)}被将军` : game.history.length ? `${sideName(game.turn)}请落子` : '红方先行';
  document.querySelector('#hint').textContent = game.winner ? `${game.reason}。可以悔棋复盘，或重新开始。` : checked ? '请移动帅／将、挡住攻击或吃掉进攻棋子。' : selected ? destinations.length ? '绿色标记为可走落点，虚线标记为可吃棋子。' : '这枚棋子暂无合法走法，请选择其他棋子。' : '点击己方棋子，再点击落点。';
  document.querySelector('#undo').disabled = game.history.length === 0;
  for (const side of ['red', 'black']) {
    const el = document.querySelector(`#${side}-state`);
    el.classList.toggle('active', !game.winner && side === game.turn);
    el.textContent = game.winner ? side === game.winner ? '获胜' : '落败' : side === game.turn ? checked ? '请解将' : '正在走棋' : '等待走棋';
  }
  document.querySelector('#move-count').textContent = `${game.history.length} 步`;
  if (!game.history.length) records.innerHTML = '<p class="empty">棋局初开，静候第一步。<small>每一步，都有新的可能。</small></p>';
  else records.innerHTML = game.history.map((move, i) => `<div class="record-row"><span class="number">${String(i + 1).padStart(2, '0')}</span><span class="${move.piece.side}">${sideName(move.piece.side)} · ${NAMES[move.piece.side][move.piece.type]}</span><span>${move.from.x + 1},${move.from.y + 1} → ${move.to.x + 1},${move.to.y + 1}</span>${move.captured ? `<span class="capture-label">吃${NAMES[move.captured.side][move.captured.type]}</span>` : ''}</div>`).join('');
  records.scrollTop = records.scrollHeight;
}

function choose(location) {
  if (game.winner) return;
  if (same(selected, location)) {
    selected = null;
    destinations = [];
  } else if (game.board[location.y][location.x]?.side === game.turn) {
    selected = location;
    destinations = legalMoves(game.board, location);
  } else if (selected) {
    if (!game.move(selected, location)) {
      document.querySelector('#hint').textContent = '此处不能落子，请选择绿色落点；走棋后不能使己方被将军。';
      return;
    }
    selected = null;
    destinations = [];
  } else return;
  render();
}

document.querySelector('#undo').addEventListener('click', () => {
  game.undo(); selected = null; destinations = []; render();
});
document.querySelector('#restart').addEventListener('click', () => {
  if (game.history.length) dialog.showModal();
  else { game.reset(); selected = null; destinations = []; render(); }
});
document.querySelector('#cancel-restart').addEventListener('click', () => dialog.close());
document.querySelector('#confirm-restart').addEventListener('click', () => {
  game.reset(); selected = null; destinations = []; dialog.close(); render();
});
render();
