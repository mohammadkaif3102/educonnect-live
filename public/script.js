// Firebase ke tools import kar rahe hain
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- FIREBASE CONFIG (Aapka wala code) ---
const firebaseConfig = {
  apiKey: "AIzaSyAHdamZZK-N91BmXgj2zmWfp0PWyjEFMDs",
  authDomain: "educonnect1.firebaseapp.com",
  projectId: "educonnect1",
  storageBucket: "educonnect1.firebasestorage.app",
  messagingSenderId: "698482293737",
  appId: "1:698482293737:web:0540f786aedb93f781e978"
};
// ----------------------------------------------------

// Firebase start
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Variables
const socket = io('/');
let myPeer;
let canvas; // Whiteboard

// --- 1. LOGIN SYSTEM ---
window.loginWithGoogle = () => {
    signInWithPopup(auth, provider).then((result) => {
        const user = result.user;
        // Login screen chupao, Dashboard dikhao
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'block';
        document.getElementById('user-name').innerText = `Welcome, ${user.displayName}`;
    }).catch((error) => {
        console.error(error);
        alert("Login failed: " + error.message);
    });
};

// --- 2. ROOM JOIN SYSTEM ---
window.joinStudyRoom = () => {
    const topic = document.getElementById('room-input').value;
    if (!topic) return alert("Please enter a topic (e.g., Math)!");
    
    // Dashboard chupao, Room dikhao
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('room-screen').style.display = 'block';
    document.getElementById('current-room-id').innerText = `Studying: ${topic}`;

    startMeeting(topic);
};

// --- 3. MEETING SYSTEM (VIDEO + WHITEBOARD) ---
function startMeeting(roomId) {
    // A. Whiteboard Setup
    canvas = new fabric.Canvas('whiteboard', { isDrawingMode: true });
    canvas.freeDrawingBrush.width = 5;
    canvas.freeDrawingBrush.color = 'black';

    // Mere draw karne par server ko batao
    canvas.on('path:created', (e) => {
        socket.emit('draw', JSON.stringify(e.path));
    });

    // Dusre ke draw karne par mere board par dikhao
    socket.on('draw', (data) => {
        fabric.util.enlivenObjects([JSON.parse(data)], (objects) => {
            objects.forEach((o) => canvas.add(o));
        });
    });

    // B. Video Setup
    const myVideo = document.createElement('video');
    myVideo.muted = true; // Apni awaaz wapas na aaye

    // --- FIX: PEERJS SETUP (Hosting Ready) ---
    // Yeh code ab Localhost aur Render dono par chalega
    myPeer = new Peer(undefined, {
        path: '/peerjs',
        host: '/',
        port: location.port || (location.protocol === 'https:' ? 443 : 80)
    });

    // Camera chalu karo
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        addVideoStream(myVideo, stream);

        // Jab koi dusra call kare (Answer)
        myPeer.on('call', call => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream);
            });
        });

        // Naye user ko call karo (Call)
        socket.on('user-connected', userId => {
            connectToNewUser(userId, stream);
        });
    });

    // Room Join
    myPeer.on('open', id => {
        socket.emit('join-room', roomId, id);
    });
}

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => { video.remove(); });
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => { video.play(); });
    document.getElementById('video-grid').append(video);
}

// --- TOOLS ---
window.changeColor = (color) => { canvas.freeDrawingBrush.color = color; };
window.clearBoard = () => { canvas.clear(); };
window.leaveRoom = () => { location.reload(); };

// --- 4. ACTIVE ROOMS LISTENER ---
socket.on('update-room-list', (rooms) => {
    const listContainer = document.getElementById('active-rooms-list');
    listContainer.innerHTML = ''; 

    const roomNames = Object.keys(rooms);

    if (roomNames.length === 0) {
        listContainer.innerHTML = '<p style="color: gray;">Abhi koi active room nahi hai. Aap naya banayein!</p>';
        return;
    }

    roomNames.forEach(room => {
        const count = rooms[room];
        
        const roomCard = document.createElement('div');
        roomCard.style.cssText = "background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer; border: 1px solid #ddd; width: 150px;";
        
        roomCard.innerHTML = `
            <h4 style="margin:0; color: #007bff;">${room}</h4>
            <p style="margin:5px 0; font-size: 14px;">👥 ${count} log padh rahe hain</p>
        `;

        roomCard.onclick = () => {
            document.getElementById('room-input').value = room;
            joinStudyRoom();
        };

        listContainer.appendChild(roomCard);
    });
});