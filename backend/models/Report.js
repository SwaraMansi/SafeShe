const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
    },
    category: {
  type: String
},
riskScore: {
  type: Number
}

  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);

