const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const port = process.env.PORT || 3000;

const app = express();
app.use(express.static('.'));
const server = http.Server(app);
server.listen(port, function(){
    console.log('listening on *:' + port);
});
const io = socketIO(server, {path: '/ws'});

let nConnections = 0;
let availableConnections = [];

io.on('connect', function(socket) {
    console.log('connect', socket.id);

    socket.on('start', function() {
        nConnections++;
        availableConnections.push(socket.id);
        console.log('start', socket.id, nConnections, availableConnections);
        socket.emit('start', availableConnections);
    });

    socket.on('commutate', function(peerId) {
        availableConnections = availableConnections.filter(
            id => id != socket.id && id != peerId);
    });

    socket.on('stop', function() {
        nConnections--;
        availableConnections = availableConnections.filter(id => id != socket.id);
        console.log('stop', socket.id, nConnections, availableConnections);
        io.emit('stop', socket.id);
    });

    socket.on('disconnect', function(reason) {
        if (availableConnections.find(id => id == socket.id))
            nConnections--;
        availableConnections = availableConnections.filter(id => id != socket.id);
        console.log('disconnect', socket.id, nConnections, availableConnections);
        io.emit('stop', socket.id);
    });

    socket.on('description', function(toId, description) {
        console.log('description', socket.id);
        io.of('/').connected[toId].emit('description', socket.id, description);
    });

    socket.on('iceCandidate', function(toId, iceCandidate) {
        console.log('iceCandidate', socket.id);
        io.of('/').connected[toId].emit('iceCandidate', socket.id, iceCandidate);
    });
});
