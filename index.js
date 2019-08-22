const startButton = document.querySelector('.start-button');
const localVideo = document.querySelector('.local-video');
const remoteVideo = document.querySelector('.remote-video');

const socket = io();
let started, peerId;

navigator.mediaDevices.getUserMedia({video: true})
    .then(function(mediaStream) {
        localVideo.srcObject = mediaStream;
    });

let peerConnection;
function createPeerConnection() {
    peerConnection = new RTCPeerConnection;
    peerConnection.addEventListener('track', event => {
        remoteVideo.srcObject = event.streams[0];
    });
    peerConnection.addStream(localVideo.srcObject);
}

function changeStartButton(state) {
    if (state == 'start') {
        startButton.innerHTML = 'Start';
    } else {
        startButton.innerHTML = 'Stop';
    }
    started = state != 'start';
}

startButton.addEventListener('click', function() {
    if (started) {
        socket.emit('stop');
    } else {
        socket.emit('start');
    }
});

socket.on('connect', function() {
    startButton.disabled = false;
    changeStartButton('start');
});
socket.on('start', function(startedConnections) {
    changeStartButton('stop');
    peerId = startedConnections.find(id => id != socket.id);
    if (peerId) {
        socket.emit('commutate', peerId);
        createPeerConnection();
        peerConnection.addEventListener('icecandidate', function(event) {
            if (event.candidate) {
                console.log('from: got ice candidate', event.candidate.candidate.substring(0, 20) + '...');
                socket.emit('iceCandidate', peerId, event.candidate);
            }
        });
        peerConnection.createOffer().then(function(description) {
            console.log('from: created offer, setLocalDescription');
            peerConnection.setLocalDescription(description);
            socket.emit('description', peerId, description);
        });
    }
});
function stop() {
    peerId = null;
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    changeStartButton('start');
}
socket.on('stop', stop);
socket.on('disconnect', stop);
socket.on('description', function(fromId, description){
    switch (description.type) {
    case 'offer':
        peerId = fromId;
        createPeerConnection();
        console.log('to: got offer, setRemoteDescription');
        peerConnection.setRemoteDescription(description);
        peerConnection.createAnswer().then(description => {
            console.log('to: created answer, setLocalDescription');
            peerConnection.setLocalDescription(description);
            socket.emit('description', peerId, description);
        });
        break;
    case 'answer':
        console.log('from: got answer, setRemoteDescription');
        peerConnection.setRemoteDescription(description);
        break;
    }
});
socket.on('iceCandidate', function(fromId, iceCandidate){
    console.log('to: got ice candidate', iceCandidate.candidate.substring(0, 20) + '...');
    peerConnection.addIceCandidate(iceCandidate);
});
