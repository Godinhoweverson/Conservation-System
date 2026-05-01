const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../protos/weather.proto');    

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const weatherProto = grpc.loadPackageDefinition(packageDefinition).weather;

//Simulate the humidity based on the temperature.
// This function generates a random humidity value based on the provided temperature.
function simulateHumidity(temp) {
    let humidity;

    if(temp > 35) {
        humidity = 40 + Math.random() * 20; // 40-60% humidity
    }else if(temp > 25) {
        humidity = 50 + Math.random() * 20; // 50-70% humidity
    }else {
        humidity = 60 + Math.random() * 20; // 60-80% humidity
    }
    return Math.round(humidity);
}

//Simulate rainfall based on a random chance. 
//This function generates a random number between 0 and 20.

function simulateRainfall(){
    const chance = Math.round(Math.random() * 20);
    return chance;
}

//Calculate fire risk based on temperature and humidity.
function fireRisk(temp, humidity, rainfall) {
    if (rainfall > 10){
        return 'LOW';
    } 

    if (temp > 35 && humidity < 50){
        return 'HIGH';
    }
  
    if (temp > 30 && humidity < 60) {
        return 'MEDIUM'
    }

    return 'LOW';
}


// Implementation for getting current weather conditions
function GetCurrentConditions(call, callback) {
    const temp = call.request.temperature;
    const humidity = simulateHumidity(temp);
    const rainfall = simulateRainfall();
    const risk = fireRisk(temp, humidity, rainfall);  

    callback(null, {
        temperature: temp,
        humidity: humidity, 
        rainfall: rainfall,
        fireRisk: risk
    });
}

function SendSensorBatch(call, callback) {
    const temperatures = [];
    call.on('data', (data) => {
        const temp = Number(data.temperature);

        if(!isNaN(temp)) {
            temperatures.push(temp);
        }
        
    });
    
    call.on('end', () => {
        if(temperatures.length === 0) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: 'No sensor readings received'
            });
        }

        const averageTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
        const averageHumidity = simulateHumidity(averageTemperature);
        const averageRainfall = simulateRainfall();
        const risk = fireRisk(averageTemperature, averageHumidity, averageRainfall);
     
        callback(null, {
            averageTemperature: averageTemperature,
            averageHumidity: averageHumidity,
            averageRainfall: averageRainfall,
            fireRisk: risk
        });
    });
}

const server = new grpc.Server();
server.addService(weatherProto.weatherService.service, {
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
    console.log(`Weather conditions gRPC service running on port ${port}`);
    server.start();
  }
);