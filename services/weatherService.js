// Import required libraries for gRPC and file paths
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Import naming service to register this service
const { registerService } = require('./namingService');

// Path to the weather proto file
const PROTO_PATH = path.join(__dirname, '../protos/weather.proto');    

// Load proto configuration
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

// Load weather package from proto
const weatherProto = grpc.loadPackageDefinition(packageDefinition).weather;

// This function simulates humidity based on temperature
// Higher temperature = lower humidity
function simulateHumidity(temp) {
    let humidity;

    if(temp > 35) {
        humidity = 40 + Math.random() * 20; // 40-60% humidity
    }else if(temp > 25) {
        humidity = 50 + Math.random() * 20; // 50-70% humidity
    }else {
        humidity = 60 + Math.random() * 20; // 60-80% humidity
    }
    // Round value to integer
    return Math.round(humidity);
}

//Simulate rainfall based on a random chance. 
//This function generates a random number between 0 and 20.
function simulateRainfall(){
    const chance = Math.round(Math.random() * 20);
    return chance;
}

// This function calculates fire risk using temperature, humidity, and rainfall
function fireRisk(temp, humidity, rainfall) {
    // If rainfall is high, fire risk is low
    if (rainfall > 10){
        return 'LOW';
    } 
    // Very hot and dry = high risk
    if (temp > 35 && humidity < 50){
        return 'HIGH';
    }
    // Moderate conditions = medium risk
    if (temp > 30 && humidity < 60) {
        return 'MEDIUM'
    }
    // Default case
    return 'LOW';
}


// This function returns current weather conditions (Unary RPC)
function GetCurrentConditions(call, callback) {
    
    // Extract metadata from the call
    const clientName = call.metadata.get('client-name')[0] || 'Unknown Client';
    const requestType = call.metadata.get('request-type')[0] || 'Unknown Request Type';
    console.log(`Metadata received - Client Name: ${clientName}, Request Type: ${requestType}`);

    // Get temperature from request
    const temp = call.request.temperature;

    // Simulate other conditions
    const humidity = simulateHumidity(temp);
    const rainfall = simulateRainfall();
    const risk = fireRisk(temp, humidity, rainfall);  

    // Simulate other conditions
    callback(null, {
        temperature: temp,
        humidity: humidity, 
        rainfall: rainfall,
        fireRisk: risk
    });
}

// This function receives multiple temperature readings (Client Streaming)
// It calculates the average and returns a summary
function SendSensorBatch(call, callback) {
    const temperatures = [];

    // Receive data from client
    call.on('data', (data) => {
        const temp = Number(data.temperature);
        
        // Only add valid numbers
        if(!isNaN(temp)) {
            temperatures.push(temp);
        }
        
    });

    // When client finishes sending data
    call.on('end', () => {

        // Check if any valid data was received
        if(temperatures.length === 0) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: 'No sensor readings received'
            });
        }

        // Calculate average temperature    
        const averageTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
        
        // Simulate conditions based on average
        const averageHumidity = simulateHumidity(averageTemperature);
        const averageRainfall = simulateRainfall();
        const risk = fireRisk(averageTemperature, averageHumidity, averageRainfall);
        
        // Send final result to client
        callback(null, {
            averageTemperature: averageTemperature,
            averageHumidity: averageHumidity,
            averageRainfall: averageRainfall,
            fireRisk: risk
        });
    });
}

// Create gRPC server
const server = new grpc.Server();
server.addService(weatherProto.WeatherService.service, {
    GetCurrentConditions,
    SendSensorBatch
});

server.bindAsync(
  '127.0.0.1:50052',
  grpc.ServerCredentials.createInsecure(),
  (err,port) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err.message);
      return;
    }

    registerService({
        serviceName: "WeatherService",
        host: "127.0.0.1",
        port: port,
        description: "Provides Pantanal condition monitoring"
    });
    console.log(`Weather conditions gRPC service running on port ${port}`);
    server.start();
  }
);