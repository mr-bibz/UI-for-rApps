// frontend/validation.jsx
import React, { useState, useEffect } from 'react';

function ValidationPage() {
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/container-stats');
        if (!response.ok) {
          throw new Error('Error fetching stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Container Stats</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {stats.length > 0 ? (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Container Name</th>
              <th>CPU Usage</th>
              <th>Memory Usage</th>
              <th>Memory Limit</th>
              <th>Memory %</th>
              <th>Network RX</th>
              <th>Network TX</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((container) => (
              <tr key={container.id}>
                <td>{container.name}</td>
                <td>{container.cpu}</td>
                <td>{container.memory.usage}</td>
                <td>{container.memory.limit}</td>
                <td>{container.memory.memPercent}</td>
                <td>{container.network.rx}</td>
                <td>{container.network.tx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Loading stats...</p>
      )}
    </div>
  );
}

export default ValidationPage;