namespace BlindTestIo.Hubs
{
    public class Player
    {
        public string ConnectionId { get; set; }
        public string Nickname { get; set; }
        public int Score { get; set; }
        public int Index { get; set; }
        public bool IsManager { get; set; }

        public Player(string nickname, string connectionId, int index)
        {
            Nickname = nickname;
            Score = 0;
            ConnectionId = connectionId;
            Index = index;
        }
    }
}
