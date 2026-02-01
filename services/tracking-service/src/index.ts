import express, { NextFunction, Request, Response } from 'express';
import { Kafka } from 'kafkajs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'supersecret';

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, SECRET, (err: any, user: any) => {
        if (err) {
            res.sendStatus(403);
            return;
        }
        next();
    });
};

const kafka = new Kafka({
    clientId: 'tracking-service',
    brokers: ['kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'tracking-group' });

const initKafka = async () => {
    try {
        await producer.connect();
        await consumer.connect();

        let subscribed = false;
        while (!subscribed) {
            try {
                await consumer.subscribe({ topic: 'driver-locations', fromBeginning: false });
                subscribed = true;
            } catch (err) {
                console.warn("Topic 'driver-locations' not ready yet, retrying in 2s...");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        await consumer.run({
            eachMessage: async ({ message }) => {
                const data = JSON.parse(message.value?.toString() || '{}');
                console.log(`[STREAM] Driver ${data.driverId} moved to: ${data.latitude}, ${data.longitude}`);
            },
        });

        console.log("Tracking Service connected to Kafka");
    } catch (e) {
        console.error("Failed to connect to Kafka, retrying in 5s...", e);
        setTimeout(initKafka, 5000);
    }
};

app.post('/track', authenticateToken, async (req, res) => {
    const { driverId, latitude, longitude } = req.body;

    await producer.send({
        topic: 'driver-locations',
        messages: [
            { value: JSON.stringify({ driverId, latitude, longitude, timestamp: Date.now() }) }
        ],
    });

    res.status(200).send("Location Streamed to Kafka");
});

app.listen(3002, () => {
    initKafka();
    console.log("Tracking Service running on 3002");
});