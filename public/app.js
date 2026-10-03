const socket = io();

// UI Elements
const authScreen = document.getElementById('authScreen');
const chatApp = document.getElementById('chatApp');
const usernameInput = document.getElementById('usernameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const codeGroup = document.getElementById('codeGroup');
const mainActions = document.getElementById('mainActions');
const joinActions = document.getElementById('joinActions');
const errorText = document.getElementById('errorText');

const displayRoomCode = document.getElementById('displayRoomCode');
const membersList = document.getElementById('membersList');
const messagesArea = document.getElementById('messagesArea');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let currentUsername = '';

function showError(msg) {
    errorText.textContent = msg;
    errorText.style.display = 'block';
}

function clearError() {
    errorText.textContent = '';
    errorText.style.display = 'none';
}

function showJoinMode() {
    if (!usernameInput.value.trim()) {
        showError('Please enter a username first.');
        return;
    }
    clearError();
    codeGroup.style.display = 'block';
    mainActions.style.display = 'none';
    joinActions.style.display = 'flex';
}

function resetAuthView() {
    clearError();
    codeGroup.style.display = 'none';
    mainActions.style.display = 'flex';
    joinActions.style.display = 'none';
}

function hostRoom() {
    const username = usernameInput.value.trim();
    if (!username) {
        showError('Please enter a username.');
        return;
    }
    currentUsername = username;
    socket.emit('host_room', { username });
}

function joinRoom() {
    const username = usernameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();

    if (!username || !roomCode) {
        showError('Please provide both a username and a room code.');
        return;
    }

    currentUsername = username;
    socket.emit('join_room', { username, roomCode });
}

function enterChatUI(roomCode) {
    authScreen.style.display = 'none';
    chatApp.style.display = 'flex';
    displayRoomCode.textContent = roomCode;
}

// Socket Event Handlers
socket.on('room_created', ({ roomCode }) => {
    enterChatUI(roomCode);
});

socket.on('room_joined', ({ roomCode }) => {
    enterChatUI(roomCode);
});

socket.on('error_message', (msg) => {
    showError(msg);
});

socket.on('update_users', (users) => {
    membersList.innerHTML = '';
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-item';
        item.innerHTML = `<span class="dot"></span> ${escapeHTML(user)} ${user === currentUsername ? '(You)' : ''}`;
        membersList.appendChild(item);
    });
});

socket.on('receive_message', ({ username, text, time }) => {
    appendMessage({ username, text, time, isUser: false });
});

socket.on('message_sent', ({ text, time }) => {
    appendMessage({ username: 'You', text, time, isUser: true });
});

socket.on('system_message', (text) => {
    const sysEl = document.createElement('div');
    sysEl.className = 'system-msg';
    sysEl.textContent = text;
    messagesArea.appendChild(sysEl);
    messagesArea.scrollTop = messagesArea.scrollHeight;
});

// Form submission
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text) {
        socket.emit('send_message', text);
        messageInput.value = '';
    }
});

function appendMessage({ username, text, time, isUser }) {
    const msgEl = document.createElement('div');
    msgEl.className = `msg ${isUser ? 'sent' : 'received'}`;
    
    msgEl.innerHTML = `
        ${!isUser ? `<span class="sender-name">${escapeHTML(username)}</span>` : ''}
        <div>${escapeHTML(text)}</div>
        <div class="msg-time">${time}</div>
    `;
    
    messagesArea.appendChild(msgEl);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}