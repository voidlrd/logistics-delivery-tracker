import { Sequelize, DataTypes } from 'sequelize';

const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/logistics_db'

const sequelize = new Sequelize(dbUrl, {
    host: 'postgres',
    dialect: 'postgres',
    logging: false
});

export const Order = sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerName: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'PENDING' },
    total: { type: DataTypes.FLOAT, allowNull: false }
});

export const initDB = async () => {
    try {
        await sequelize.authenticate()
        await sequelize.sync({ alter: true }),
        console.log("Postgres connected");
    } catch (error) {
        console.error("Unable to connect to Postgres, retrying...", error);
        setTimeout(initDB, 5000);
    }
}