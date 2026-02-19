# SafeSHEE Risk Scoring Algorithm - Technical Documentation

## Overview

The risk scoring algorithm uses a **normalized, component-based approach** that combines multiple factors to calculate a risk score (0-100) with confidence levels.

## Algorithm Architecture

### 1. Feature Extraction

The system extracts 6 key features from each report:

```
├── Category (Type of incident)
├── Time of Day
├── Day of Week
├── Area Density (recent incidents in 5km radius)
├── Description Analysis (keyword severity)
└── Area History (unresolved cases factors)
```

### 2. Weight Structure

Each feature has normalized weights (0.0-1.0):

```javascript
weights = {
  category: {
    'domestic_violence': 0.95,   // Highest risk
    'assault': 0.90,
    'stalking': 0.85,
    'threat': 0.70,
    'harassment': 0.60,
    'suspicious_activity': 0.40,
    'other': 0.20                // Lowest risk
  },
  
  timeOfDay: {
    'late_night': 0.80,           // 10 PM - 5 AM
    'evening': 0.65,              // 6 PM - 10 PM
    'early_morning': 0.50,        // 5 AM - 8 AM
    'daytime': 0.35               // 8 AM - 6 PM
  },
  
  dayOfWeek: {
    'weekend': 0.55,
    'weekday': 0.45
  },
  
  areaDensity: {
    'high_density': 0.70,         // ≥10 incidents in 30 days
    'medium_density': 0.50,       // 5-10 incidents
    'low_density': 0.30           // <5 incidents
  }
}
```

### 3. Feature Weights (Importance Distribution)

Component importance percentages:

```
Category                35%  (Most significant)
Time of Day             20%
Area Density            15%
Description Analysis    10%
Area History            10%
Day of Week             10%  (Least significant)
─────────────────────────────
Total                  100%
```

### 4. Scoring Calculation

The final risk score is calculated as:

```
Risk Score = 
    (categoryScore × 0.35) +
    (timeScore × 0.20) +
    (dayScore × 0.10) +
    (areaScore × 0.15) +
    (descriptionScore × 0.10) +
    (areaHistoryBoost × 0.10)

Where each component is normalized to 0.0-1.0, 
then multiplied by 100 to get 0-100 scale
```

### 5. Confidence Calculation

Confidence is determined by:
- **Category strength**: High-severity categories increase confidence
- **Description keywords**: Critical keywords boost confidence
- **Area data**: More incident history = higher confidence (more data points)

```
Base confidence: 0.50

+ 0.15 if category score > 0.85
+ 0.10 if category score > 0.70
+ 0.05 if category score > 0.50

+ 0.15 if description score > 0.70
+ 0.08 if description score > 0.50

+ 0.10 if >10 recent incidents
+ 0.05 if >5 recent incidents

Maximum: 0.99
```

### 6. Description Severity Analysis

The algorithm analyzes description text for keyword severity:

#### Critical Keywords (Severity: 0.90)
```
'severe', 'blood', 'weapon', 'death', 'fatal', 
'emergency', 'immediate'
```

#### High Severity Keywords (0.65)
```
'hurt', 'injur', 'attack', 'force', 'threat', 
'violent', 'danger'
```

#### Medium Severity Keywords (0.40)
```
'afraid', 'scared', 'unsafe', 'concern', 
'suspicious', 'strange'
```

*If none match: default 0.20*

### 7. Area History Boost

Additional scoring boost based on area-level patterns:

```
Boost Calculation:
+ 0.15 if ≥15 recent incidents in area
+ 0.10 if ≥10 recent incidents
+ 0.05 if ≥5 recent incidents

+ 0.10 if avg unresolved time > 24 hours
+ 0.05 if avg unresolved time > 12 hours

+ 0.05 if area has ≥3 unresolved incidents

Maximum boost: 0.25 (capped)
```

## Risk Level Classification

```
Score 85+   → 🔴 CRITICAL RISK (Immediate action required)
Score 70-84 → 🟠 HIGH RISK     (Urgent investigation)
Score 50-69 → 🟡 MEDIUM RISK   (Standard investigation)
Score 30-49 → 🟢 LOW RISK      (Monitor situation)
Score <30   → ✅ MINIMAL RISK  (Archive/inactive)
```

## Example Calculation

### Case: Domestic Violence in Late Night

```
Input:
- Category: domestic_violence (weight: 0.95)
- Time: late_night (10:45 PM) (weight: 0.80)
- Day: Saturday (Weekend, weight: 0.55)
- Area: 7 recent incidents (medium density, weight: 0.50)
- Description: "My husband hit me repeatedly" 
              (contains 'hit', severity: 0.65)
- Area history: 6 unresolved incidents, avg 36 hours

Calculations:
- Category score: 0.95 × 0.35 = 0.3325
- Time score: 0.80 × 0.20 = 0.1600
- Day score: 0.55 × 0.10 = 0.0550
- Area score: 0.50 × 0.15 = 0.0750
- Description score: 0.65 × 0.10 = 0.0650
- Area history boost:
  - 7 incidents: +0.05
  - 36 hours avg: +0.10
  - Total: 0.15 × 0.10 = 0.0150

Total: 0.3325 + 0.1600 + 0.0550 + 0.0750 + 0.0650 + 0.0150 = 0.7025

Risk Score: 0.7025 × 100 = 70.25 → 70/100

Confidence:
- Category > 0.85: +0.15
- Description > 0.50: +0.08
- 7 incidents: +0.05
- Base: 0.50
- Total: 0.78

Result: 70/100 risk with 78% confidence
```

## Advantages of This Algorithm

1. **Transparency**: Every factor is clearly defined and weighted
2. **Normalization**: All scores are on 0-1 scale before final conversion
3. **Addressable**: Each component can be adjusted independently
4. **Context-Aware**: Considers time, location, and history
5. **Scalability**: New factors can be added without breaking the model
6. **Explainability**: Generates human-readable explanations
7. **Continuous Learning**: Weights can be updated based on resolution times

## Continuous Learning

When reports are resolved, the algorithm updates category weights:

```javascript
if (resolutionTime > 72 hours) {
  weight × 1.02  // Increase weight - this category is high risk
} else if (resolutionTime < 24 hours) {
  weight × 0.98  // Decrease weight - faster resolution
}

Adjusted weight kept between 0.15-0.99
```

## API Response Format

```json
{
  "predicted_risk_score": 70,
  "ai_confidence": 0.78,
  "explanation": "🟠 HIGH RISK: Category: Domestic violence (high severity) (95%) | High-risk time period: late_night (80%) | Area density: 7 recent incidents (50%) | Area has history of unresolved cases - boosting score 15%",
  "scoreBreakdown": {
    "category": 95,
    "timeOfDay": 80,
    "dayOfWeek": 55,
    "areaDensity": 50,
    "description": 65,
    "areaHistory": 15
  },
  "features": {
    "category": "domestic_violence",
    "timeOfDay": "late_night",
    "dayOfWeek": "weekend",
    "areaDensity": "medium_density",
    "areaDataSummary": {
      "recentIncidents": 7,
      "avgTimeUnresolvedHours": 36,
      "hasRecentIncidents": true
    }
  }
}
```

## Files Modified

- `backend/services/ml-model.js` - Core algorithm implementation
- `backend/routes/reports.js` - Report creation using ML model

## Future Enhancements

1. **Geospatial Analysis**: Weighted proximity grid instead of 5km circles
2. **Temporal Patterns**: Day-of-month and seasonal trends
3. **Victim History**: Prior reports by same user
4. **Police Response Data**: Integration with resolution outcome data
5. **Natural Language Processing**: More sophisticated description analysis
6. **Machine Learning**: Neural network for weight optimization
