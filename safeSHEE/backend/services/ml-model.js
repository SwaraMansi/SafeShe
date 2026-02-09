/**
 * ML-Based Risk Prediction Model
 * Implements logistic regression with features for incident risk scoring
 */

const db = require('../database');

class MLRiskModel {
  constructor() {
    this.weights = {};
    this.bias = 0;
    this.learningRate = 0.01;
    this.initialized = false;
    this.initializeDefaultWeights();
  }

  /**
   * Initialize default weights based on historical patterns
   */
  initializeDefaultWeights() {
    this.weights = {
      // Category features (most important)
      'domestic_violence': 0.85,
      'assault': 0.82,
      'stalking': 0.75,
      'threat': 0.65,
      'harassment': 0.55,
      'suspicious_activity': 0.35,
      'other': 0.20,

      // Time features
      'late_night': 0.70,      // 10 PM - 5 AM
      'early_morning': 0.45,   // 5 AM - 8 AM
      'evening': 0.55,         // 6 PM - 10 PM
      'daytime': 0.30,         // 8 AM - 6 PM

      // Day of week
      'weekend': 0.50,
      'weekday': 0.35,

      // Area/Location density
      'high_density_area': 0.60,  // >10 incidents in 30 days
      'medium_density_area': 0.40, // 5-10 incidents
      'low_density_area': 0.20,   // <5 incidents

      // Time unresolved
      'time_unresolved': 0.008,   // +0.8 per hour

      // Repeat incidents
      'repeat_offender_area': 0.50, // Same area within 30 days
    };

    this.bias = 0.3; // Default baseline confidence
    this.initialized = true;
  }

  /**
   * Sigmoid activation function for probability output
   */
  sigmoid(z) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
  }

  /**
   * Extract features from report and context
   */
  extractFeatures(reportData, areaData) {
    const features = {};
    const timestamp = reportData.timestamp || Date.now();
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // 1. Category features
    const categoryLower = (reportData.type || '').toLowerCase().replace(/\s+/g, '_');
    features['category'] = categoryLower;

    // 2. Time features
    if (hour >= 22 || hour < 5) {
      features['time'] = 'late_night';
    } else if (hour >= 5 && hour < 8) {
      features['time'] = 'early_morning';
    } else if (hour >= 18 && hour < 22) {
      features['time'] = 'evening';
    } else {
      features['time'] = 'daytime';
    }

    // 3. Day of week (weekend = Sat/Sun)
    features['day_type'] = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';

    // 4. Area density
    features['area_density'] = areaData.recentIncidents || 0;
    if (areaData.recentIncidents >= 10) {
      features['density_level'] = 'high_density_area';
    } else if (areaData.recentIncidents >= 5) {
      features['density_level'] = 'medium_density_area';
    } else {
      features['density_level'] = 'low_density_area';
    }

    // 5. Time unresolved (in hours)
    features['time_unresolved_hours'] = areaData.avgTimeUnresolvedHours || 0;

    // 6. Repeat incidents in area
    features['repeat_incidents'] = areaData.hasRecentIncidents ? 1 : 0;

    return features;
  }

  /**
   * Calculate area data from database
   */
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

      // Get incidents within 5km radius in last 30 days
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

          // Simple distance calculation (Haversine approximation)
          const incidentsNearby = rows.filter(row => {
            const distance = this.calculateDistance(latitude, longitude, row.latitude, row.longitude);
            return distance < 5; // 5km radius
          });

          // Calculate average time unresolved for pending/investigating
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

  /**
   * Haversine distance formula (simplified for small areas)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Predict risk score and confidence for a report
   */
  async predictRisk(reportData) {
    try {
      // Extract base features
      const areaData = await this.getAreaData(reportData.latitude, reportData.longitude);
      const features = this.extractFeatures(reportData, areaData);

      // Calculate prediction score
      let score = this.bias;

      // Add category weight
      const categoryWeight = this.weights[features.category] || this.weights['other'];
      score += categoryWeight * 0.35;

      // Add time weight
      const timeWeight = this.weights[features.time] || this.weights['daytime'];
      score += timeWeight * 0.25;

      // Add day type weight
      const dayWeight = this.weights[features.day_type] || 0.35;
      score += dayWeight * 0.10;

      // Add area density weight
      const densityWeight = this.weights[features.density_level] || this.weights['low_density_area'];
      score += densityWeight * 0.15;

      // Add time unresolved factor (affects pending reports)
      score += features.time_unresolved_hours * this.weights['time_unresolved'];

      // Add repeat incidents factor
      if (features.repeat_incidents) {
        score += this.weights['repeat_offender_area'] * 0.10;
      }

      // Apply sigmoid to get probability (0-1)
      const probability = this.sigmoid(score * 2); // Scale for better distribution
      const confidence = Math.min(0.99, this.bias + (probability * 0.8)); // Confidence 0-1
      const riskScore = Math.round(probability * 100); // Convert to 0-100 scale

      return {
        predicted_risk_score: riskScore,
        ai_confidence: parseFloat(confidence.toFixed(2)),
        features: features,
        explanation: this.generateExplanation(features, riskScore)
      };
    } catch (error) {
      console.error('ML Prediction error:', error);
      return {
        predicted_risk_score: 50,
        ai_confidence: 0.3,
        features: {},
        explanation: 'Default prediction due to error'
      };
    }
  }

  /**
   * Generate human-readable explanation of risk factors
   */
  generateExplanation(features, riskScore) {
    const factors = [];

    // Category explanation
    const categoryMap = {
      'domestic_violence': 'Domestic violence category (high severity)',
      'assault': 'Assault report (high severity)',
      'stalking': 'Stalking incident (high severity)',
      'threat': 'Threat report (medium-high severity)',
      'harassment': 'Harassment incident (medium severity)',
      'suspicious_activity': 'Suspicious activity (low-medium)',
      'other': 'Other incident type'
    };
    if (categoryMap[features.category]) {
      factors.push(categoryMap[features.category]);
    }

    // Time explanation
    if (features.time === 'late_night') {
      factors.push('Incident during late night hours (higher risk period)');
    } else if (features.time === 'evening') {
      factors.push('Incident during evening (elevated risk period)');
    }

    // Area density explanation
    if (features.density_level === 'high_density_area') {
      factors.push(`High incident density area (${features.area_density} recent incidents)`);
    } else if (features.density_level === 'medium_density_area') {
      factors.push(`Moderate incident density area (${features.area_density} recent incidents)`);
    }

    // Repeat incidents
    if (features.repeat_incidents) {
      factors.push('Repeat incident location (area of concern)');
    }

    // Time unresolved
    if (features.time_unresolved_hours > 2) {
      factors.push(`${features.time_unresolved_hours.toFixed(1)} hours unresolved (escalating)`);
    }

    const priority = riskScore > 85 ? 'CRITICAL' : riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';

    return `${priority} risk: ${factors.join('; ')}`;
  }

  /**
   * Update model weights based on resolved cases (continuous learning)
   */
  updateWeights(caseData) {
    // Simple weight update: if case was resolved quickly, lower category weight slightly
    // If it took long, increase category weight
    if (caseData.resolution_time_hours) {
      const timeRatio = caseData.resolution_time_hours / 24; // Normalized to days
      const factor = timeRatio > 1 ? 1.05 : 0.98; // Increase or decrease

      if (caseData.type) {
        const categoryKey = caseData.type.toLowerCase().replace(/\s+/g, '_');
        if (this.weights[categoryKey]) {
          this.weights[categoryKey] *= factor;
          this.weights[categoryKey] = Math.min(0.99, Math.max(0.1, this.weights[categoryKey]));
        }
      }
    }

    // Store updated weights in database
    this.storeWeights();
  }

  /**
   * Store weights in database for persistence
   */
  storeWeights() {
    const now = Date.now();
    Object.entries(this.weights).forEach(([feature, weight]) => {
      db.run(
        `INSERT OR REPLACE INTO model_weights (feature_name, weight, last_updated, confidence)
         VALUES (?, ?, ?, ?)`,
        [feature, weight, now, 0.7],
        (err) => {
          if (err) console.error(`Failed to store weight for ${feature}:`, err.message);
        }
      );
    });
  }

  /**
   * Load weights from database
   */
  loadWeights() {
    return new Promise((resolve) => {
      db.all('SELECT feature_name, weight FROM model_weights', (err, rows) => {
        if (err || !rows) {
          resolve();
          return;
        }
        rows.forEach(row => {
          this.weights[row.feature_name] = row.weight;
        });
        console.log('✅ ML Model weights loaded from database');
        resolve();
      });
    });
  }
}

// Export singleton instance
module.exports = new MLRiskModel();
