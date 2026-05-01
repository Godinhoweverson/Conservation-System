const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const {discoverService} = require('../services/namingService');

const PROTO_PATH = path.join(__dirname, '../protos/jaguar.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const jaguarProto = grpc.loadPackageDefinition(packageDefinition).jaguar;

const serviceInfo = discoverService('JaguarTrackingService');
if (!serviceInfo) {
    throw new Error('JaguarTrackingService not found in service registry');
}

const jaguarClient = new jaguarProto.JaguarTrackingService(`${serviceInfo.host}:${serviceInfo.port}`, grpc.credentials.createInsecure());

module.exports = jaguarClient;

