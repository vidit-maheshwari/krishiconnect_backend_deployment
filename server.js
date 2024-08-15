// const express = require('express');
// const axios = require('axios');
// const moment = require('moment');
// const cors = require('cors');

// const app = express();
// const port = 3000;

// // Replace with your actual IPGeolocation API key
// const GEOLOCATION_API_KEY = '30275dbcb38446e6a512bfe98b9635b9';

// app.use(cors());
// // Helper function to generate random data within a range
// const generateRandomData = (min, max) => {
//   return (Math.random() * (max - min) + min).toFixed(2);
// };

// // Function to generate fake sensor data for the past 24 hours
// const generateHourlyData = () => {
//   const data = [];

//   for (let i = 0; i < 24; i++) {
//     const time = moment().subtract(i, 'hours').format('YYYY-MM-DD HH:00');
//     const temperature = generateRandomData(20, 35); // Temperature in °C
//     const humidity = generateRandomData(40, 70); // Humidity in %
//     const soilMoisture = generateRandomData(300, 600); // Soil moisture in arbitrary units
//     const lightIntensity = generateRandomData(200, 1000); // Light intensity in Lux

//     data.push({
//       time,
//       temperature: `${temperature} °C`,
//       humidity: `${humidity} %`,
//       soilMoisture: `${soilMoisture} units`,
//       lightIntensity: `${lightIntensity} Lux`,
//     });
//   }

//   return data.reverse(); // Reverse to get data in ascending order of time
// };

// // API endpoint to get fake sensor data for the past 24 hours
// app.get('/api/sensor-data', async (req, res) => {
//   try {
//     // Get current location using the IPGeolocation API
//     const locationResponse = await axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${GEOLOCATION_API_KEY}`);
//     const { latitude, longitude, city, state_prov, country_name } = locationResponse.data;

//     // Generate hourly sensor data
//     const hourlyData = generateHourlyData();

//     // Respond with the generated data
//     res.json({
//       location: {
//         latitude,
//         longitude,
//         city,
//         region: state_prov,
//         country: country_name,
//       },
//       sensorData: hourlyData,
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch location or generate data.' });
//   }
// });

// app.listen(port, () => {
//   console.log(`Fake sensor data API running on http://localhost:${port}`);
// });


const express = require('express');
const axios = require('axios');
const moment = require('moment');
const cors = require('cors');
const mongoose = require('mongoose');
const SensorData = require('./dataModel');

const app = express();
const port = 3000;

// Replace with your actual IPGeolocation API key
const GEOLOCATION_API_KEY = '30275dbcb38446e6a512bfe98b9635b9';

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/sensorDataDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(cors());

// Helper function to generate random data within a range
const generateRandomData = (min, max) => {
  return (Math.random() * (max - min) + min).toFixed(2);
};

// Function to generate fake sensor data for the past 24 hours
const generateHourlyData = () => {
  const data = [];

  for (let i = 0; i < 24; i++) {
    const time = moment().subtract(i, 'hours').format('YYYY-MM-DD HH:00');
    const temperature = generateRandomData(20, 35); // Temperature in °C
    const humidity = generateRandomData(40, 70); // Humidity in %
    const soilMoisture = generateRandomData(300, 600); // Soil moisture in arbitrary units
    const lightIntensity = generateRandomData(200, 1000); // Light intensity in Lux

    data.push({
      time,
      temperature: `${temperature} °C`,
      humidity: `${humidity} %`,
      soilMoisture: `${soilMoisture} units`,
      lightIntensity: `${lightIntensity} Lux`,
      device_id: 'ab01',
    });
  }

  return data.reverse(); // Reverse to get data in ascending order of time
};

// API endpoint to get fake sensor data for the past 24 hours
app.get('/api/sensor-data', async (req, res) => {
  try {
    // Get current location using the IPGeolocation API
    const locationResponse = await axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${GEOLOCATION_API_KEY}`);
    const { latitude, longitude, city, state_prov, country_name } = locationResponse.data;

    // Generate hourly sensor data
    const hourlyData = generateHourlyData();

    // Save the new sensor data to the database
    await SensorData.insertMany(hourlyData.map(data => ({
      time: new Date(data.time),
      temperature: data.temperature,
      humidity: data.humidity,
      soilMoisture: data.soilMoisture,
      lightIntensity: data.lightIntensity,
      device_id: data.device_id,
    })));

    // Respond with the generated data
    res.json({
      location: {
        latitude,
        longitude,
        city,
        region: state_prov,
        country: country_name,
      },
      sensorData: hourlyData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location or generate data.' });
  }
});

app.listen(port, () => {
  console.log(`Fake sensor data API running on http://localhost:${port}`);
});
