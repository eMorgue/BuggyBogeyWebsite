const url = 'https://buggy-bogey-5018da91b622.herokuapp.com/:8080';
let gameCode = getCookie('gameCode') || null;
let playerNum = getCookie('playerNum') || null;
let playerID = getCookie('playerID') || null;
let currentTurn = '1';

let socket;

function connectWebSocket() {
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        socket.send(JSON.stringify({ type: 'idcheck', playerID: playerID }));
    });

    socket.addEventListener('close', () => {
        console.warn('WebSocket closed. Reconnecting in 5 seconds...');
        setTimeout(connectWebSocket, 5000);
    });

    socket.addEventListener('error', (err) => console.error('WebSocket error:', err));

    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);

            if (data.type === 'gamestate') {
                if (data.message === 'valid') {
                    setCookie('playerNum', data.playerNum, 1);
                    setCookie('gameCode', data.gameCode, 1);
                    // setCookie('playerID', data.playerID, 1);
                    document.body.style.backgroundImage = "url('images/UI_Player1Purple.png')";
                    window.location.href = 'game.html';
                }
            } else if (data.type === 'nextplayer') {
                currentTurn = data.num.toString();
            } else if (data.type === 'id') {
                if (playerID === null) {
                    playerID = data.playerID;
                    setCookie('playerID', playerID, 1);
                }
                else {
                    sendToServer({ type: 'idconfirm', playerID: playerID, gameCode: gameCode });
                }
            }
        } catch (error) {
            console.error('Invalid JSON received:', event.data);
        }
    });
}

connectWebSocket();

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
                sendToServer({ type: 'checkgame', gameCode: enteredCode, playerID: playerID });
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
            startX = event.center.x;
            
            const distancePercent = Math.min(Math.max((deltaX / screenWidth) * 100, -100), 100);
            const distance =  (roundValue(distancePercent)).toString();

            console.log(playerNum, " | ", currentTurn);
            if (playerNum === currentTurn) {
                sendToServer({ type: 'aim', distance: distance, gameCode: gameCode, playerNum: playerNum, playerID: playerID });
            }
        });
        aimHammer.on('panend', () => {startX = 0});
    }

    if (shootDiv) {
        const shootHammer = new Hammer(shootDiv)
        shootHammer.get('pan').set({ direction: Hammer.DIRECTION_UP });
    
        shootHammer.on('panstart', (event) => {startY = event.center.y});
        shootHammer.on('panmove', (event) => {deltaY = event.center.y - startY});
        shootHammer.on('panend', () => {
            const distancePercent = Math.min(Math.max((deltaY / screenHeight) * 100, -100), 100);
            const distance = (roundValue(distancePercent)*-70).toString();
            
            console.log(playerNum, " | ", currentTurn);
            if (playerNum === currentTurn) {
                sendToServer({ type: 'shoot', distance: distance, gameCode: gameCode, playerNum: playerNum, playerID: playerID });
            }

            startY = 0;
        });
    }
});

function sendToServer(message) {
    const jsonMessage = JSON.stringify(message);
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(jsonMessage);
    }
}

function roundValue(value) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

// Set cookie from W3Schools
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// Get cookie from W3Schools
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

setInterval(() => {
    console.log(document.cookie);
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
    }
}, 30000);