// 1. Pegando o "pincel" e a "tela"
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 2. Definindo as dimensões fixas dos elementos (como se fossem as regras do mundo)
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

// O estado começa vazio, esperando as ordens do servidor
let stateDoServidor = null;
let role = null;
let specpos = null;

// Função matemática de suavização (Linear Interpolation)
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// O estado visual do cliente (começa no centro)
let clientState = {
    p1: { y: 150 },
    p2: { y: 150 },
    ball: { x: 400, y: 200 }
};

const LERP_FACTOR = 0.15; // Quão rápido ele tenta alcançar o servidor (0.1 a 0.3 é o ideal)

// O socket agora APENAS atualiza o estado alvo. O desenho acontece em paralelo.
socket.on('gameState', (state) => {
    stateDoServidor = state;
});

socket.on('playerRole', (playerrole) => {
    role = playerrole;
});

socket.on('queuePosition', (pos) => {
    specpos = pos;
});

// 3. O Game Loop: A função que roda continuamente na frequência do monitor (ex: 60 FPS)
function renderLoop() {
    // Se já recebemos algum estado do servidor, calculamos a interpolação
    if (stateDoServidor) {
        // Desliza o estado visual (clientState) em direção ao estado real (stateDoServidor)
        clientState.ball.x = lerp(clientState.ball.x, stateDoServidor.ball.x, LERP_FACTOR);
        clientState.ball.y = lerp(clientState.ball.y, stateDoServidor.ball.y, LERP_FACTOR);
        clientState.p1.y = lerp(clientState.p1.y, stateDoServidor.p1.y, LERP_FACTOR);
        clientState.p2.y = lerp(clientState.p2.y, stateDoServidor.p2.y, LERP_FACTOR);
    }

    // Limpa a tela inteira a cada frame
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cor base e fonte
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';

    // --- HUD (Heads-Up Display) ---
    // Exibição do RTT (Ping) no canto esquerdo
    ctx.textAlign = 'left';
    ctx.fillText(`Ping: ${typeof currentPing !== 'undefined' ? currentPing : 0}ms`, 10, 30);

    // Informação da posição da fila de espectadores no canto direito
    ctx.textAlign = 'right';
    if(specpos){
        ctx.fillText(`Posição na fila: ${specpos}`, canvas.width - 10, 30);
    }

    // --- DESENHO DOS ELEMENTOS (Usando estritamente o clientState) ---
    
    // Raquete esquerda (P1)
    if(role == 'p1'){
        ctx.fillStyle = 'green';
        ctx.fillRect(20, clientState.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.fillStyle = 'white';  
    } else {
        ctx.fillRect(20, clientState.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);    
    }
    
    // Raquete direita (P2)
    if (role == 'p2'){
        ctx.fillStyle = 'green';
        ctx.fillRect(canvas.width - 30, clientState.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.fillStyle = 'white';
    } else {
        ctx.fillRect(canvas.width - 30, clientState.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    }

    // Bola
    ctx.fillRect(clientState.ball.x, clientState.ball.y, BALL_SIZE, BALL_SIZE);
    
    // Linha do meio
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Requisita ao navegador o próximo frame de animação para manter o loop rodando
    requestAnimationFrame(renderLoop);
}

// Inicia o Game Loop pela primeira vez
requestAnimationFrame(renderLoop);

// --- CONTROLES DE INPUT ---
// Escuta quando o jogador APERTA a tecla
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        socket.emit('move', { key: event.key, isPressed: true });
    }
});

// Escuta quando o jogador LIBERA a tecla
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        socket.emit('move', { key: event.key, isPressed: false });
    }
});