// controllers/aggregatedMetricsController.js
const axios = require('axios');
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

exports.getAggregatedMetrics = async (req, res) => {
  try {
    // Example queries (adjust metric names as per your environment)
    const nifiIngestionQuery = 'rate(nifi_ingestion_records_total[1m])';
    const kafkaThroughputQuery = 'rate(kafka_messages_total[1m])';
    const nifiCpuQuery = 'avg(rate(container_cpu_usage_seconds_total{container_name="nifi"}[1m])) * 100';
    const nifiMemQuery = 'avg(container_memory_usage_bytes{container_name="nifi"})/1024/1024';
    const errorLogsQuery = 'rate(error_logs_total[1m])';

    const [nifiRes, kafkaRes, cpuRes, memRes, errorRes] = await Promise.all([
      axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: {query: nifiIngestionQuery}}),
      axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: {query: kafkaThroughputQuery}}),
      axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: {query: nifiCpuQuery}}),
      axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: {query: nifiMemQuery}}),
      axios.get(`${PROMETHEUS_URL}/api/v1/query`, { params: {query: errorLogsQuery}})
    ]);

    const aggregatedMetrics = {
      nifiIngestion: nifiRes.data.data.result,
      kafkaThroughput: kafkaRes.data.data.result,
      nifiCpu: cpuRes.data.data.result,
      nifiMemory: memRes.data.data.result,
      errorLogs: errorRes.data.data.result
    };

    res.json(aggregatedMetrics);
  } catch (error) {
    console.error('Error fetching aggregated metrics:', error.message);
    res.status(500).json({ error: error.message });
  }
};  