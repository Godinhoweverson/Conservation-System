const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const jaguarList = require('../data/jaguars.json');

const PROTO_PATH = path.join(__dirname, '../protos/jaguar.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const jaguarProto = grpc.loadPackageDefinition(packageDefinition).jaguar;

//Get all jaguars
function GetAllJaguars(call, callback) {
  const jaguars = jaguarList.map(j => ({
    jaguarId: String(j.jaguarId),
    name: String(j.name || ""),
    latitude: Number(j.latitude),
    longitude: Number(j.longitude),
    timestamp: new Date().toISOString()
  }));

  callback(null, { jaguars });
}
//Get jaguar location by ID
function GetJaguarLocation(call, callback) {
    const jaguarId = call.request.jaguarId;
    const jaguar = jaguarList.find(j => j.jaguarId === jaguarId);
    if (jaguar) {
        callback(null, { 
            jaguarId: jaguar.jaguarId,
            name: jaguar.name,
            latitude: jaguar.latitude,
            longitude: jaguar.longitude,
            timestamp: new Date().toISOString()
         });
    } else {
        callback(new Error('Jaguar not found'), null);
    }
}

//Get jaguar movement stream
//Simulate jaguar movement by sending updated location every 2 seconds
//It will randomly adjust the latitude and longitude slightly to mimic movement. 
// The stream will continue until the client cancels it. If the jaguar ID is not found, it will emit an error.
function StreamJaguarMovement(call) {
    const jaguarId = call.request.jaguarId;
    const jaguar = jaguarList.find(j => j.jaguarId === jaguarId);

    if (!jaguar) {
        call.emit('error', {
            code: grpc.status.NOT_FOUND,
            message: 'Jaguar not found' 
    });
        return;
    }

    let currLat = Number(jaguar.latitude);  
    let currLon = Number(jaguar.longitude);

    const intervalId = setInterval(() => {
        currLat += (Math.random() - 0.5) * 0.01; 
        currLon += (Math.random() - 0.5) * 0.01;

        call.write({
            jaguarId: jaguar.jaguarId,
            name: jaguar.name, 
            latitude: currLat,
            longitude: currLon,
            timestamp: new Date().toISOString()
        });
    }, 2000);

    call.on('cancelled', () => {
        clearInterval(intervalId);
        console.log(`Jaguar movement stream for ID ${jaguarId} cancelled`);
    });
}


const server = new grpc.Server();
server.addService(jaguarProto.JaguarTrackingService.service, {
  GetAllJaguars,
  GetJaguarLocation,
  StreamJaguarMovement
});

server.bindAsync(
  '127.0.0.1:50051',
  grpc.ServerCredentials.createInsecure(),
  (err,port) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err.message);
      return;
    }
    console.log(`Jaguar gRPC service running on port ${port}`);
    server.start();
  }
);