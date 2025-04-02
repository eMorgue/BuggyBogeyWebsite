const url = 'https://buggy-bogey-5018da91b622.herokuapp.com/:8080';
//const messageQueue = [];
let gameCode = getCookie('gameCode') || null;
let playerNum = getCookie('playerNum') || null;
let currentTurn = 1;

let socket = new WebSocket(url);

socket.addEventListener('open', () => {
    //while (messageQueue.length > 0) {
    //    socket.send(JSON.stringify(messageQueue.shift()));
    //}
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
                setCookie('playerNum', playerNum, 1);
                gameCode = data.code;
                setCookie('gameCode', gameCode, 1);
                document.body.style.backgroundImage = "url('images/UI_Player1Purple.png')";
                window.location.href = 'game.html';
            }
        }
        else if (data.type === 'playernum') {
            currentTurn = data.num;
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
            startX = event.center.x;
            
            const distancePercent = Math.min(Math.max((deltaX / screenWidth) * 100, -100), 100);
            const distance =  (roundValue(distancePercent)).toString();

            //if (playerNum === currentTurn) {
                sendToServer({ type: 'aim', distance: distance, code: gameCode, player: playerNum });
            //}
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
            
            //if (playerNum === currentTurn) {
                sendToServer({ type: 'shoot', distance: distance, code: gameCode, player: playerNum });
            //}

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

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

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