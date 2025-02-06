const url = 'https://buggy-bogey-5018da91b622.herokuapp.com/:8080';
const messageQueue = [];
let gameCode = localStorage.getItem('gameCode') || null;
let playerNum = localStorage.getItem('playerNum') || null;

let socket = new WebSocket(url);

socket.addEventListener('open', () => {
    while (messageQueue.length > 0) {
        socket.send(JSON.stringify(messageQueue.shift()));
    }
    /*if (gameCode) {
        sendToServer({ type: "checkgame", code: gameCode });
    }
        THIS IS INTENDED TO RECONNECT WHEN CONNECTION IS DROPPED UNINTENTIONALLY
        CREATED A LOOP OF RECONNECTING TOO FAST AND BROKE EVERYTHING
        FIX THIS LATER LIKELY WITH SETTIMEOUT() OR SETINTERVAL()
    */
});
socket.addEventListener('close', () => {
    console.warn('WebSocket closed')
});
socket.addEventListener('error', (err) => console.error('WebSocket error:', err));

socket.addEventListener('message', (event) => {
    try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (data.type === 'gamestate') {
            if (data.message === 'valid') {
                playerNum = data.playerNum;
                localStorage.setItem('playerNum', playerNum);
                gameCode = data.code;
                localStorage.setItem('gameCode', gameCode);
                window.location.href = 'game.html';
            }
        }
    } catch (error) {
        console.error('Invalid JSON received:', event.data);
    }
});

document.addEventListener('DOMContentLoaded', () => {

    const aimDiv = document.getElementById('aim');
    const shootDiv = document.getElementById('shoot');
    const joinButton = document.getElementById('joinGameButton');
    const gameCodeInput = document.getElementById('gameCodeInput');

    if (joinButton && gameCodeInput) {
        joinButton.addEventListener('click', () => {
            const enteredCode = gameCodeInput.value.trim();
            if (enteredCode && Number.isInteger(Number(enteredCode)) 
            && (Number(enteredCode) > 999 && Number(enteredCode) < 10000)) {
                sendToServer({ type: 'checkgame', code: enteredCode });
            } else {
                console.warn('Please enter a valid game code. You entered: ', enteredCode);
            }
        });
    }

    let startX = 0;
    let startY = 0;
    let deltaY = 0;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (aimDiv) {
        const aimHammer = new Hammer(aimDiv);
        aimHammer.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });

        aimHammer.on('panstart', (event) => {startX = event.center.x});
        aimHammer.on('panmove', (event) => {
            const deltaX = event.center.x - startX;

            if (deltaX > 0) {
                handlePanRight(deltaX);
            } else if (deltaX < 0) {
                handlePanLeft(deltaX);
            }
            startX = event.center.x;
        });
        aimHammer.on('panend', () => {startX = 0});
    }

    function handlePanRight(deltaX) {
        const distancePercent = Math.min(Math.max((deltaX / screenWidth) * 100, -100), 100);
        const distance =  toString(roundValue(distancePercent));
        sendToServer({ type: 'aim', distance: distance, code: gameCode, player: playerNum });
    }
    function handlePanLeft(deltaX) {
        const distancePercent = Math.min(Math.max((deltaX / screenWidth) * 100, -100), 100);
        const distance =  toString(roundValue(distancePercent));
        sendToServer({ type: 'aim', distance: distance, code: gameCode, player: playerNum });
    }

    if (shootDiv) {
        const shootHammer = new Hammer(shootDiv)
        shootHammer.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });
    
        shootHammer.on('panstart', (event) => {startY = event.center.y});
        shootHammer.on('panmove', (event) => {deltaY = event.center.y - startY});
        shootHammer.on('panend', () => {
            const distancePercent = Math.min(Math.max((deltaY / screenHeight) * 100, -100), 100);
            const distance = roundValue(distancePercent)*2;
            sendToServer({ type: 'shoot', distance: distance, code: gameCode, player: playerNum });
            startY = 0;
        });
    }
});

function sendToServer(message) {
    const jsonMessage = JSON.stringify(message);
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(jsonMessage);
    } else {
        messageQueue.push(jsonMessage);
    }
}

function roundValue(value) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
}