const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../protos/jaguar.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const jaguarProto = grpc.loadPackageDefinition(packageDefinition).jaguar;

const jaguarClient = new jaguarProto.JaguarTrackingService('127.0.0.1:50051', grpc.credentials.createInsecure());

module.exports = jaguarClient;

