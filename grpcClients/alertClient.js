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

const alertClient = new alertProto.AlertService('127.0.0.1:50053', grpc.credentials.createInsecure());

module.exports = alertClient;