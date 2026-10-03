const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static frontend files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Store active temporary rooms
// Structure: { ROOM_CODE: { hostId: socket.id, users: { socket.id: username } } }
const rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {

    // 1. Host creates a new group chat
    socket.on('host_room', ({ username }) => {
        let roomCode = generateRoomCode();
        while (rooms[roomCode]) {
            roomCode = generateRoomCode();
        }

        rooms[roomCode] = {
            hostId: socket.id,
            users: {}
        };

        rooms[roomCode].users[socket.id] = username;
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.username = username;

        socket.emit('room_created', { roomCode, username });
        io.to(roomCode).emit('update_users', Object.values(rooms[roomCode].users));
    });

    // 2. Friend joins an existing group chat via code
    socket.on('join_room', ({ username, roomCode }) => {
        const code = roomCode.trim().toUpperCase();

        if (!rooms[code]) {
            socket.emit('error_message', 'Invalid Room Code! Please check and try again.');
            return;
        }

        rooms[code].users[socket.id] = username;
        socket.join(code);
        socket.roomCode = code;
        socket.username = username;

        socket.emit('room_joined', { roomCode: code, username });
        
        // Notify others in room
        socket.to(code).emit('system_message', `${username} joined the chat!`);
        io.to(code).emit('update_users', Object.values(rooms[code].users));
    });

    // 3. Handle live messages
    socket.on('send_message', (text) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Send to everyone in the room except sender
        socket.to(roomCode).emit('receive_message', {
            username: socket.username,
            text,
            time,
            senderId: socket.id
        });

        // Confirm back to sender
        socket.emit('message_sent', {
            text,
            time
        });
    });

    // 4. Handle Disconnections
    socket.on('disconnect', () => {
        const roomCode = socket.roomCode;
        if (roomCode && rooms[roomCode]) {
            const username = socket.username;
            delete rooms[roomCode].users[socket.id];

            // Notify remaining users
            io.to(roomCode).emit('system_message', `${username} left the chat.`);
            io.to(roomCode).emit('update_users', Object.values(rooms[roomCode].users));

            // Clean up empty rooms
            if (Object.keys(rooms[roomCode].users).length === 0) {
                delete rooms[roomCode];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});