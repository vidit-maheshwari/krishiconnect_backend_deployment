require('dotenv').config()
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const axios = require('axios');
const moment = require('moment');
const mongoose = require('mongoose');
const SensorData = require('./dataModel');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const GEOLOCATION_API_KEY = process.env.GEOLOCATION_API_KEY;

const app = express();
const port = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// const uri = process.env.MONGODB;
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// let collection;

// async function run() {
//   try {
//     await client.connect();
//     await client.db("PROJECT").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//     collection = client.db("PROJECT").collection("Recieved_data");
//   } catch (error) {
//     console.error("Failed to connect to MongoDB", error);
//     process.exit(1);
//   }
// }
// run();

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


app.get('/api/sensor-data', async (req, res) => {
  try {

    const locationResponse = await axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${GEOLOCATION_API_KEY}`);
    const { latitude, longitude, city, state_prov, country_name } = locationResponse.data;


    const hourlyData = generateHourlyData();


    await SensorData.insertMany(hourlyData.map(data => ({
      time: new Date(data.time),
      temperature: data.temperature,
      humidity: data.humidity,
      soilMoisture: data.soilMoisture,
      lightIntensity: data.lightIntensity,
      device_id: data.device_id,
    })));


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


app.post("/chatbot", async (req, res) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = req.body.prompt;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    console.log(text);
    res.json({ text });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
});

app.post("/disease", async (req, res) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = "Tell about the plant disease, both its non-diseased and diseased states, and how to solve it";

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    console.log(text);
    res.json({ text });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
});

// app.post("/cropai", async (req, res) => {
//   const device_id = "ab01";

//   try {
//     const data = await collection.findOne({ device_id: device_id });

//     if (data) {
//       const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//       const prompt = `
//         Temperature: ${data.current_temperature}
//         Humidity: ${data.current_humidity}
//         Light Intensity: ${data.current_light_intensity}
//         Soil Moisture: ${data.current_soil_moisture}
//         Wind Speed: ${data.current_wind_speed}
//         Time: ${data.current_time}
//         Nitrogen: ${data.current_nitrogen}
//         Phosphorus: ${data.current_phosphorus}
//         Potassium: ${data.current_potassium}
//         Water Level: ${data.current_water_level}
//         Based on these conditions, recommend suitable crops and mention how to grow the crop and the time period to grow the crop.
//       `;

//       try {
//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         const text = await response.text();

//         console.log(text);
//         res.json({ text });
//       } catch (error) {
//         res.status(500).json({ message: "An error occurred while generating content", error: error.message });
//       }
//     } else {
//       res.status(404).json({ message: "Data not found for this device_id" });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "An error occurred", error: error.message });
//   }
// });

app.post('/cropai', async (req, res) => {
  const device_id = req.body.device_id || "ab01"; // Device ID should come from the request body

  try {
    const data = await SensorData.findOne({ device_id: device_id });

    if (data) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
        Temperature: ${data.temperature}
        Humidity: ${data.humidity}
        Light Intensity: ${data.lightIntensity}
        Soil Moisture: ${data.soilMoisture}
        Based on these conditions, recommend suitable crops and mention how to grow the crop and the time period to grow the crop.
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        console.log(text);
        res.json({ text });
      } catch (error) {
        res.status(500).json({ message: "An error occurred while generating content", error: error.message });
      }
    } else {
      res.status(404).json({ message: "Data not found for this device_id" });
    }
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
});

// app.post("/cropfertilizer", async (req, res) => {
//   const device_id = "ab01";

//   try {
//     const data = await collection.findOne({ device_id: device_id });

//     if (data) {
//       const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//       const prompt = `
//         Temperature: ${data.current_temperature}
//         Humidity: ${data.current_humidity}
//         Light Intensity: ${data.current_light_intensity}
//         Soil Moisture: ${data.current_soil_moisture}
//         Nitrogen: ${data.current_nitrogen}
//         Phosphorus: ${data.current_phosphorus}
//         Potassium: ${data.current_potassium}
//         ${req.body.prompt}
//         Based on these conditions, recommend suitable crop fertilizer and tell how to use it.
//       `;

//       try {
//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         const text = await response.text();

//         console.log(text);
//         res.json({ text });
//       } catch (error) {
//         res.status(500).json({ message: "An error occurred while generating content", error: error.message });
//       }
//     } else {
//       res.status(404).json({ message: "Data not found for this device_id" });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "An error occurred", error: error.message });
//   }
// });

app.post('/cropfertilizer', async (req, res) => {
  const device_id = req.body.device_id || 'ab01'; // Device ID should come from the request body
  const additionalPrompt = req.body.prompt || ''; // Additional prompt from the request body

  try {
    // Retrieve sensor data from MongoDB
    const data = await SensorData.findOne({ device_id: device_id });

    if (data) {
      // Initialize the generative model
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Construct the prompt
      const prompt = `
        Temperature: ${data.temperature}
        Humidity: ${data.humidity}
        Light Intensity: ${data.lightIntensity}
        Soil Moisture: ${data.soilMoisture}
        ${additionalPrompt}
        Based on these conditions, recommend suitable crop fertilizer and tell how to use it.
      `;

      try {
        // Generate content using the model
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();

        console.log(text);
        res.json({ text });
      } catch (error) {
        res.status(500).json({ message: 'An error occurred while generating content', error: error.message });
      }
    } else {
      res.status(404).json({ message: 'Data not found for this device_id' });
    }
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});


app.post("/pest", async (req, res) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = "Tell about pest control in detail in india in paragraph";

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    console.log(text);
    res.json({ text });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

