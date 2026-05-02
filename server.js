//import required libraries
const grpc = require('@grpc/grpc-js');
const express = require('express');
const path = require('path');
const fs = require('fs');

//Import gRPC clients for each service
const jaguarClient = require('./grpcClients/jaguarClient');
const weatherClient = require('./grpcClients/weatherClient');
const alertClient = require('./grpcClients/alertClient');

const app = express();
//allow JSON requestes and serve frontend files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//Return all registered services from the naming service registry
app.get("/api/services", (req, res) => {
    const registryPath = path.join(__dirname, "data/serviceRegistry.json");
    const services = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    res.json(services);
});

//Get all Jaguars
app.get('/api/jaguars', (req, res) => {
    jaguarClient.GetAllJaguars({}, (err, response) => {
        if (err) {
            console.error("gRPC error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(response.jaguars);
    });
});

// Get jaguar by ID
app.get('/api/jaguars/:id', (req, res) => {
    jaguarClient.GetJaguarLocation({ jaguarId: req.params.id }, (err, response) => {
        if (err) {
            return res.status(404).json({ error: err.message });
        }
        res.json(response);
    });
});

// Stream jaguar movement using Server-Sent Events
app.get('/api/jaguars/:id/stream', (req, res) => {
    //set headers for browser straming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    //Call gRPC stream method
    const stream = jaguarClient.StreamJaguarMovement({ jaguarId: req.params.id });

    //send each gRPC stream update to the browser
    stream.on('data', (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    //send error message if stream fails
    stream.on('error', (err) => {
        console.error("gRPC stream error:", err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    });

    //end stream when gRPC stream ends
    stream.on('end', () => {
        res.end();
    });

    // Cancel gRPC stream if browser disconnects
    req.on('close', () => {
        stream.cancel();
    }); 
});

//Get current weather conditions based on temperature input
app.get('/api/weather', (req, res) =>{
    const temperature = Number(req.query.temperature);

    // Validate temperature input
    if (isNaN(temperature)) {
        return res.status(400).json({ error: 'Temperature must be a number' });
    }

    //Add a deadline to prevent long-running gRPC calls
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 2);

    //Create metadata for gRPC request
    const metadata = new grpc.Metadata();
    metadata.add('client-name', 'conservation-dashboard');
    metadata.add('request-type', 'weather-condition');

    //Call gRPC method with metadata and deadline
    weatherClient.GetCurrentConditions(
        {temperature: temperature},
        metadata,
        {deadline: deadline},
        (err, response) =>{
        if(err){

            //Check for deadline exceeded error
            if (err.code === grpc.status.DEADLINE_EXCEEDED) {
                return res.status(504).json({ error: 'Request timed out' });
            }

            return res.status(500).json({ error: err.message});
        }

        res.json(response);
    })
});

//Send mutiple temperature readings using client straming
app.post('/api/weather/batch', (req, res) => {
    const readings = req.body.readings;

    //validate reading input
    if (!Array.isArray(readings) || readings.length === 0 ){
        return res.status(400).json({ error: 'Readings must be a non-empty array' });
    }

    //Convert readings to numbers and remove invalid values
    const numbers = readings.map(reading => Number(reading.temperature ?? reading))
    .filter(value => !isNaN(value));

    //Check if any valid numbers were received
    if(numbers.length === 0) {
        return res.status(400).json({ error: 'All readings must be valid numbers' });
    }

    //Start gRPC client streaming call
    const call = weatherClient.SendSensorBatch((err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    }); 

    //Send each temperature reading to the wehater service
    numbers.forEach(temp => {
        call.write({ temperature: temp });
    });

    //End client stream
    call.end();
});

//Send alert to alert service
app.post('/api/alerts', (req, res) => {
    const { alertType, severity, region, message } = req.body;

    //Validate required fields
    if (!alertType || !severity || !region) {
        return res.status(400).json({ error: 'Missing required fields: alertType, severity, region' });
    }

    //Call alert service
    alertClient.SendAlert(
        { alertType, severity, region, message },
        (err, response) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(response);
        }
    );
});

//Live alert chat using bidfirectional grpc streaming and Server-Sent Events
app.get('/api/alerts/live', (req, res) => {
    //Set headers for browser streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    //Start gRPC bidirectional streaming call
    const call = alertClient.LiveAlertChat();

    //Send each gRPC stream update to the browser
    call.on('data', (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    //Hadle gRPC stream errors
    call.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    });

    //End Browser stream when gRPC stream ends
    call.on('end', () => {
        res.end();
    }); 

    // Send initial message to gRPC stream
    call.write({ message: "Live alert chat started." });
    call.write({ message: "Monitoring for live alerts..." });

    req.on('close', () => {
        call.end();
    });
});

//Start Express server and gRPC server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});