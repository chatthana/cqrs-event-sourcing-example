export default {
  server: {
    port: process.env.PORT || '3000',
  },
  esdb: {
    uri: process.env.ESDB_CONNECTION_STRING || 'esdb://localhost:2113?tls=false',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_items',
  },
  kafka: {
    brokerList: process.env.KAFKA_BROKER_LIST || 'localhost:9092',
  },
  otel: {
    endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4317/v1/traces',
  },
};
