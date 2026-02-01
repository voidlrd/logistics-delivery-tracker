import express from 'express';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { createClient } from 'redis';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import amqp from 'amqplib';
import { Kafka } from 'kafkajs';

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'supersecret';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
const connectRedis = async () => {
    try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
    } catch (err) {
        setTimeout(connectRedis, 2000);
    }
};
connectRedis();

const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ['GET', 'POST']
    },
    adapter: createAdapter(pubClient, subClient)
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error"));
    }

    jwt.verify(token, SECRET, (err: any, decoded: any) => {
        if (err) return next(new Error("Authentication error"));
        (socket as any).user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
});

app.post('/api/login', (req, res) => {
    const { username } = req.body;
    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    res.json({ token });
});

async function initNotificationConsumer() {
    try {
        const connection = await amqp.connect('amqp://rabbitmq');
        const channel = await connection.createChannel();
        await channel.assertQueue('order_notifications');

        channel.consume('order_notifications', (msg) => {
            if (msg) {
                const data = JSON.parse(msg.content.toString());
                console.log("Notfying clients of new order: ", data.orderId);

                io.emit("notifications", data);
                channel.ack(msg);
            }
        });
    } catch (e) {
        setTimeout(initNotificationConsumer, 5000);
    }
}

async function initKafkaRelay() {
    const kafka = new Kafka({
        clientId: 'gateway-consumer',
        brokers: ['kafka:9092'],
        retry: { retries: 10 }
    });
    const kafkaConsumer = kafka.consumer({ groupId: 'gateway-group' });

    try {
        await kafkaConsumer.connect();
        await kafkaConsumer.subscribe({ topic: 'driver-locations', fromBeginning: false });

        await kafkaConsumer.run({
            eachMessage: async ({ message }) => {
                const data = JSON.parse(message.value?.toString() || '{}');
                io.emit('driver-moved', data);
            },
        });
    } catch (e) {
        console.error("Kafka relay error, retrying...", e);
        setTimeout(initKafkaRelay, 5000);
    }
}

httpServer.listen(PORT, () => {
    initNotificationConsumer();
    initKafkaRelay();
    console.log(`Gateway running at http://localhost:${PORT}`);
});