const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const {discoverService} = require('../services/namingService');
const PROTO_PATH = path.join(__dirname, '../protos/alert.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const alertProto = grpc.loadPackageDefinition(packageDefinition).alert;

const serviceInfo = discoverService('AlertService');
if (!serviceInfo) {
    throw new Error('AlertService not found in service registry');
}

const alertClient = new alertProto.AlertService(`${serviceInfo.host}:${serviceInfo.port}`, grpc.credentials.createInsecure());

module.exports = alertClient;