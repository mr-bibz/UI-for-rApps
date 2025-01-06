// controllers/kafkaController.js
const { getKafkaProducer } = require('../utils/kafkaClient');

/**
 * Produce a message to Kafka
 */
exports.produceMessage = async (req, res) => {
  const { topic, message } = req.body;
  try {
    const producer = await getKafkaProducer();
    await producer.send({
      topic,
      messages: [{ value: message }]
    });
    return res.json({ success: true, topic, message });
  } catch (error) {
    console.error('[Kafka] Produce error:', error);
    return res.status(500).json({ error: error.message });
  }
};
