// Import required libraries for gRPC and file paths
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Import naming service to register this service
const { registerService } = require('./namingService');

// Path to the alert proto file
const PROTO_PATH = path.join(__dirname, '../protos/alert.proto');

// Load proto configuration
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const alertProto = grpc.loadPackageDefinition(packageDefinition).alert;

// This function handles alert requests from the client
// It checks the alert type and severity and returns a response

function SendAlert(call, callback){
    // Get data sent by the client
    const alertType = call.request.alertType;
    const severity = call.request.severity;
    const region = call.request.region;
    const message = call.request.message;

    let responseMessage;
    let recommendationAction;

    // Decide the response based on alert type and severity
    if(alertType.toUpperCase() === "FIRE"){
        responseMessage = `Fire deteted in ${region}`;
        if(severity.toUpperCase() === "HIGH"){
           recommendationAction = `Evacaute the ${region} and send the rescue team`;
        }else if(severity.toUpperCase() === "MEDIUM"){
            recommendationAction = `Monitor the situation in ${region} and prepare for possible evacuation`;
        }else{
            recommendationAction = `Keep an eye on the fire in ${region} and be ready to take action if it worsens`;
        }
    }else if(alertType.toUpperCase() === "RAIN"){
        responseMessage = `Heavy rain expected in ${region}`;
        if(severity.toUpperCase() === "HIGH"){
            recommendationAction = `Avoid outdoor activities in ${region}`;
        }else if(severity.toUpperCase() === "MEDIUM"){
            recommendationAction = `Be cautious of possible flooding in ${region}`;
        }else{
            recommendationAction = `Stay informed about the weather conditions in ${region}`;
        }
    }else if(alertType.toUpperCase() === "FLOOD"){
        responseMessage = `Severe flood warning for ${region}`;
        if(severity.toUpperCase() === "HIGH"){
            recommendationAction = `Evacuate the area immediately and seek higher ground`;
        }else if(severity.toUpperCase() === "MEDIUM"){
            responseMessage = `Flood warning for ${region}`;
            recommendationAction = `Prepare for possible flooding and stay informed about the situation`;
        }else{
            responseMessage = `Flood watch for ${region}`;
            recommendationAction = `Be aware of the potential for flooding.`;
        }
    }
    // Send the response back to the client
    callback(null, { 
        status: "Alert received",
        responseMessage: responseMessage, 
        recommendationAction: recommendationAction
    });

}

// This function simulates a live alert chat using streaming
// It sends alert messages every few seconds
function LiveAlertChat(call) {

    // Example alert messages
    const alerts = [
        "Fire detected in Pantanal North",
        "Heavy rain expected in Pantanal South",
        "Flood warning issued in central region",
    ];

    let index = 0;
    // Stop sending messages when client disconnects
    const interval = setInterval(() => {
        call.write({ message: alerts[index % alerts.length] });
        index++;
    }, 3000);

    call.on('end', () => {
        clearInterval(interval);
        call.end();
    });
}

// Create gRPC server
const server = new grpc.Server();
server.addService(alertProto.AlertService.service, {
    SendAlert,
    LiveAlertChat
});

server.bindAsync(
  '127.0.0.1:50053',
  grpc.ServerCredentials.createInsecure(),
  (err,port) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err.message);
      return;
    }

    registerService({
        serviceName: "AlertService",
        host: "127.0.0.1",
        port: port,
        description: "Handles emergency alerts"
    });
    console.log(`Alert service running on port ${port}`);
    server.start();
  }
);