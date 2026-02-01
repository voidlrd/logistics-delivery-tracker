import { useEffect, useState } from "react";
import { io } from 'socket.io-client';

const socket = io('http://localhost', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    autoConnect: false
});

const LiveMap = ({ token }: { token: string }) => {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (token) {
            socket.auth = { token };
            if (!socket.connected) {
                socket.connect();
            }
        } else {
            setHistory([]);
            socket.disconnect();
        }

        socket.on('driver-moved', (data) => {
            setHistory(prev => [{...data, time: new Date().toLocaleTimeString()}, ...prev].slice(0, 5));
        });

        socket.on('connect_error', (error) => {
            console.error('LiveMap socket error:', error);
            if (error.message === 'Authentication error') {
                setHistory([]);
            }
        });

        return () => {
            socket.off('driver-moved');
            socket.off('connect_error');
        };
    }, [token]);

    return (
        <div style={{ padding: '1rem', border: '2px solid #4CAF50', borderRadius: '8px', background: '#1a1a1a', color: "white" }}>
            <h3>Live Tracking (MFE)</h3>
            {!token ? (
                <p style={{ color: '#ff4444' }}>⚠ Please login to view tracking data</p>
            ) : history.length === 0 ? (
                <p>Waiting for driver movement...</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0}}>
                    {history.map((pos, i) => (
                        <li key={i} style={{ marginBottom: '10px', fontSize: '0.9rem', borderLeft: '2px solid #4CAF50', paddingLeft: '10px' }}>
                            <b>{pos.driverId}</b> @ {pos.time}<br/>
                            Lat: {pos.latitude.toFixed(4)} | Lng: {pos.longitude.toFixed(4)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LiveMap;