// src/components/ContainerMetrics.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContainerMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // cAdvisor exposed on http://localhost:8085
    const cadvisorUrl = 'http://localhost:8085/metrics';

    axios
      .get(cadvisorUrl)
      .then((response) => {
        setMetrics(response.data);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching metrics');
      });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!metrics) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {metrics}
    </div>
  );
};

export default ContainerMetrics;