using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectTallify.Models;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using ProjectTallify.Services; 

namespace ProjectTallify.Controllers
{
    /// <summary>
    /// Controller for the Scorer's interface (Objective Right/Wrong system).
    /// Handles the scoring view and submission for scorers.
    /// </summary>
    public class ScorerController : Controller
    {
        private readonly TallifyDbContext _db;
        private readonly IScoringService _scoringService;

        public ScorerController(TallifyDbContext db, IScoringService scoringService)
        {
            _db = db;
            _scoringService = scoringService;
        }

        // GET: /Scorer
        // Optional: /Scorer?code=ABC123&roundId=5
        
        /// <summary>
        /// Renders the Scorer interface.
        /// Loads the specific ORW round configuration and assigned contestants.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Index(string? code, int? roundId)
        {
            ViewData["Title"] = "Scorer – Scoring";
            ViewBag.HideHeader = true;
            ViewBag.HideOrgCard = true;

            // 1. Verify Session
            var sessionEventId = HttpContext.Session.GetInt32("EventId");
            var sessionScorerId = HttpContext.Session.GetInt32("ScorerId");
            var sessionRole = HttpContext.Session.GetString("Role");

            Event? ev = null;
            
            var query = _db.Events
                .Include(e => e.User)
                .Include(e => e.Contestants)
                .Include(e => e.Rounds)
                .ThenInclude(r => r.Criterias)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(code))
            {
                ev = await query.FirstOrDefaultAsync(e => e.AccessCode == code);
            }
            else if (sessionEventId.HasValue)
            {
                ev = await query.FirstOrDefaultAsync(e => e.Id == sessionEventId.Value);
            }

            if (ev == null) return NotFound("Event not found.");

            ViewBag.ThemeColor = ev.ThemeColor;

            // Enforce Session
            if (sessionEventId.HasValue && sessionEventId.Value == ev.Id)
            {
                if (sessionRole != "scorer")
                {
                    // Redirect Judges to Judge screen
                    if (sessionRole == "judge")
                        return RedirectToAction("Index", "Judge", new { code = ev.AccessCode });
                    
                    // Invalid role
                    return RedirectToAction("Index", "Home");
                }
            }
            else
            {
                // Not logged in or session mismatch -> Redirect to Login (Home)
                return RedirectToAction("Index", "Home");
            }

            if (ev.EventType != "orw")
            {
                return BadRequest("This event is not configured for ORW scoring.");
            }

            // 2) Header
            ViewBag.OrganizationName = ev.Name;
            ViewBag.OrganizationSubtitle = ev.Venue;

            // 3) Get Scorer details
            Scorer? scorer = null;
            if (sessionScorerId.HasValue)
            {
                scorer = await _db.Scorers.FirstOrDefaultAsync(s => s.Id == sessionScorerId.Value);
            }

            // 4) Active ORW round
            Round? round = null;
            var allRounds = ev.Rounds.OrderBy(r => r.Order).ToList();

            if (roundId.HasValue)
            {
                round = allRounds.FirstOrDefault(r => r.Id == roundId.Value);
            }

            if (round == null)
            {
                round = allRounds
                    .Where(r => r.RoundType == "orw")
                    .FirstOrDefault();
            }

            var roundName = round?.Name ?? "Round 1";

            // 5) Contestants
            var allContestants = ev.Contestants
                .OrderBy(c => c.Code)
                .ToList();

            var contestantQuery = allContestants.AsEnumerable();

            // Filter by AssignedContestantIds
            if (scorer != null && !string.IsNullOrWhiteSpace(scorer.AssignedContestantIds))
            {
                var assignedCodes = scorer.AssignedContestantIds
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim())
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                contestantQuery = allContestants.Where(c => assignedCodes.Contains(c.Code));
            }

            var contestantVms = contestantQuery
                .Select(c => new ScorerContestantViewModel
                {
                    Id = c.Code,
                    FullName = c.Name,
                    School = c.Organization ?? "",
                    PhotoPath = c.PhotoPath
                })
                .ToList();

            var selectedId = contestantVms.FirstOrDefault()?.Id;

            // 6) Total questions
            int totalQuestions = 20;
            if (!string.IsNullOrWhiteSpace(ev.PointingJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(ev.PointingJson);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("totalItems", out var totalItemsProp) &&
                        totalItemsProp.ValueKind == JsonValueKind.Number &&
                        totalItemsProp.TryGetInt32(out var parsed))
                    {
                        totalQuestions = parsed;
                    }
                }
                catch { }
            }
            
            // 7) Map Criteria Groups (if any are relevant)
            var criteriaGroups = new List<CriteriaGroupViewModel>();
            if (round != null && round.Criterias != null && round.Criterias.Any())
            {
                criteriaGroups.Add(new CriteriaGroupViewModel
                {
                    GroupName = round.Name,
                    Criteria = round.Criterias
                        .OrderBy(c => c.DisplayOrder ?? int.MaxValue)
                        .Select(c => new CriteriaRowViewModel
                        {
                            Name = c.Name,
                            WeightPercentage = c.WeightPercent
                        })
                        .ToList()
                });
            }

            var vm = new ScorerViewModel
            {
                EventName = ev.Name,
                EventCode = ev.AccessCode ?? "",
                RoundName = roundName,
                IsRoundActive = (ev.Status?.ToLower() == "open") && (round?.IsActive ?? false),
                EventStatus = ev.Status?.ToLower() ?? "preparing",
                EventStartDate = ev.StartDateTime,
                OrganizationName = ev.Name,
                OrganizationSubtitle = ev.Venue,
                ThemeColor = ev.ThemeColor,
                SelectedContestantId = selectedId,
                TotalQuestions = totalQuestions,
                Contestants = contestantVms,
                CriteriaGroups = criteriaGroups
            };

            return View("Index", vm);
        }

        // POST: /Scorer
        
        /// <summary>
        /// Handles POST actions from the Scorer interface (e.g., Submit).
        /// Note: The actual scoring logic for ORW is often client-side accumulated and submitted, 
        /// but this action currently handles the form post feedback.
        /// </summary>
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Index(string EventCode, string? ScoringJson, string? ActionType)
        {
            var scorerName = HttpContext.Session.GetString("ScorerName") ?? "Scorer";
            var sessionEventId = HttpContext.Session.GetInt32("EventId");

            if (string.Equals(ActionType, "submit", StringComparison.OrdinalIgnoreCase))
            {
                // Audit Log
                var ev = await _db.Events.FirstOrDefaultAsync(e => e.AccessCode == EventCode);
                
                if (ev != null && sessionEventId == ev.Id)
                {
                    _db.AuditLogs.Add(new AuditLog
                    {
                        EventId = ev.Id,
                        UserId = null,
                        Action = $"Scorer '{scorerName}' submitted scores.",
                        Details = "Scores submitted via ORW interface.",
                        CreatedAt = DateTime.UtcNow
                    });
                    await _db.SaveChangesAsync();
                }

                TempData["ScorerMessage"] = "Scores submitted successfully.";
            }
            else
            {
                TempData["ScorerMessage"] = "Draft saved.";
            }

            return RedirectToAction(nameof(Index), new { code = EventCode });
        }
    }
}
