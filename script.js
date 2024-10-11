// Seleção de elementos do DOM
const playerBoard = document.getElementById('player-board');
const opponentBoard = document.getElementById('opponent-board');
const startGameButton = document.getElementById('start-game');
const rotateShipButton = document.getElementById('rotate-ship');
const playerScoreElement = document.getElementById('player-score');
const opponentScoreElement = document.getElementById('opponent-score');
const actionLog = document.getElementById('action-log');

// Referências aos elementos das embarcações restantes
const playerShipsRemainingElement = document.getElementById('player-ships-remaining');
const opponentShipsRemainingElement = document.getElementById('opponent-ships-remaining');

// Definição dos tipos de embarcações
const shipTypes = [
  { name: 'Porta-aviões', size: 4, quantity: 1 },
  { name: 'Submarino', size: 3, quantity: 3 },
  { name: 'Destroyer', size: 2, quantity: 3 },
  { name: 'Bote', size: 1, quantity: 2 }
];

let playerShips = [];
let opponentShips = [];
let playerScore = 0;
let opponentScore = 0;
let isPlayerTurn = false; // Começa falso até que o jogo inicie
let placingShips = true; // Indica se o jogador está posicionando as embarcações
let shipOrientation = 'vertical'; // 'horizontal' ou 'vertical'

let playerShipQueue = [];
let opponentShipQueue = [];
let currentShipIndex = 0; // Para o posicionamento das embarcações do jogador
let shipIdCounter = 0;
let opponentShipIdCounter = 0;

const totalShips = shipTypes.reduce((sum, shipType) => sum + shipType.quantity, 0);

function initializePlayerShipQueue() {
  playerShipQueue = [];
  for (let shipType of shipTypes) {
    for (let i = 0; i < shipType.quantity; i++) {
      playerShipQueue.push({ name: shipType.name, size: shipType.size });
    }
  }
  currentShipIndex = 0;
  placingShips = true;
  startGameButton.disabled = true;
  rotateShipButton.disabled = false;
  updateShipsRemaining('player');
  logAction(`Posicione sua embarcação: ${playerShipQueue[currentShipIndex].name} de tamanho ${playerShipQueue[currentShipIndex].size}.`);
}

function initializeOpponentShipQueue() {
  opponentShipQueue = [];
  for (let shipType of shipTypes) {
    for (let i = 0; i < shipType.quantity; i++) {
      opponentShipQueue.push({ name: shipType.name, size: shipType.size });
    }
  }
}

function updateShipsRemaining(playerType) {
  let shipsRemainingElement;
  let shipsArray;
  if (playerType === 'player') {
    shipsRemainingElement = playerShipsRemainingElement;
    shipsArray = playerShips;
  } else {
    shipsRemainingElement = opponentShipsRemainingElement;
    shipsArray = opponentShips;
  }

  // Conta quantas embarcações de cada tipo ainda estão ativas
  const shipsCount = {};
  for (let shipType of shipTypes) {
    shipsCount[shipType.name] = 0;
  }

  for (let ship of shipsArray) {
    if (ship.hits < ship.size) {
      shipsCount[ship.name]++;
    }
  }

  // Atualiza a lista no HTML
  shipsRemainingElement.innerHTML = '';
  for (let shipType of shipTypes) {
    if (shipsCount[shipType.name] > 0) {
      const li = document.createElement('li');
      li.textContent = `${shipType.name}: ${shipsCount[shipType.name]}`;
      shipsRemainingElement.appendChild(li);
    }
  }
}

function generateBoard(board, isPlayerBoard) {
  board.innerHTML = ''; // Limpa o tabuleiro antes de gerar
  for (let i = 0; i < 100; i++) {
    const button = document.createElement('button');
    button.dataset.index = i;
    if (isPlayerBoard) {
      button.addEventListener('click', () => handleShipPlacement(i));
    } else {
      button.addEventListener('click', () => handlePlayerShot(i));
    }
    board.appendChild(button);
  }
}

function handleShipPlacement(position) {
  if (!placingShips) return;

  // Verifica se já posicionou todas as embarcações
  if (currentShipIndex >= playerShipQueue.length) {
    return;
  }

  const currentShip = playerShipQueue[currentShipIndex];
  const shipSize = currentShip.size;
  const shipName = currentShip.name;

  let shipPositions = [];

  if (shipOrientation === 'vertical') {
    // Verifica se a embarcação cabe verticalmente
    if (Math.floor(position / 10) + shipSize > 10) {
      alert('Não é possível posicionar aqui.');
      return;
    }

    for (let i = 0; i < shipSize; i++) {
      const index = position + i * 10;
      const cell = playerBoard.children[index];
      if (cell.dataset.shipId) {
        alert('As embarcações não podem se sobrepor.');
        return;
      }
      shipPositions.push(index);
    }
  } else {
    // Verifica se a embarcação cabe horizontalmente
    if ((position % 10) + shipSize > 10) {
      alert('Não é possível posicionar aqui.');
      return;
    }

    for (let i = 0; i < shipSize; i++) {
      const index = position + i;
      const cell = playerBoard.children[index];
      if (cell.dataset.shipId) {
        alert('As embarcações não podem se sobrepor.');
        return;
      }
      shipPositions.push(index);
    }
  }

  // Posiciona a embarcação
  shipIdCounter++;
  const shipId = `player-${shipIdCounter}`;
  for (let index of shipPositions) {
    const cell = playerBoard.children[index];
    cell.classList.add('ship');
    cell.dataset.shipId = shipId;
  }

  playerShips.push({
    id: shipId,
    name: shipName,
    size: shipSize,
    positions: shipPositions,
    hits: 0
  });

  logAction(`Embarcação ${shipName} de tamanho ${shipSize} posicionada.`);

  currentShipIndex++;
  if (currentShipIndex >= playerShipQueue.length) {
    placingShips = false;
    logAction('Você posicionou todas as suas embarcações.');
    startGameButton.disabled = false;
  } else {
    const nextShip = playerShipQueue[currentShipIndex];
    logAction(`Posicione sua embarcação: ${nextShip.name} de tamanho ${nextShip.size}.`);
  }

  updateShipsRemaining('player'); // Atualiza a lista de embarcações restantes do jogador
}

function placeOpponentShips() {
  opponentShips = [];
  opponentShipIdCounter = 0;

  initializeOpponentShipQueue();

  for (let shipData of opponentShipQueue) {
    let position;
    let valid;
    let orientation;
    let shipPositions = [];

    do {
      position = Math.floor(Math.random() * 100);
      orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      valid = true;
      shipPositions = [];

      if (orientation === 'vertical') {
        // Verifica se a embarcação cabe verticalmente
        if (Math.floor(position / 10) + shipData.size > 10) {
          valid = false;
          continue;
        }

        for (let i = 0; i < shipData.size; i++) {
          const index = position + i * 10;
          if (index >= 100 || opponentBoard.children[index].dataset.shipId) {
            valid = false;
            break;
          }
          shipPositions.push(index);
        }
      } else {
        // Verifica se a embarcação cabe horizontalmente
        if ((position % 10) + shipData.size > 10) {
          valid = false;
          continue;
        }

        for (let i = 0; i < shipData.size; i++) {
          const index = position + i;
          if (index >= 100 || opponentBoard.children[index].dataset.shipId) {
            valid = false;
            break;
          }
          shipPositions.push(index);
        }
      }
    } while (!valid);

    opponentShipIdCounter++;
    const shipId = `opponent-${opponentShipIdCounter}`;

    // Posiciona a embarcação
    for (let index of shipPositions) {
      const cell = opponentBoard.children[index];
      cell.dataset.shipId = shipId;
    }

    opponentShips.push({
      id: shipId,
      name: shipData.name,
      size: shipData.size,
      positions: shipPositions,
      hits: 0
    });
  }

  // Esconde as embarcações do oponente
  for (let i = 0; i < 100; i++) {
    opponentBoard.children[i].classList.remove('ship');
  }

  updateShipsRemaining('opponent'); // Atualiza a lista de embarcações restantes do oponente
}

function handlePlayerShot(position) {
  if (!isPlayerTurn || placingShips) return;

  const cell = opponentBoard.children[position];
  if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
    return;
  }

  const column = String.fromCharCode(65 + (position % 10));
  const row = Math.floor(position / 10) + 1;

  if (cell.dataset.shipId) {
    cell.classList.add('hit');
    cell.style.backgroundColor = '#f00';
    const shipId = cell.dataset.shipId;
    const ship = opponentShips.find(s => s.id === shipId);
    ship.hits++;
    logAction(`Você lançou um tiro em ${column}${row} e acertou o ${ship.name} do oponente.`);

    if (ship.hits === ship.size) {
      playerScore++;
      playerScoreElement.textContent = playerScore;
      logAction(`Você afundou o ${ship.name} do oponente!`);
      updateShipsRemaining('opponent'); // Atualiza a lista de embarcações restantes do oponente
    }

  } else {
    cell.classList.add('miss');
    cell.style.backgroundColor = '#00f';
    logAction(`Você lançou um tiro em ${column}${row} e deu água.`);
  }

  isPlayerTurn = false;
  checkWinCondition();
  if (!isPlayerTurn) {
    setTimeout(opponentTurn, 1000);
  }
}

function opponentTurn() {
  let position;
  let cell;
  do {
    position = Math.floor(Math.random() * 100);
    cell = playerBoard.children[position];
  } while (cell.classList.contains('hit') || cell.classList.contains('miss'));

  const column = String.fromCharCode(65 + (position % 10));
  const row = Math.floor(position / 10) + 1;

  if (cell.dataset.shipId) {
    cell.classList.add('hit');
    cell.style.backgroundColor = '#f00';
    const shipId = cell.dataset.shipId;
    const ship = playerShips.find(s => s.id === shipId);
    ship.hits++;
    logAction(`O oponente lançou um tiro em ${column}${row} e acertou seu ${ship.name}.`);

    if (ship.hits === ship.size) {
      opponentScore++;
      opponentScoreElement.textContent = opponentScore;
      logAction(`Seu oponente afundou seu ${ship.name}!`);
      updateShipsRemaining('player'); // Atualiza a lista de embarcações restantes do jogador
    }

  } else {
    cell.classList.add('miss');
    cell.style.backgroundColor = '#00f';
    logAction(`O oponente lançou um tiro em ${column}${row} e deu água.`);
  }

  isPlayerTurn = true;
  checkWinCondition();
}

function checkWinCondition() {
  if (playerScore === totalShips) {
    logAction('Você venceu o jogo!');
    isPlayerTurn = false;
  } else if (opponentScore === totalShips) {
    logAction('Você perdeu o jogo.');
    isPlayerTurn = false;
  }
}

function startGame() {
  if (placingShips) {
    alert('Posicione todas as suas embarcações antes de iniciar o jogo.');
    return;
  }

  // Limpa o tabuleiro do oponente e gera um novo
  generateBoard(opponentBoard, false);
  initializeOpponentShipQueue();
  placeOpponentShips();

  isPlayerTurn = true;
  startGameButton.disabled = true;
  rotateShipButton.disabled = true; // Desabilita o botão de girar após o jogo iniciar
  logAction('O jogo começou!');
  updateShipsRemaining('opponent'); // Atualiza a lista de embarcações restantes do oponente
}

function logAction(message) {
  const logEntry = document.createElement('p');
  logEntry.textContent = message;
  actionLog.appendChild(logEntry);
  actionLog.scrollTop = actionLog.scrollHeight;
}

// Alternar a orientação da embarcação
rotateShipButton.addEventListener('click', () => {
  shipOrientation = shipOrientation === 'vertical' ? 'horizontal' : 'vertical';
  logAction(`Orientação da embarcação alterada para ${shipOrientation}.`);
});

// Inicializa o tabuleiro do jogador e a fila de embarcações
generateBoard(playerBoard, true);
initializePlayerShipQueue();
updateShipsRemaining('player'); // Atualiza a lista de embarcações restantes do jogador

startGameButton.addEventListener('click', startGame);
