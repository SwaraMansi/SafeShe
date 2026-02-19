const db = require('../database');

class MLRiskModel {
  constructor() {
    this.weights = {};
    this.initialized = false;
    this.initializeDefaultWeights();
  }

  initializeDefaultWeights() {
    this.weights = {
      category: {
        'domestic_violence': 0.95,
        'assault': 0.90,
        'stalking': 0.85,
        'threat': 0.70,
        'harassment': 0.60,
        'suspicious_activity': 0.40,
        'other': 0.20
      },
      timeOfDay: {
        'late_night': 0.80,
        'early_morning': 0.50,
        'evening': 0.65,
        'daytime': 0.35
      },
      dayOfWeek: {
        'weekend': 0.55,
        'weekday': 0.45
      },
      areaDensity: {
        'high_density': 0.70,
        'medium_density': 0.50,
        'low_density': 0.30
      },
      description: {
        critical: ['severe', 'blood', 'weapon', 'death', 'fatal', 'emergency', 'immediate'],
        high: ['hurt', 'injur', 'attack', 'force', 'threat', 'violent', 'danger'],
        medium: ['afraid', 'scared', 'unsafe', 'concern', 'suspicious', 'strange']
      }
    };

    this.featureWeights = {
      category: 0.35,
      timeOfDay: 0.20,
      dayOfWeek: 0.10,
      areaDensity: 0.15,
      description: 0.10,
      areaHistory: 0.10
    };

    this.initialized = true;
  }

  normalizeScore(score) {
    return Math.min(100, Math.max(0, score));
  }
  extractFeatures(reportData, areaData) {
    const features = {};
    const timestamp = reportData.timestamp || Date.now();
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    const categoryLower = (reportData.type || '').toLowerCase();
    features.category = this.weights.category[categoryLower] !== undefined 
      ? categoryLower 
      : 'other';

    if (hour >= 22 || hour < 5) {
      features.timeOfDay = 'late_night';
    } else if (hour >= 5 && hour < 8) {
      features.timeOfDay = 'early_morning';
    } else if (hour >= 18 && hour < 22) {
      features.timeOfDay = 'evening';
    } else {
      features.timeOfDay = 'daytime';
    }

    features.dayOfWeek = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';

    const recentIncidents = areaData.recentIncidents || 0;
    if (recentIncidents >= 10) {
      features.areaDensity = 'high_density';
    } else if (recentIncidents >= 5) {
      features.areaDensity = 'medium_density';
    } else {
      features.areaDensity = 'low_density';
    }

    features.areaDataSummary = {
      recentIncidents,
      avgTimeUnresolvedHours: areaData.avgTimeUnresolvedHours || 0,
      hasRecentIncidents: areaData.hasRecentIncidents || false
    };

    features.description = reportData.description || '';

    return features;
  }
  calculateDescriptionSeverity(description) {
    const text = (description || '').toLowerCase();
    
    let severityScore = 0;
    
    const criticalKeywords = this.weights.description.critical;
    const highKeywords = this.weights.description.high;
    const mediumKeywords = this.weights.description.medium;

    criticalKeywords.forEach(keyword => {
      if (text.includes(keyword)) severityScore = Math.max(severityScore, 0.90);
    });

    if (severityScore < 0.90) {
      highKeywords.forEach(keyword => {
        if (text.includes(keyword)) severityScore = Math.max(severityScore, 0.65);
      });
    }

    if (severityScore < 0.65) {
      mediumKeywords.forEach(keyword => {
        if (text.includes(keyword)) severityScore = Math.max(severityScore, 0.40);
      });
    }

    return severityScore || 0.20;
  }

  calculateAreaHistoryBoost(areaData) {
    const { recentIncidents, avgTimeUnresolvedHours, hasRecentIncidents } = areaData;
    
    let boost = 0;

    if (recentIncidents >= 15) boost += 0.15;
    else if (recentIncidents >= 10) boost += 0.10;
    else if (recentIncidents >= 5) boost += 0.05;

    if (avgTimeUnresolvedHours > 24) boost += 0.10;
    else if (avgTimeUnresolvedHours > 12) boost += 0.05;

    if (hasRecentIncidents && recentIncidents >= 3) boost += 0.05;

    return Math.min(0.25, boost);
  }

  async getAreaData(latitude, longitude) {
    return new Promise((resolve) => {
      if (!latitude || !longitude) {
        resolve({
          recentIncidents: 0,
          avgTimeUnresolvedHours: 0,
          hasRecentIncidents: false
        });
        return;
      }
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      db.all(
        `SELECT id, timestamp, status FROM reports 
         WHERE timestamp > ? AND status IN ('pending', 'investigating')
         AND latitude IS NOT NULL AND longitude IS NOT NULL`,
        [thirtyDaysAgo],
        (err, rows) => {
          if (err || !rows || rows.length === 0) {
            resolve({
              recentIncidents: 0,
              avgTimeUnresolvedHours: 0,
              hasRecentIncidents: false
            });
            return;
          }
          const incidentsNearby = rows.filter(row => {
            const distance = this.calculateDistance(latitude, longitude, row.latitude, row.longitude);
            return distance < 5; 
          });
          let totalHours = 0;
          const pendingIncidents = incidentsNearby.filter(r => r.status !== 'resolved');
          if (pendingIncidents.length > 0) {
            totalHours = pendingIncidents.reduce((sum, r) => {
              const hours = (Date.now() - r.timestamp) / (1000 * 60 * 60);
              return sum + hours;
            }, 0) / pendingIncidents.length;
          }
          resolve({
            recentIncidents: incidentsNearby.length,
            avgTimeUnresolvedHours: totalHours,
            hasRecentIncidents: incidentsNearby.length > 0
          });
        }
      );
    });
  }
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  async predictRisk(reportData) {
    try {
      const areaData = await this.getAreaData(reportData.latitude, reportData.longitude);
      const features = this.extractFeatures(reportData, areaData);

      const categoryScore = this.weights.category[features.category] || this.weights.category['other'];
      const timeScore = this.weights.timeOfDay[features.timeOfDay];
      const dayScore = this.weights.dayOfWeek[features.dayOfWeek];
      const areaScore = this.weights.areaDensity[features.areaDensity];
      const descriptionScore = this.calculateDescriptionSeverity(features.description);
      const areaHistoryBoost = this.calculateAreaHistoryBoost(areaData);

      const riskScore = Math.round(
        (categoryScore * this.featureWeights.category) +
        (timeScore * this.featureWeights.timeOfDay) +
        (dayScore * this.featureWeights.dayOfWeek) +
        (areaScore * this.featureWeights.areaDensity) +
        (descriptionScore * this.featureWeights.description) +
        (areaHistoryBoost * this.featureWeights.areaHistory)
      ) * 100;

      const normalizedScore = this.normalizeScore(riskScore);

      const confidence = this.calculateConfidence(
        categoryScore,
        descriptionScore,
        areaData.recentIncidents
      );

      const explanation = this.generateExplanation(
        features,
        normalizedScore,
        {
          categoryScore,
          timeScore,
          dayScore,
          areaScore,
          descriptionScore,
          areaHistoryBoost
        }
      );

      return {
        predicted_risk_score: normalizedScore,
        ai_confidence: confidence,
        features: features,
        explanation: explanation,
        scoreBreakdown: {
          category: Math.round(categoryScore * 100),
          timeOfDay: Math.round(timeScore * 100),
          dayOfWeek: Math.round(dayScore * 100),
          areaDensity: Math.round(areaScore * 100),
          description: Math.round(descriptionScore * 100),
          areaHistory: Math.round(areaHistoryBoost * 100)
        }
      };
    } catch (error) {
      console.error('Risk prediction error:', error);
      return {
        predicted_risk_score: 45,
        ai_confidence: 0.25,
        features: {},
        explanation: 'Unable to calculate precise risk - using baseline assessment',
        scoreBreakdown: {}
      };
    }
  }

  calculateConfidence(categoryScore, descriptionScore, recentIncidents) {
    let confidence = 0.50;

    if (categoryScore > 0.85) confidence += 0.15;
    else if (categoryScore > 0.70) confidence += 0.10;
    else if (categoryScore > 0.50) confidence += 0.05;

    if (descriptionScore > 0.70) confidence += 0.15;
    else if (descriptionScore > 0.50) confidence += 0.08;

    if (recentIncidents > 10) confidence += 0.10;
    else if (recentIncidents > 5) confidence += 0.05;

    return parseFloat(Math.min(0.99, confidence).toFixed(2));
  }
  generateExplanation(features, riskScore, scores) {
    const factors = [];
    const riskLevel = this.getRiskLevel(riskScore);

    const categoryDescriptions = {
      'domestic_violence': 'Domestic violence (critical severity)',
      'assault': 'Assault report (critical severity)',
      'stalking': 'Stalking incident (high severity)',
      'threat': 'Threat report (high severity)',
      'harassment': 'Harassment incident (medium severity)',
      'suspicious_activity': 'Suspicious activity (low-medium severity)',
      'other': 'Other incident type'
    };

    if (categoryDescriptions[features.category]) {
      const categoryScore = Math.round(scores.categoryScore * 100);
      factors.push(`Category: ${categoryDescriptions[features.category]} (${categoryScore}%)`);
    }

    if (scores.descriptionScore > 0.50) {
      const descScore = Math.round(scores.descriptionScore * 100);
      const severity = scores.descriptionScore > 0.80 ? 'critical' : scores.descriptionScore > 0.65 ? 'severe' : 'notable';
      factors.push(`Description indicates ${severity} language (${descScore}%)`);
    }

    if (features.timeOfDay === 'late_night' || features.timeOfDay === 'evening') {
      const timeScore = Math.round(scores.timeScore * 100);
      factors.push(`High-risk time period: ${features.timeOfDay} (${timeScore}%)`);
    }

    const { recentIncidents, avgTimeUnresolvedHours } = features.areaDataSummary;
    if (recentIncidents > 0) {
      const areaScore = Math.round(scores.areaDensity * 100);
      factors.push(`Area density: ${recentIncidents} recent incidents (${areaScore}%)`);
    }

    if (scores.areaHistoryBoost > 0) {
      const boostPercent = Math.round(scores.areaHistoryBoost * 100);
      factors.push(`Area has history of unresolved cases - boosting score ${boostPercent}%`);
    }

    if (avgTimeUnresolvedHours > 0 && avgTimeUnresolvedHours > 12) {
      factors.push(`Area average resolution time: ${avgTimeUnresolvedHours.toFixed(1)} hours`);
    }

    const explanation = factors.length > 0 
      ? `${riskLevel}: ${factors.join(' | ')}`
      : `${riskLevel}: No specific risk factors identified`;

    return explanation;
  }

  getRiskLevel(score) {
    if (score >= 85) return '🔴 CRITICAL RISK';
    if (score >= 70) return '🟠 HIGH RISK';
    if (score >= 50) return '🟡 MEDIUM RISK';
    if (score >= 30) return '🟢 LOW RISK';
    return '✅ MINIMAL RISK';
  }
  updateWeights(caseData) {
    if (!caseData.type) return;

    const categoryKey = caseData.type.toLowerCase();
    if (this.weights.category[categoryKey] === undefined) return;

    const maxResolutionHours = 72;
    const resolutionFactor = Math.min(1.0, (caseData.resolution_time_hours || 48) / maxResolutionHours);

    if (resolutionFactor > 0.7) {
      this.weights.category[categoryKey] *= 1.02;
    } else if (resolutionFactor < 0.3) {
      this.weights.category[categoryKey] *= 0.98;
    }

    this.weights.category[categoryKey] = Math.min(0.99, Math.max(0.15, this.weights.category[categoryKey]));

    this.storeWeights();
  }

  storeWeights() {
    const now = Date.now();

    Object.entries(this.weights.category).forEach(([featName, weight]) => {
      db.run(
        `INSERT OR REPLACE INTO model_weights (feature_name, weight, last_updated, confidence)
         VALUES (?, ?, ?, ?)`,
        [`category_${featName}`, weight, now, 0.8],
        (err) => {
          if (err) console.error(`Failed to store category weight for ${featName}:`, err.message);
        }
      );
    });
  }

  loadWeights() {
    return new Promise((resolve) => {
      db.all('SELECT feature_name, weight FROM model_weights', (err, rows) => {
        if (err || !rows) {
          resolve();
          return;
        }

        rows.forEach(row => {
          if (row.feature_name.startsWith('category_')) {
            const categoryName = row.feature_name.replace('category_', '');
            if (this.weights.category[categoryName] !== undefined) {
              this.weights.category[categoryName] = row.weight;
            }
          }
        });

        console.log('✅ ML Model weights loaded from database');
        resolve();
      });
    });
  }
}

module.exports = new MLRiskModel();
