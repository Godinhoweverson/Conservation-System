// Import required libraries for gRPC and file paths
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Import jaguar data from JSON file
const jaguarList = require('../data/jaguars.json');

// Import naming service to register this service
const { registerService } = require('./namingService');

// Path to the jaguar proto file
const PROTO_PATH = path.join(__dirname, '../protos/jaguar.proto');

// Load proto configuration
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const jaguarProto = grpc.loadPackageDefinition(packageDefinition).jaguar;

// This function returns all jaguars from the dataset
function GetAllJaguars(call, callback) {

    // Format each jaguar object 
    const jaguars = jaguarList.map(j => ({
        jaguarId: String(j.jaguarId),
        name: String(j.name || ""),
        latitude: Number(j.latitude),
        longitude: Number(j.longitude),
        // Add current timestamp
        timestamp: new Date().toISOString()
    }));
    
    // Send response to client
    callback(null, { jaguars });
}
//Get jaguar location by ID
function GetJaguarLocation(call, callback) {
    
    // Get jaguar ID from request
    const jaguarId = call.request.jaguarId;
    const jaguar = jaguarList.find(j => j.jaguarId === jaguarId);
    if (jaguar) {

        // Send jaguar data
        callback(null, { 
            jaguarId: jaguar.jaguarId,
            name: jaguar.name,
            latitude: jaguar.latitude,
            longitude: jaguar.longitude,
            timestamp: new Date().toISOString()
         });
    } else {
         // Send error if jaguar not found
        callback(new Error('Jaguar not found'), null);
    }
}

// This function streams jaguar movement (server streaming)
// It sends updated location every 2 seconds
function StreamJaguarMovement(call) {

    const jaguarId = call.request.jaguarId;
    
    // Find jaguar
    const jaguar = jaguarList.find(j => j.jaguarId === jaguarId);
    
    // If not found, return error
    if (!jaguar) {
        call.emit('error', {
            code: grpc.status.NOT_FOUND,
            message: 'Jaguar not found' 
    });
        return;
    }

    // Start with initial position
    let currLat = Number(jaguar.latitude);  
    let currLon = Number(jaguar.longitude);

    // Simulate movement every 2 seconds
    const intervalId = setInterval(() => {

        // Random small movement
        currLat += (Math.random() - 0.5) * 0.01; 
        currLon += (Math.random() - 0.5) * 0.01;

        // Send updated position to client
        call.write({
            jaguarId: jaguar.jaguarId,
            name: jaguar.name, 
            latitude: currLat,
            longitude: currLon,
            timestamp: new Date().toISOString()
        });
    }, 2000);

    // Stop streaming when client cancels request
    call.on('cancelled', () => {
        clearInterval(intervalId);
        console.log(`Jaguar movement stream for ID ${jaguarId} cancelled`);
    });
}

// Create gRPC server
const server = new grpc.Server();
// Add service methods to the server
server.addService(jaguarProto.JaguarTrackingService.service, {
  GetAllJaguars,
  GetJaguarLocation,
  StreamJaguarMovement
});

server.bindAsync(
  "127.0.0.1:50051",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("Failed to bind gRPC server:", err.message);
      return;
    }

    registerService({
        serviceName: "JaguarTrackingService",
        host: "127.0.0.1",
        port: port,
        description: "Tracks jaguar GPS locations"
    });

    console.log(`Jaguar gRPC service running on port ${port}`);
    server.start();
  }
);