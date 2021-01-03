var playButton = document.getElementById("playButton");
var nicknameInput = document.getElementById("nicknameInput");

(function () {
    nicknameInput.focus();

    document.addEventListener('keypress', function (e) {
        if (e.code === 'Enter') {
            startGame();
            e.preventDefault();
        }
    });
})();

playButton.addEventListener("click", function () {
    startGame();
});

function startGame() {
    let nickname = nicknameInput.value.trim().replaceAll(' ', '-').replaceAll('&', '');

    if (!nickname.isEmpty()) {
        window.location.href = "/game?nickname=" + nickname;
    }
}

String.prototype.isEmpty = function () {
    return (this.length === 0);
}