module.exports = function classifyIncident(text) {
  if (!text) return { category: "Other", risk: 1 };

  text = text.toLowerCase();

  if (text.includes("rape") || text.includes("assault")) {
    return { category: "Sexual Assault", risk: 9 };
  }

  if (text.includes("stalking")) {
    return { category: "Stalking", risk: 7 };
  }

  if (text.includes("verbal") || text.includes("abuse")) {
    return { category: "Verbal Abuse", risk: 4 };
  }

  return { category: "Other", risk: 3 };
};
