using System;

namespace BlindTestIo.Models
{
    public class EventMessage
    {
        public static string FromString(string message)
        {
            var now = DateTime.Now;
            var date = now.ToString("dd.MM.yyyy");
            var time = now.ToString("HH:mm");
            return $"[{date} - {time}] : {message}";
        }
    }
}
