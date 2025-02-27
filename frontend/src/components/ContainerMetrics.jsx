// ContainerMetricsPlain.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContainerMetrics = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://cadvisor:8080/api/v1.3/subcontainers')
      .then((res) => {
        console.log('cAdvisor raw data:', res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error('Error fetching cAdvisor data:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3>Plain cAdvisor Data</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default ContainerMetrics;