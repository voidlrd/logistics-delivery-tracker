import { useEffect, useState } from "react";
import { io } from 'socket.io-client';

const socket = io('http://localhost', {
    transports: ['websocket', 'polling'],
    auth: {
        token: localStorage.getItem('token')
    },
    reconnection: true,
    reconnectionDelay: 1000,
    autoConnect: false
});

const OrderStats = ({ token }: { token: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (token) {
            socket.auth = { token };
            if (!socket.connected) {
                socket.connect();
            }
        } else {
            setCount(0);
            socket.disconnect();
        }

        socket.on('notifications', () => {
            setCount(prev => prev + 1);
        });

        socket.on('connect_error', (error) => {
            console.error('OrderStats socket error:', error);
            if (error.message === 'Authentication error') {
                setCount(0);
            }
        });

        return () => {
            socket.off("notifications");
            socket.off("connect_error");
        };
    }, [token]);

    return (
        <div style={{ padding: "1rem", border: "1px solid #646cff", borderRadius: "8px", background: "#1a1a1a" }}>
            <h3 style={{ color: "#646cff" }}>Order Monitor (MFE)</h3>
            <p style={{ fontSize: "2rem", margin: "10px 0" }}>{count}</p>
            <p style={{ color: "#888" }}>Total orders received this session</p>
            {!token && (
                <p style={{ color: "#ff4444", fontSize: "0.9em", marginTop: "10px" }}>
                    ⚠ Please login to receive updates
                </p>
            )}
        </div>
    );
};

export default OrderStats;