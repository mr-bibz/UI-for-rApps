// utils/kafka.js
const { Kafka } = require('kafkajs');

/**
 * Create Kafka topics if they do not already exist.
 * @param {Array<string>} topicNames - An array of topic names to create.
 */
exports.createKafkaTopics = async (topicNames) => {
  const kafka = new Kafka({ clientId: 'ml-pipeline', brokers: ['kafka:9092'] });
  const admin = kafka.admin();
  try {
    await admin.connect();
    await admin.createTopics({
      topics: topicNames.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1
      }))
    });
    console.log('[Kafka] Topics created: ${topicNames.join(', ')}');
  } catch (error) {
    console.error('Error creating Kafka topics:', error.message);
    throw error;
  } finally {
    await admin.disconnect();
  }
};