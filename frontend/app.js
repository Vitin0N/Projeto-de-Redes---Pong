// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ─── Constantes visuais ───────────────────────────────────────────────────────
const PADDLE_WIDTH  = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE     = 10;

// ─── Estado local ─────────────────────────────────────────────────────────────
let stateDoServidor = null;
let role    = null;   // 'p1' | 'p2' | 'spectator'
let specpos = null;   // posição na fila
let score   = { p1: 0, p2: 0 };
let gameOverData  = null;  // null | 'p1' | 'p2'
let youLost = false;
let ballSpeedDisplay = 4; // valor visual da velocidade

// Animação de ponto
let pointFlash = null; // { side: 'left'|'right', timer: 30 }

// ─── Eventos do servidor ──────────────────────────────────────────────────────
socket.on('gameState', (state) => {
    stateDoServidor = state;
    if (state.ballSpeed !== undefined) ballSpeedDisplay = state.ballSpeed;
    draw();
});

socket.on('playerRole', (r) => {
    role = r;
    youLost = false;

    // Mostra/esconde botão de restart
    updateRestartButton();
    updateRoleOverlay();
});

socket.on('queuePosition', (pos) => {
    specpos = pos;
});

socket.on('scoreUpdate', (s) => {
    score = s;
});

socket.on('gameOver', (w) => {
    gameOverData = w;
    if (w) draw(); // Força redesenho imediato
});

socket.on('youLost', () => {
    youLost = true;
});

// ─── Botão Reiniciar ─────────────────────────────────────────────────────────
function updateRestartButton() {
    const btn = document.getElementById('restartBtn');
    if (!btn) return;
    btn.style.display = (role === 'p1' || role === 'p2') ? 'inline-block' : 'none';
}

document.getElementById('restartBtn')?.addEventListener('click', () => {
    socket.emit('requestRestart');
    gameOverData = null;
});

// ─── Overlay de papel ────────────────────────────────────────────────────────
function updateRoleOverlay() {
    const overlay = document.getElementById('roleOverlay');
    if (!overlay) return;

    if (role === 'p1') {
        overlay.innerHTML = `<span class="role-badge p1-badge">⬅ JOGADOR 1</span>`;
    } else if (role === 'p2') {
        overlay.innerHTML = `<span class="role-badge p2-badge">JOGADOR 2 ➡</span>`;
    } else {
        overlay.innerHTML = `<span class="role-badge spec-badge">👁 ESPECTADOR</span>`;
    }
}

// ─── Desenho ──────────────────────────────────────────────────────────────────
function draw() {
    if (!stateDoServidor) return;

    // Limpa
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grade sutil de fundo
    drawGrid();

    // Linha central
    drawCenterLine();

    // Placar
    drawScore();

    // Raquetes
    drawPaddle(20,                 stateDoServidor.p1.y, 'p1');
    drawPaddle(canvas.width - 30,  stateDoServidor.p2.y, 'p2');

    // Bola
    drawBall();

    // Flash de ponto
    if (pointFlash) {
        drawPointFlash();
        pointFlash.timer--;
        if (pointFlash.timer <= 0) pointFlash = null;
    }

    // HUD (ping, fila, velocidade)
    drawHUD();

    // Tela de Game Over
    if (gameOverData) {
        drawGameOver(gameOverData);
    }

    // Tela "aguardando jogador"
    if (!gameOverData && stateDoServidor && (!stateDoServidor.p1 || !stateDoServidor.p2)) {
        // servidor não envia flag de "waiting", mas podemos inferir se placar está zerado e bola parada
    }
}

// ─── Componentes visuais ─────────────────────────────────────────────────────

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
}

function drawCenterLine() {
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.lineWidth   = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font      = 'bold 56px "Courier New", monospace';
    ctx.textAlign = 'center';

    // P1 score
    const p1Color = role === 'p1' ? '#00ff88' : 'rgba(255,255,255,0.7)';
    ctx.fillStyle = p1Color;
    ctx.fillText(score.p1, canvas.width / 2 - 80, 70);

    // P2 score
    const p2Color = role === 'p2' ? '#00ff88' : 'rgba(255,255,255,0.7)';
    ctx.fillStyle = p2Color;
    ctx.fillText(score.p2, canvas.width / 2 + 80, 70);

    // Separador
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillText(':', canvas.width / 2, 66);

    ctx.restore();
}

function drawPaddle(x, y, player) {
    ctx.save();

    const isMe = role === player;

    // Sombra / glow
    if (isMe) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 15;
    } else {
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur  = 6;
    }

    // Corpo da raquete
    const gradient = ctx.createLinearGradient(x, y, x + PADDLE_WIDTH, y + PADDLE_HEIGHT);
    if (isMe) {
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(1, '#00cc66');
    } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#aaaaaa');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT, 3);
    ctx.fill();

    ctx.restore();
}

function drawBall() {
    const bx = stateDoServidor.ball.x;
    const by = stateDoServidor.ball.y;

    ctx.save();

    // Rastro (trail simples)
    const speedRatio = Math.min(ballSpeedDisplay / 12, 1);
    ctx.shadowColor = `rgba(255, ${Math.floor(200 - speedRatio * 180)}, 0, 0.8)`;
    ctx.shadowBlur  = 6 + speedRatio * 14;

    // Cor muda conforme velocidade: branca → laranja → vermelha
    const r = 255;
    const g = Math.floor(255 - speedRatio * 255);
    const b = 0;
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    ctx.beginPath();
    ctx.roundRect(bx, by, BALL_SIZE, BALL_SIZE, 2);
    ctx.fill();

    ctx.restore();
}

function drawHUD() {
    ctx.save();
    ctx.font      = '13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';

    // Ping
    const ping = typeof currentPing !== 'undefined' ? currentPing : 0;
    const pingColor = ping < 50 ? '#00ff88' : ping < 120 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = pingColor;
    ctx.fillText(`PING ${ping}ms`, 10, canvas.height - 10);

    // Velocidade da bola
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const speedPct = Math.round(((ballSpeedDisplay - 4) / (12 - 4)) * 100);
    ctx.fillText(`VEL ${Math.max(0, speedPct)}%`, 10, canvas.height - 28);

    // Posição na fila (espectadores)
    if (role === 'spectator' && specpos) {
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 200, 50, 0.7)';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(`⏳ Fila: #${specpos}`, canvas.width - 10, canvas.height - 10);
    }

    ctx.restore();
}

function drawGameOver(winnerKey) {
    ctx.save();

    // Overlay escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const isWinner = role === winnerKey;
    const isLoser  = (role === 'p1' || role === 'p2') && !isWinner;

    // Título principal
    ctx.textAlign = 'center';

    if (isWinner) {
        ctx.fillStyle = '#00ff88';
        ctx.font      = 'bold 54px "Courier New", monospace';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 30;
        ctx.fillText('VITÓRIA!', canvas.width / 2, canvas.height / 2 - 40);
    } else if (isLoser) {
        ctx.fillStyle = '#ff4444';
        ctx.font      = 'bold 54px "Courier New", monospace';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur  = 30;
        ctx.fillText('DERROTA', canvas.width / 2, canvas.height / 2 - 40);
    } else {
        // Espectador
        const label = winnerKey === 'p1' ? 'JOGADOR 1' : 'JOGADOR 2';
        ctx.fillStyle = '#ffffff';
        ctx.font      = 'bold 38px "Courier New", monospace';
        ctx.fillText(`${label} VENCEU!`, canvas.width / 2, canvas.height / 2 - 40);
    }

    ctx.shadowBlur = 0;

    // Placar final
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font      = '22px "Courier New", monospace';
    ctx.fillText(`${score.p1}  :  ${score.p2}`, canvas.width / 2, canvas.height / 2 + 10);

    // Mensagem secundária
    ctx.font      = '15px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';

    if (isLoser) {
        ctx.fillText('Você entrou na fila de espera...', canvas.width / 2, canvas.height / 2 + 50);
    } else if (isWinner) {
        ctx.fillText('Aguardando próximo desafiante...', canvas.width / 2, canvas.height / 2 + 50);
    } else {
        ctx.fillText('Nova partida iniciando em breve...', canvas.width / 2, canvas.height / 2 + 50);
    }

    // Instrução de reiniciar (só para jogadores)
    if (role === 'p1' || role === 'p2') {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
        ctx.font      = '14px "Courier New", monospace';
        ctx.fillText('[ Pressione R ou clique em REINICIAR ]', canvas.width / 2, canvas.height / 2 + 80);
    }

    ctx.restore();
}

// ─── Teclado ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        socket.emit('move', { key: e.key, isPressed: true });
    }
    if (e.key === 'r' || e.key === 'R') {
        if (role === 'p1' || role === 'p2') {
            socket.emit('requestRestart');
            gameOverData = null;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        socket.emit('move', { key: e.key, isPressed: false });
    }
});

// ─── Primeiro draw ────────────────────────────────────────────────────────────
draw();