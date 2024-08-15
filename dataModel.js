const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  temperature: { type: String, required: true },
  humidity: { type: String, required: true },
  soilMoisture: { type: String, required: true },
  lightIntensity: { type: String, required: true },
  device_id: { type: String, required: true },
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = SensorData;
