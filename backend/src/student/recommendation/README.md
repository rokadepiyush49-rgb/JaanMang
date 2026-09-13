# The recommender seam

One interface, two implementations, and an environment variable that chooses.

```
RecommendationService.recommend(studentId) → { problemId, score, reasons[] }[]
```

`HeuristicRecommender` runs today. It is not a placeholder: it scores six
weighted factors — skill overlap, category preference, geography, difficulty
against year, SDG interest and the government's published need — and writes a
sentence per factor. It is deterministic, explainable, and the product is worth
using with nothing else configured.

`ModelRecommender` runs when `RECOMMENDER_URL` is set, and falls back to the
heuristic whenever the model is absent, slow, or answers with something
unusable. A page load never fails because a model is down.

## What the model receives

`POST $RECOMMENDER_URL`

```jsonc
{
  "student": {
    "studentId": "stu-rohit",
    "skills": ["react", "node.js", "postgresql"],   // lower-cased
    "branch": "Computer Science & Engineering",
    "currentYear": 4,
    "graduationYear": 2027,
    "departmentId": "dept-cse",
    "institutionId": "inst-bit-mesra",
    "district": "Ranchi",
    "state": "Jharkhand",
    "preferredCategories": ["water", "health"],     // empty = no preference
    "preferredDistricts": ["Ranchi"],
    "sdgInterests": [6, 3],
    "weeklyHours": 12,                              // null = unstated, not zero
    "verifiedContributions": 1                      // derived, never self-reported
  },
  "opportunities": [
    {
      "problemId": "P-1042",
      "title": "Water supply interruption across three villages",
      "category": "water",
      "severity": "critical",
      "district": "Nagri Gram Panchayat",
      "state": "Jharkhand",
      "sdgGoals": [6],
      "technologies": ["IoT & Telemetry", "LoRaWAN", "Water Systems"],
      "priority": 96,
      "difficulty": "advanced",
      "teamCount": 1
    }
  ],
  "limit": 12
}
```

## What it must return

Either a bare array or `{ "recommendations": [...] }`:

```jsonc
[
  { "problemId": "P-1042", "score": 88, "reasons": ["Why this student, in their own terms."] }
]
```

`reasons` is required and must be non-empty. A row without one is dropped —
a recommendation a student cannot interrogate is one they will not act on, and
the model does not get an exemption from that rule.

Scores outside 0–100 are clamped. Unknown fields are ignored. If every row is
dropped, the heuristic's ranking is served instead.

## Changing the contract

The feature vector is the only thing the model has to match, so it is
deliberately explicit and additive: new fields may be added, existing ones do
not change meaning. If a field ever must change meaning, version the endpoint
rather than the payload.
