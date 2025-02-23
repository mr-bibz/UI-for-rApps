import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * NiFi Endpoints
 */
export const fetchNifiState = () => axios.get(`${API_BASE_URL}/nifi/state`);
export const startNifi = () => axios.post(`${API_BASE_URL}/nifi/start`);
export const stopNifi = () => axios.post(`${API_BASE_URL}/nifi/stop`);

/**
 * Kafka Endpoints
 */
export const fetchKafkaState = () => axios.get(`${API_BASE_URL}/kafka/state`);
export const startKafka = () => axios.post(`${API_BASE_URL}/kafka/start`);
export const stopKafka = () => axios.post(`${API_BASE_URL}/kafka/stop`);

/**
 * Spark Endpoints
 */
export const fetchSparkState = () => axios.get(`${API_BASE_URL}/spark/state`);
export const deploySparkJob = (jobConfig) => axios.post(`${API_BASE_URL}/spark/deploy`, jobConfig);
export const stopSparkJob = () => axios.post(`${API_BASE_URL}/spark/stop`);

/**
 * ML Pipeline Endpoints
 */
export const fetchMlPipelineState = () => axios.get(`${API_BASE_URL}/ml-pipeline/state`);
export const runMlPipeline = () => axios.post(`${API_BASE_URL}/ml-pipeline/run`);
export const retrainMlPipeline = () => axios.post(`${API_BASE_URL}/ml-pipeline/retrain`);

/**
 * Metrics Endpoints
 */
export const fetchPipelineHealth = () => axios.get(`${API_BASE_URL}/metrics/pipeline-health`);
export const fetchErrorLogs = (severity) => axios.get(`${API_BASE_URL}/metrics/error-logs`, { params: {severity} });
export const fetchNifiIngestionLogs = () => axios.get(`${API_BASE_URL}/metrics/nifi-ingestion`);
export const fetchSparkTrainingLogs = () => axios.get(`${API_BASE_URL}/metrics/spark-training`);
export const fetchContainerMetrics = () => axios.get(`${API_BASE_URL}/metrics/containers`);

/**
 * Create ML pipeline Endpoints
 */
export const createMlPipeline = (pipelineData) => axios.post(`${API_BASE_URL}/ml-pipeline/create`, pipelineData);

/**
 * Fetch ML pipeline Endpoints
 */
export const fetchMlPipelines = () => axios.get(`${API_BASE_URL}/ml-pipeline`);

/**
 * Fetch ML pipeline datasets
 */
export const processDataset = (pipelineId) => axios.post(`${API_BASE_URL}/ml-pipeline/process/${pipelineId}`);

/**
 * Delete ML pipeline Endpoints
 */
export const deleteMlPipeline = (pipelineId) => axios.delete(`${API_BASE_URL}/ml-pipeline/${pipelineId}`);

/**
 * Fetch ML pipeline Logs
 */
export const fetchLogs = () => axios.get(`${API_BASE_URL}/metrics/error-logs`);

/**
 * Fetch AggregatedMetrics
 */
export const fetchAggregatedMetrics = () => axios.get(`${API_BASE_URL}/metrics/aggregated`);

/**
 * Fetch IntepretabilityMetrics
 */
export const fetchInterpretabilityMetrics = (pipelineId) => axios.get(`${API_BASE_URL}/interpretability/${pipelineId}`);

/**
 * Deployment Endpoints
 */
export const startNifiFlow = (pipelineId) => axios.post(`${API_BASE_URL}/deployment/${pipelineId}/start-processing`);
export const stopNifiFlow = (pipelineId) => axios.post(`${API_BASE_URL}/deployment/${pipelineId}/stop-processing`);
export const trainSparkModel = (pipelineId) => axios.post(`${API_BASE_URL}/deployment/${pipelineId}/train-model`);
export const retrainSparkModel = (pipelineId) => axios.post(`${API_BASE_URL}/deployment/${pipelineId}/retrain-model`);