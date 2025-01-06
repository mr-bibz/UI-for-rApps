// utils/kafkaClient.js
const { Kafka } = require('kafkajs');
const { KAFKA_BROKER } = require('../config');

let producer;

async function getKafkaProducer() {
  if (!producer) {
    const kafka = new Kafka({
      clientId: 'ml-backend',
      brokers: [KAFKA_BROKER]
    });
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

module.exports = { getKafkaProducer };
