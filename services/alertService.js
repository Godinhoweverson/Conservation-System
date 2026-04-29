const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../protos/alert.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const alertProto = grpc.loadPackageDefinition(packageDefinition).alert;

function SendAlert(call, callback){
    const alertType = call.request.alertType;
    const severity = call.request.severity;
    const region = call.request.region;
    const message = call.request.message;

    let responseMessage;
    let recommendationAction;


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

    callback(null, { 
        status: "Alert received",
        responseMessage: responseMessage, 
        recommendationAction: recommendationAction
    });

}

function LiveAlertChat(call) {
    const interval = setInterval(() => {
        call.write({ message: "Monitoring alert conditions..." });
    }, 5000);

    call.on('data', (request) => {
        const msg = request.message.toLowerCase();

        let response = "Monitoring the situation...";

        if (msg.includes("fire")){
            response = "Fire detected!";
        } else if (msg.includes("rain")) {
            response = "Heavy rain expected!";
        } else if (msg.includes("flood")) {
            response = "Flood warning issued!";
        }

        call.write({ message: response });
    });

    call.on('end', () => {
        clearInterval(interval);
        call.end();
    });
}

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
    console.log(`Alert service running on port ${port}`);
    server.start();
  }
);