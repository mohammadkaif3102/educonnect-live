const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const path = require('path'); 

const peerServer = ExpressPeerServer(server, { debug: true });

app.use('/peerjs', peerServer);

// Public folder setup
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- LIST LOGIC ---
let activeRooms = {}; 

io.on('connection', socket => {
  socket.emit('update-room-list', activeRooms);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.currentRoom = roomId; 

    if (activeRooms[roomId]) activeRooms[roomId]++;
    else activeRooms[roomId] = 1;

    io.emit('update-room-list', activeRooms);
    
    socket.to(roomId).emit('user-connected', userId);
    socket.on('draw', (data) => socket.to(roomId).emit('draw', data));

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
      if (socket.currentRoom && activeRooms[socket.currentRoom]) {
          activeRooms[socket.currentRoom]--;
          if (activeRooms[socket.currentRoom] <= 0) delete activeRooms[socket.currentRoom];
          io.emit('update-room-list', activeRooms);
      }
    });
  });
});

// --- NEW LISTENER CODE (Hosting ke liye) ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server chal raha hai: Port ${PORT}`);
});