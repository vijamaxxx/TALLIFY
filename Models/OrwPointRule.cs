using System;

namespace ProjectTallify.Models
{
    public class OrwPointRule
    {
        public int Id { get; set; }

        public int RoundId { get; set; }
        public Round Round { get; set; } = null!;

        public decimal PointsPerCorrect { get; set; }
        public decimal PointsPerWrong { get; set; }
        public decimal PointsPerBonus { get; set; }
        public decimal PointsPerViolation { get; set; }
    }
}
