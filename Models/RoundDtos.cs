using System;
using System.Collections.Generic;

namespace ProjectTallify.Models
{
    // Matches the structure from collectRoundsForPayload() in create-event.js or similar
    public class SimpleRound
    {
        public string? RoundName { get; set; } // from criteria wizard
        public string? Name      { get; set; } // from orw wizard
        
        // Helper to get the display name, if needed by views
        public string DisplayName => !string.IsNullOrWhiteSpace(RoundName) ? RoundName : (Name ?? "Round");
    }
}
