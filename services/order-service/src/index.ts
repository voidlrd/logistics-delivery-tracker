import express, { Request, Response, NextFunction } from 'express';
import amqp from 'amqplib';
import { Order, initDB } from './db'
import axios from 'axios';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'supersecret';
const INVOICE_GENERATOR_URL = process.env.INVOICE_GENERATOR_URL || 'http://invoice-generator:8080';

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

let channel: amqp.Channel;

async function initRabbit() {
    try {
        const connection = await amqp.connect(process.env.RABBIT_URL || 'amqp://rabbitmq');
        channel = await connection.createChannel();
        await channel.assertQueue('order_notifications', { durable: true });
        console.log("Connected to RabbitMQ");
    } catch (e) {
        setTimeout(initRabbit, 5000);
    }
};

app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { customerName, total } = req.body;
        const order: any = await Order.create({ customerName, total })

        console.log(`New order created: ${order.id} for ${customerName}`);

        channel.sendToQueue('order_notifications', Buffer.from(JSON.stringify({
            orderId: order.id,
            message: `New order created for ${customerName}`
        })));

        axios.post(INVOICE_GENERATOR_URL, {
            orderId: order.id,
            customerName: order.customerName,
            total: order.total
        })
        .then(response => {
            console.log(`Invoice generated successfully for order ${order.id}`);
            console.log(`Invoice URL: ${response.data.invoiceUrl}`);
        })
        .catch(err => {
            console.error(`Invoice generation failed for order ${order.id}:`, err.message);
        });

        res.status(201).json(order);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: "Failed to place order" });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'order-service',
        invoiceGeneratorUrl: INVOICE_GENERATOR_URL
    });
});

const start = async () => {
    await initDB();
    await initRabbit();

    app.listen(3001, () => {
        console.log("Order Service running on 3001");
    });
};

start();