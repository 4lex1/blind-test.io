using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;

namespace BlindTestIo.Hubs
{
    public class GameHub : Hub
    {
        public static List<Player> Players { get; set; } = new List<Player>();
        private static bool playerIsBuzzing = false;
        private static bool videoIsPaused = false;
        private static bool gameHasStarted = false;

        public string JsonPlayers { get => JsonConvert.SerializeObject(Players); }

        private Player GetPlayerFromConnectionId(string connectionId) => Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        private bool CallerIsManager(string connectionId)
        {
            var player = GetPlayerFromConnectionId(connectionId);
            if (player == null) return false;
            return player.IsManager;
        }

        public async Task AssociateNickname(string nickname)
        {
            var player = new Player(nickname, Context.ConnectionId, Players.Count);
            if (Players.Count == 0) player.IsManager = true;

            Players.Add(player);

            await SendEvent($"{nickname} a rejoint la partie.");
            await RefreshPlayersList();
        }

        public async Task LoadVideoById(string id)
        {
            if (CallerIsManager(Context.ConnectionId))
            {
                gameHasStarted = true;
                await Clients.All.SendAsync("LoadVideoById", id);
            }
        }

        public async Task PauseVideo()
        {
            if (CallerIsManager(Context.ConnectionId))
            {
                await Clients.All.SendAsync("PauseVideo");
            }
        }

        public async Task PauseVideoAndSeek(double time, bool forced)
        {
            if (CallerIsManager(Context.ConnectionId))
            {
                if (forced) videoIsPaused = true;
                await Clients.All.SendAsync("PauseVideoAndSeek", time);
            }
        }

        public async Task PlayVideo()
        {
            if (CallerIsManager(Context.ConnectionId))
            {
                videoIsPaused = false;
                await Clients.All.SendAsync("PlayVideo");
            }
        }

        public async Task SeekVideo(double time)
        {
            if (CallerIsManager(Context.ConnectionId))
            {
                await Clients.All.SendAsync("SeekVideo", time);
            }
        }

        public async Task ChangePlayerScore(string connectionId, int deltaScore)
        {
            if (!CallerIsManager(Context.ConnectionId)) return;

            var player = Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null)
            {
                var msg = "";
                if (deltaScore == 1)
                {
                    player.Score += deltaScore;
                    msg = "a gagné un point";
                    await PlaySound("/sounds/good.mp3");
                }
                else if (player.Score > 0)
                {
                    player.Score += deltaScore;
                    msg = "a perdu un point";
                    await PlaySound("/sounds/bad.mp3");
                }

                if (!string.IsNullOrWhiteSpace(msg))
                {
                    await SendEvent($"{player.Nickname} {msg}");
                    await RefreshPlayersList();
                }
            }
        }

        private async Task SendEvent(string message)
        {
            await Clients.All.SendAsync("NewEvent", EventMessage.FromString(message));
        }

        private async Task RefreshPlayersList()
        {
            Players = Players.OrderByDescending(p => p.Score).ToList();
            await Clients.All.SendAsync("RefreshPlayersList", JsonPlayers);
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            var player = Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (player != null)
            {
                Players.Remove(player);

                if (player.IsManager && Players.Count > 1)
                {
                    Clients.All.SendAsync("Disconnect");
                    Players.Clear();
                    NewGame().Wait();
                }
                else
                {
                    SendEvent($"{player.Nickname} a quitté la partie.").Wait();
                    RefreshPlayersList().Wait();
                }
            }
            return base.OnDisconnectedAsync(exception);
        }

        public async Task NewGame()
        {
            if (!CallerIsManager(Context.ConnectionId)) return;

            foreach(var player in Players)
            {
                player.Score = 0;
            }

            playerIsBuzzing = false;
            gameHasStarted = false;

            await RefreshPlayersList();
            await Clients.All.SendAsync("NewGame");
            await SendEvent($"Une nouvelle partie a commencé.");
        }

        public async Task PlaySound(string sound)
        {
            await Clients.All.SendAsync("PlaySound", sound);
        }

        public async Task Buzz()
        {
            if (!gameHasStarted || videoIsPaused) return;

            var player = Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (player != null && !playerIsBuzzing)
            {
                Console.WriteLine($"{player.Nickname} ({player.ConnectionId}) has buzzed !");
                playerIsBuzzing = true;
                var rnd = new Random();
                var num = rnd.Next(1, 11);
                await Clients.All.SendAsync("PlayerBuzz", player.Nickname, $"/sounds/buzz{num}.mp3", player.Index);
                await Clients.All.SendAsync("PauseVideo");
                await Clients.All.SendAsync("SendTime");
                await SendEvent($"{player.Nickname} a buzzé !");
            }
        }

        public async Task FinishBuzz()
        {
            if (!CallerIsManager(Context.ConnectionId)) return;

            playerIsBuzzing = false;

            if (!videoIsPaused && gameHasStarted)
            {
                await Clients.All.SendAsync("PlayVideo");
            }
        }

    }
}
