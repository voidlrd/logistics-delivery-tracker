import React, { Suspense, useEffect, useState } from 'react'
import { io } from 'socket.io-client';

const OrderStats = React.lazy(() => import('dashboard/OrderStats'));
const LiveMap = React.lazy(() => import('tracking/LiveMap'));

const socket = io('http://localhost', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  autoConnect: false
});

function App() {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const login = async () => {
    const res = await fetch('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'StudentUser' })
    });
    const data = await res.json();
    setToken(data.token);
    localStorage.setItem('token', data.token);

    const decoded = decodeToken(data.token);
    if (decoded && decoded.exp) {
      setTokenExpiry(decoded.exp * 1000);
    }
  };

  const logout = () => {
    setToken('');
    setTokenExpiry(null);
    localStorage.removeItem('token');
    socket.disconnect();
    setNotifications([]);
    console.log('User logged out');
  };

  const placeOrder = async () => {
    try {
      const response = await fetch('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: 'John Doe', total: Math.random() * 100 })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Order failed:', error);
        
        if (response.status === 401 || response.status === 403) {
          console.log('Token expired or invalid. Logging out...');
          logout();
        }
        return;
      }
      
      const data = await response.json();
      console.log('Order placed successfully:', data);
    } catch (err) {
      console.error('Network error:', err);
    }
  };

  const moveDriver = async () => {
    try {
      const response = await fetch('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: 'DRV-001',
          latitude: 45 + Math.random(),
          longitude: 25 + Math.random()
        })
      });

      if (!response.ok && (response.status === 401 || response.status === 403)) {
        console.log('Token expired or invalid. Logging out...');
        logout();
      }
    } catch (err) {
      console.error('Network error:', err);
    }
  };

  useEffect(() => {
    if (!token || !tokenExpiry) return;

    const checkTokenExpiry = () => {
      const now = Date.now();
      const timeUntilExpiry = tokenExpiry - now;

      if (timeUntilExpiry <= 0) {
        console.log('Token expired. Auto-logging out...');
        logout();
      }
    };

    checkTokenExpiry();

    const interval = setInterval(checkTokenExpiry, 5000);

    const timeUntilExpiry = tokenExpiry - Date.now();
    const timeout = setTimeout(() => {
      console.log('Token expired. Auto-logging out...');
      logout();
    }, timeUntilExpiry);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [token, tokenExpiry]);

  useEffect(() => {
    if (token && !tokenExpiry) {
      const decoded = decodeToken(token);
      if (decoded && decoded.exp) {
        setTokenExpiry(decoded.exp * 1000);
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      socket.auth = { token };
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      
      if (error.message === 'Authentication error') {
        console.log('Socket authentication failed. Logging out...');
        logout();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('notifications', (data) => {
      setNotifications(prev => [data.message, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off("notifications");
    };
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #646cff',
        paddingBottom: '15px'
      }}>
        <h1>Logistics Center</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!token ? (
            <button onClick={login}>Login</button>
          ) : (
            <>
              <span style={{ color: '#4CAF50', marginRight: '10px' }}>
                ✓ Logged in
                {tokenExpiry && (
                  <span style={{ fontSize: '0.85em', marginLeft: '5px', color: '#888' }}>
                    (expires in {Math.max(0, Math.floor((tokenExpiry - Date.now()) / 60000))}m)
                  </span>
                )}
              </span>
              <button 
                onClick={logout}
                style={{ 
                  backgroundColor: '#ff4444',
                  borderColor: '#ff4444'
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <div style={{ marginBottom: '15px' }}>
        <button onClick={placeOrder} disabled={!token} style={{ marginRight: '10px' }}>
          Place Order
        </button>
        <button onClick={moveDriver} disabled={!token}>
          Simulate Move
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <section>
          <Suspense fallback={<div>Loading Dashboard...</div>}>
            <OrderStats token={token} />
          </Suspense>

          <div style={{ marginTop: '20px', padding: '15px', background: '#f4f4f4', borderRadius: '8px', color: '#333' }}>
            <h3>Order Notifications</h3>
            {notifications.length === 0 && <p>No recent activity...</p>}
            {notifications.map((note, i) => (
              <div key={i} style={{ padding: '5px', borderBottom: '1px solid #ddd' }}>{note}</div> 
            ))}
          </div>
        </section>

        <section>
          <Suspense fallback={<div>Loading Tracking Stream...</div>}>
            <LiveMap token={token} />
          </Suspense>
        </section>
      </div>
    </div>
  )
}

export default App
