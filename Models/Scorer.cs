using System;

namespace ProjectTallify.Models
{
    public class Scorer
    {
        public int Id { get; set; }

        // FK back to Event
        public int EventId { get; set; }
        public Event Event { get; set; } = null!;

        public string Name { get; set; } = null!;

        // e.g. "GH7A5" – this is the PIN you generate
        public string Pin { get; set; } = null!;

        // For now we’ll store assigned contestants as a simple
        // comma–separated list: "C001,C002,C003"
        // Later we can normalize to a join table if needed.
        public string AssignedContestantIds { get; set; } = "";

        public ICollection<Score> Scores { get; set; } = new List<Score>();
    }
}
