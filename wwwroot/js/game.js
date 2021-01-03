
//-----------------------------------------------------
// YOUTUBE
//-----------------------------------------------------

var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {});
}

//-----------------------------------------------------
// INITIALISATIONS
//-----------------------------------------------------

var eventsList = document.getElementById("eventsList");
var playersList = document.getElementById("playersList");
var buzzer = document.getElementById("buzzer");
var buzzPlayerText = document.getElementById("buzzPlayerText");
var buzzOverlay = document.getElementById("buzzOverlay");
var iWannaPlayButton = document.getElementById("iWannaPlayButton");
var buzzCountdown = document.getElementById("buzzCountdown");
var volumeSlider = document.getElementById("volumeSlider");

//-----------------------------------------------------
// AU CHARGEMENT DE LA PAGE
//-----------------------------------------------------

var localNickname;
var isMngr;
(function () {
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    localNickname = urlParams.get('nickname');
    isMngr = urlParams.get('isMngr');
})();

(function () {
    if (!isMngr) {
        document.getElementById("adminPanel").remove();
    }
    else {
        document.getElementById('loadButton').addEventListener('click', function (event) {
            let videoId = document.getElementById('loadInput').value;
            connection.invoke('LoadVideoById', videoId);

            setTimeout(function () {
                connection.invoke("PauseVideoAndSeek", player.getCurrentTime(), true);
            }, 2300);

            event.preventDefault();
        });

        document.getElementById('playButton').addEventListener('click', function (event) {
            connection.invoke('PlayVideo');
            event.preventDefault();
        });

        document.getElementById('pauseButton').addEventListener('click', function (event) {
            connection.invoke('PauseVideoAndSeek', player.getCurrentTime(), true);
            event.preventDefault();
        });

        document.getElementById('syncButton').addEventListener('click', function (event) {
            connection.invoke('SeekVideo', player.getCurrentTime());
            event.preventDefault();
        });

        document.getElementById('newButton').addEventListener('click', function (event) {
            connection.invoke('NewGame');
            event.preventDefault();
        });
    }
})();

buzzer.addEventListener('click', function () {
    Buzz();
});

document.addEventListener('keypress', function (e) {
    if (e.code == 'Space') {
        e.preventDefault();
        document.activeElement.blur();
        Buzz();
    }
});

iWannaPlayButton.addEventListener('click', function () {
    document.getElementById("welcomeOverlay").remove();
});

volumeSlider.addEventListener('input', function () {
    player.setVolume(volumeSlider.value);
});

// On définit une connexion au hub '/game'.
var connection = new signalR.HubConnectionBuilder().withUrl("/gameHub").build();


//-----------------------------------------------------
// EVENEMENTS
//-----------------------------------------------------

// Quand un nouvel événement est reçu.
connection.on("NewEvent", function (message) {
    let ul = document.createElement('ul');
    ul.textContent = message;
    ul.className = 'event-appear';

    eventsList.insertBefore(ul, eventsList.firstChild);
    setTimeout(function () {
        ul.className = 'event';
    }, 50);

    if (eventsList.childNodes.length > 7) {
        eventsList.lastChild.remove();
    }
});

// Sert à rafrichir la liste des joueurs à partir des infos du serveur.
connection.on("RefreshPlayersList", function (jsonPlayers) {

    let players = JSON.parse(jsonPlayers);

    let count = 1;
    playersList.innerHTML = '';
    players.forEach(function (player) {

        if (player.ConnectionId === connection.connectionId) {
            if (isMngr === null && player.IsManager) {
                window.location.href = "/game?nickname=" + localNickname + "&isMngr=true";
            }
        }

        let tr = document.createElement('tr');

        let num = document.createElement('td');
        num.textContent = count++;
        tr.appendChild(num);

        let name = document.createElement('td');
        name.textContent = player.Nickname;
        if (player.IsManager) {
            name.textContent += ' (admin)';
        }
        name.className = "player" + player.Index;
        tr.appendChild(name);

        let score = document.createElement('td');
        score.textContent = player.Score;
        tr.appendChild(score);

        if (isMngr) {
            let plus = document.createElement('button');
            plus.textContent = '+';
            plus.addEventListener('click', function () {
                connection.invoke('ChangePlayerScore', player.ConnectionId, 1);
            });
            tr.appendChild(plus);

            let minus = document.createElement('button');
            minus.textContent = '-';
            minus.addEventListener('click', function () {
                connection.invoke('ChangePlayerScore', player.ConnectionId, -1);
            });
            tr.appendChild(minus);
        }

        playersList.appendChild(tr);
    });

});

// Contrôle de la vidéo.
connection.on("PauseVideo", function () {
    player.pauseVideo();
});

connection.on("PauseVideoAndSeek", function (time) {
    player.pauseVideo();
    player.seekTo(time, true);
});

connection.on("LoadVideoById", function (videoId) {
    player.loadVideoById(videoId);
});

connection.on("PlayVideo", function () {
    player.playVideo();
});

connection.on("SeekVideo", function (time) {
    player.seekTo(time, true);
});

connection.on("PlaySound", function (sound) {
    let audio = new Audio(sound);
    audio.play();
});

connection.on("PlayerBuzz", function (nickname, sound, index) {
    showBuzzOverlay();

    buzzPlayerText.textContent = "On t'écoute, " + nickname + " ! 😋";
    buzzPlayerText.className = 'buzzPlayer player' + index;

    let audio = new Audio(sound);
    audio.play();

    setTimeout(hideBuzzOverlay, 3000);
    if (isMngr) {
        setTimeout(function () {
            connection.invoke("FinishBuzz");
        }, 3001);
    }

    buzzCountdown.textContent = "3";
    setTimeout(function () { buzzCountdown.textContent = "2" }, 1000);
    setTimeout(function () { buzzCountdown.textContent = "1" }, 2000);
    setTimeout(function () { buzzCountdown.textContent = "0" }, 3000);
});

connection.on("Disconnect", function () {
    window.location.href = "./";
});

connection.on("NewGame", function () {
    player.stopVideo();
});

//-----------------------------------------------------
// Etablissement de la connexion.
connection.start().then(function () {
    connection.invoke("AssociateNickname", localNickname);
});

function showBuzzOverlay() {
    buzzOverlay.style = "visibility:initial";
}

function hideBuzzOverlay() {
    buzzOverlay.style = "visibility:hidden";
}

function Buzz() {
    connection.invoke('Buzz');
}

function SendTime() {
    if (isMngr) {
        connection.invoke('SeekVideo', player.getCurrentTime());
    }
}