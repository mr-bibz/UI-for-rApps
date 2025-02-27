// ValidationPage.jsx
import React, { useState, useEffect } from 'react';

function ValidationPage() {
  const [stats, setStats] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching container stats...');
        // Use the full URL because the frontend is served on port 80 and backend on port 3000
        const response = await fetch('http://localhost:3000/api/containerStats');
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Error fetching stats: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched data:', data);
        setStats(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Optional: refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading container stats...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Container Stats</h1>
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
        <div>No container stats available</div>
      )}
    </div>
  );
}

export default ValidationPage;