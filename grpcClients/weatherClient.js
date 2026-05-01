const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const {discoverService} = require('../services/namingService');
const PROTO_PATH = path.join(__dirname, '../protos/weather.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const weatherProto = grpc.loadPackageDefinition(packageDefinition).weather;

const serviceInfo = discoverService('WeatherService');
if (!serviceInfo) {
    throw new Error('WeatherService not found in service registry');
}

const weatherClient = new weatherProto.weatherService(`${serviceInfo.host}:${serviceInfo.port}`, grpc.credentials.createInsecure());

module.exports = weatherClient;