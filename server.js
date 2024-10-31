const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Game state
const gameState = {
    players: new Map(),
    stations: [
        { top: 8, left: 338, cost: 20 },
        { top: 479, left: 183, cost: 30 },
        { top: 123, left: 124, cost: 15 },
        { top: 300, left: 243, cost: 25 },
        { top: 185, left: 479, cost: 10 }
    ]
};

// Function to generate random spawn point
function getRandomSpawnPoint() {
    // Define possible spawn points at road intersections
    const spawnPoints = [
        { x: 115, y: 115 }, // Top-left intersection
        { x: 235, y: 115 }, // Top-middle intersection
        { x: 355, y: 115 }, // Top-right intersection
        { x: 115, y: 235 }, // Middle-left intersection
        { x: 235, y: 235 }, // Center intersection
        { x: 355, y: 235 }, // Middle-right intersection
        { x: 115, y: 355 }, // Bottom-left intersection
        { x: 235, y: 355 }, // Bottom-middle intersection
        { x: 355, y: 355 }  // Bottom-right intersection
    ];
    
    return spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
}

// Function to generate random color
function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
    return colors[Math.floor(Math.random() * colors.length)];
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Generate random spawn point and color for new player
    const spawnPoint = getRandomSpawnPoint();
    const playerColor = getRandomColor();

    // Initialize new player
    gameState.players.set(socket.id, {
        id: socket.id,
        positionX: spawnPoint.x,
        positionY: spawnPoint.y,
        color: playerColor,
        energy: 100,
        money: 100
    });

    // Send initial game state to new player
    socket.emit('gameState', {
        playerId: socket.id,
        players: Array.from(gameState.players.values()),
        stations: gameState.stations
    });

    // Broadcast new player to others
    socket.broadcast.emit('playerJoined', gameState.players.get(socket.id));

    // Handle player movement
    socket.on('movePlayer', (data) => {
        const player = gameState.players.get(socket.id);
        if (player && player.energy > 0) {
            player.positionX = data.positionX;
            player.positionY = data.positionY;
            player.energy = data.energy;
            io.emit('playerMoved', {
                id: socket.id,
                positionX: player.positionX,
                positionY: player.positionY,
                energy: player.energy
            });
        }
    });

    // Handle charging
    socket.on('charge', (data) => {
        const player = gameState.players.get(socket.id);
        if (player) {
            player.energy = data.energy;
            player.money = data.money;
            io.emit('playerCharged', {
                id: socket.id,
                energy: player.energy,
                money: player.money
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        gameState.players.delete(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});