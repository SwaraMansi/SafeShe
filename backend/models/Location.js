const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  userId: { type: String },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Location', LocationSchema);