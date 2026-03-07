// frontend/network.js

// Tenta conectar no servidor que criamos no passo 1
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Conectado ao servidor com sucesso! Meu ID é:', socket.id);
});