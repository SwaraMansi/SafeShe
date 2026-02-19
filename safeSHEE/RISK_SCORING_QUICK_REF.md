# SafeSHEE Risk Scoring - Quick Reference

## Risk Score at a Glance

```
📊 RISK SCORE SCALE (0-100)

85-100  🔴 CRITICAL RISK
        → Immediate police dispatch
        → Life safety concern
        → Requires urgent intervention

70-84   🟠 HIGH RISK
        → Urgent investigation needed
        → Potential escalation danger
        → Prioritize response

50-69   🟡 MEDIUM RISK
        → Standard investigation
        → Monitor situation closely
        → Proceed methodically

30-49   🟢 LOW RISK
        → Routine handling
        → May be informational only
        → Document for patterns

<30     ✅ MINIMAL RISK
        → Archive/background info only
        → No immediate action needed
```

## What Increases Risk Score

### Category (Highest Impact: 35%)
```
🔴 CRITICAL:      Domestic Violence (95), Assault (90)
🟠 HIGH:          Stalking (85), Threat (70)
🟡 MEDIUM:        Harassment (60), Suspicious Activity (40)
🟢 LOW:           Other (20)
```

### Time of Day (20%)
```
🌙 Late Night (10 PM - 5 AM):  80 points - Highest risk
🌆 Evening (6 PM - 10 PM):     65 points - Elevated
☀️  Daytime (8 AM - 6 PM):      35 points - Lower
🌄 Early Morning (5 AM - 8 AM): 50 points - Moderate
```

### Area/Location (15%)
```
🔴 HIGH DENSITY:   ≥10 incidents in 30 days  → 70 points
🟡 MEDIUM:        5-10 incidents              → 50 points
🟢 LOW:          <5 incidents               → 30 points
```

### Description Keywords (10%)
```
🔴 CRITICAL:  "severe", "blood", "weapon", "death", "fatal"     → 90%
🟠 HIGH:     "hurt", "injured", "attack", "violent", "threat"   → 65%
🟡 MEDIUM:   "afraid", "scared", "suspicious"                  → 40%
```

### Area History (10%)
```
Boost if:
+ 15 or more unresolved cases          → +15%
+ Average resolution time > 24 hours   → +10%
+ Incident type repeats in area        → +5%
```

### Day of Week (10%)
```
Weekend (Sat/Sun): 55 points - Slightly elevated
Weekday (Mon-Fri): 45 points - Baseline
```

## Confidence Score (0-100%)

**What it means**: How sure the system is about the risk score

```
95-99%  🔍 Very High - Multiple strong factors match
80-94%  ✅ High - Category + description + area data align
60-79%  📋 Moderate - Some factors present
40-59%  ❓ Lower - Limited data or uncertain factors
<40%    ⚠️  Low - Insufficient data for firm assessment
```

### How to Read Confidence
- **High confidence** (>80%) → Trust the score more
- **Medium confidence** (60-80%) → Score is reasonable but verify
- **Low confidence** (<60%) → Additional investigation needed

## Example: Understanding a Report

### Example 1: Domestic Violence at 11 PM
```
Category:        Domestic Violence    → 95 points
Time:            Late Night (11 PM)   → 80 points
Day:             Saturday             → 55 points
Area:            8 recent incidents   → 50 points
Description:     "He pushed me, I'm scared" → 65 points
Area History:    6 unresolved cases   → 15 points boost

RESULT: 82/100 Risk, 85% Confidence
ACTION: 🟠 HIGH RISK - Urgent investigation required
```

### Example 2: Suspicious Person During Day
```
Category:        Suspicious Activity  → 40 points
Time:            Daytime (3 PM)       → 35 points
Day:             Tuesday              → 45 points
Area:            2 recent incidents   → 30 points
Description:     "Man acting strange" → 20 points
Area History:    No unresolved cases  → 0 boost

RESULT: 34/100 Risk, 45% Confidence
ACTION: 🟢 LOW RISK - Routine documentation
```

## For Police Dispatchers

### Quick Assessment
1. **Check Risk Score first** - Determines urgency
2. **Read Explanation** - Shows key risk factors
3. **Review Score Breakdown** - Understand what drove the score
4. **Check Area History** - Is this location known for issues?
5. **Interview victim** - Confidence score tells you how certain the system is

### Response Priority
```
85+ 🔴 CRITICAL   → Dispatch immediately, multi-unit
70-84 🟠 HIGH     → Dispatch units, priority response
50-69 🟡 MEDIUM   → Standard dispatch protocol
30-49 🟢 LOW      → Document, file for pattern analysis
<30  ✅ MINIMAL   → Acknowledge, archive reference
```

## For Report Creators (Victims/Witnesses)

### To Increase Accuracy
1. **Be specific about type** - "Assault" not "Problem"
2. **Include descriptive details** - Mention injuries, weapons, threats
3. **Provide location** - Address or area helps assess safety patterns
4. **State your relationship** - Family/stranger contexts matter
5. **Describe what happened** - More detail = higher confidence

### Good Description Examples
- ❌ "Something bad happened" (vague)
- ✅ "My partner hit me repeatedly" (clear, includes action verb)

- ❌ "He threatened me" (basic)
- ✅ "He said he would hurt me if I left" (specific threat)

## System Limitations

⚠️ **What the system cannot assess:**
- Truthfulness of report (requires investigation)
- Actual danger vs. perceived danger (subjective)
- Intent of suspect (requires interview)
- Evidence strength (requires police investigation)
- Relationship context (requires history check)

✅ **What the system does:**
- Relative risk assessment based on incident type + context
- Pattern detection (high-density areas, time patterns)
- Prioritization guidance for police response
- Consistency in evaluation across all reports

## Continuous Improvement

The algorithm learns from resolved cases:
- If reports are resolved quickly → Category weight decreases slightly
- If reports take long → Category weight increases
- High-risk categories get updated based on real outcomes

This ensures the system improves over time with actual data.

---

📚 For more details: See [RISK_SCORING_ALGORITHM.md](./RISK_SCORING_ALGORITHM.md)
