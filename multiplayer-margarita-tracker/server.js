const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store sessions
const sessions = new Map();

// Serve static files
app.use(express.static('public'));

// Generate new session ID
app.get('/new-session', (req, res) => {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
        players: [],
        locations: [],
        ratings: [],
        admin: null,
        state: 'waiting'
    });
    res.json({ sessionId });
});

// Get session info
app.get('/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json({ session });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-session', ({ sessionId, playerName, isAdmin }) => {
        const session = sessions.get(sessionId);
        if (!session) {
            socket.emit('error', 'Invalid session ID');
            return;
        }

        if (isAdmin && session.admin) {
            socket.emit('error', 'Admin already exists');
            return;
        }

        session.players.push({ id: socket.id, name: playerName, isAdmin });
        if (isAdmin) session.admin = socket.id;

        socket.join(sessionId);
        io.to(sessionId).emit('session-update', session);
    });

    socket.on('add-location', ({ sessionId, locationName }) => {
        const session = sessions.get(sessionId);
        if (!session || !session.admin || session.admin !== socket.id) {
            socket.emit('error', 'Only admin can add locations');
            return;
        }

        session.locations.push({ name: locationName, ratings: [] });
        io.to(sessionId).emit('session-update', session);
    });

    socket.on('rate-location', ({ sessionId, locationId, ratings }) => {
        const session = sessions.get(sessionId);
        if (!session || !session.locations[locationId]) {
            socket.emit('error', 'Invalid location');
            return;
        }

        const player = session.players.find(p => p.id === socket.id);
        if (!player) {
            socket.emit('error', 'Player not found');
            return;
        }

        session.locations[locationId].ratings.push({
            player: player.name,
            ratings,
            timestamp: new Date()
        });

        io.to(sessionId).emit('session-update', session);
    });

    socket.on('reset-session', ({ sessionId }) => {
        const session = sessions.get(sessionId);
        if (!session || !session.admin || session.admin !== socket.id) {
            socket.emit('error', 'Only admin can reset session');
            return;
        }

        session.locations = [];
        session.ratings = [];
        session.state = 'waiting';
        io.to(sessionId).emit('session-update', session);
    });

    socket.on('disconnect', () => {
        sessions.forEach((session, sessionId) => {
            const playerIndex = session.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                session.players.splice(playerIndex, 1);
                if (session.admin === socket.id) {
                    session.admin = null;
                    session.state = 'waiting';
                }
                io.to(sessionId).emit('session-update', session);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
