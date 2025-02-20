// config/index.js
module.exports = {
    PORT: process.env.PORT || 3000,
    NIFI_BASE_URL: process.env.NIFI_BASE_URL || 'http://nifi:8080/nifi-api',
    KAFKA_BROKER: process.env.KAFKA_BROKER || 'kafka:9092',
    MONGODB_URL: process.env.MONGODB_URL || 'mongodb://mongodb:27017/ml-pipelines',
    SPARK_MASTER: process.env.SPARK_MASTER || 'spark://spark-master:7077'
  };
  