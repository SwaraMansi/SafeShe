function classifyReport(text) {
  text = text.toLowerCase();

  if (text.includes("follow") || text.includes("stalk")) {
    return "STALKING";
  }
  if (text.includes("touch") || text.includes("hit") || text.includes("push")) {
    return "PHYSICAL HARASSMENT";
  }
  if (text.includes("message") || text.includes("online") || text.includes("chat")) {
    return "CYBER HARASSMENT";
  }
  if (text.includes("abuse") || text.includes("comment")) {
    return "VERBAL HARASSMENT";
  }

  return "OTHER";
}

function riskScore(type) {
  switch (type) {
    case "PHYSICAL HARASSMENT":
      return 5;
    case "STALKING":
      return 4;
    case "CYBER HARASSMENT":
      return 3;
    case "VERBAL HARASSMENT":
      return 2;
    default:
      return 1;
  }
}

module.exports = { classifyReport, riskScore };
