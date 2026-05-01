const express = require('express');
const path = require('path');
const jaguarClient = require('./grpcClients/jaguarClient');
const weatherClient = require('./grpcClients/weatherClient');
const alertClient = require('./grpcClients/alertClient');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//Show all Jaguars
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

// Stream jaguar movement
app.get('/api/jaguars/:id/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = jaguarClient.StreamJaguarMovement({ jaguarId: req.params.id });

    stream.on('data', (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    stream.on('error', (err) => {
        console.error("gRPC stream error:", err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    });

    stream.on('end', () => {
        res.end();
    });

    req.on('close', () => {
        stream.cancel();
    }); 
});

app.get('/api/weather', (req, res) =>{
    const temperature = Number(req.query.temperature);

     if (isNaN(temperature)) {
        return res.status(400).json({ error: 'Temperature must be a number' });
    }

    weatherClient.GetCurrentConditions(
        {temperature: temperature},
        (err, response) =>{
        if(err){
            return res.status(500).json({ error: err.message});
        }

        res.json(response);
    })
});

app.post('/api/weather/batch', (req, res) => {
    const readings = req.body.readings;

    if (!Array.isArray(readings) || readings.length === 0 ){
        return res.status(400).json({ error: 'Readings must be a non-empty array' });
    }

    const numbers = readings.map(reading => Number(reading.temperature ?? reading))
    .filter(value => !isNaN(value));

    if(numbers.length === 0) {
        return res.status(400).json({ error: 'All readings must be valid numbers' });
    }

    const call = weatherClient.SendSensorBatch((err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    }); 

    numbers.forEach(temp => {
        call.write({ temperature: temp });
    });

    call.end();
});

app.post('/api/alerts', (req, res) => {
    const { alertType, severity, region, message } = req.body;

     if (!alertType || !severity || !region) {
        return res.status(400).json({ error: 'Missing required fields: alertType, severity, region' });
    }

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

app.get('/api/alerts/live', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const call = alertClient.LiveAlertChat();

    call.on('data', (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    call.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    });

    call.on('end', () => {
        res.end();
    }); 

    call.write({ message: "Live alert chat started." });
    call.write({ message: "Monitoring for live alerts..." });

    req.on('close', () => {
        call.end();
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});