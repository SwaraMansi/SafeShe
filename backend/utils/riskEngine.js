const classifyIncident = require('./aiEngine');

// Simple risk scoring combining keyword-based AI score with contextual factors
module.exports = function computeRisk({ description, location, timestamp }) {
  // Base classification from AI engine
  const ai = classifyIncident(description);

  // Start with AI risk (1-10)
  let risk = ai.risk || 3;
  const reasons = [ `AI category: ${ai.category}` ];

  // If location provided, adjust risk slightly — e.g., if late night, increase risk
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    reasons.push('Location provided');

    const time = timestamp ? new Date(timestamp) : new Date();
    const hour = time.getHours();
    // Consider night hours (22:00 - 05:00) higher risk
    if (hour >= 22 || hour <= 5) {
      risk = Math.min(10, risk + 2);
      reasons.push('Occurred at night (+2)');
    }

    // Artificial hotspot detection placeholder (can be replaced by real data)
    // Example: if coordinates are near a known hotspot (lat/lng box), increase risk
    if (location.lat > -1 && location.lat < 1 && location.lng > 36 && location.lng < 38) {
      risk = Math.min(10, risk + 1);
      reasons.push('Near hotspot (+1)');
    }
  }

  // Normalize to integer
  risk = Math.round(risk);

  return {
    category: ai.category || 'Other',
    riskScore: risk,
    reasons
  };
};