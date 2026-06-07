require('dotenv').config();
const { MongoClient } = require('mongodb');

let client;
let db;
let connectionPromise = null;

async function connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not set!');
        return null;
    }
    
    if (connectionPromise) return connectionPromise;
    
    connectionPromise = (async () => {
        try {
            console.log('Connecting to MongoDB...');
            client = new MongoClient(uri, {
                serverApi: {
                    version: '1',
                    strict: true,
                    deprecationErrors: true,
                }
            });
            await client.connect();
            db = client.db('moffurubot');
            console.log('Connected to MongoDB!');
            return db;
        } catch (error) {
            console.error('MongoDB error:', error.message);
            connectionPromise = null;
            return null;
        }
    })();
    
    return connectionPromise;
}

async function get(key) {
    try {
        const database = await connect();
        if (!database) return null;
        const collection = database.collection('data');
        const result = await collection.findOne({ _id: key });
        return result?.value;
    } catch (error) {
        console.error('Get error:', error.message);
        return null;
    }
}

async function set(key, value) {
    try {
        const database = await connect();
        if (!database) return null;
        const collection = database.collection('data');
        await collection.updateOne(
            { _id: key },
            { $set: { value: value } },
            { upsert: true }
        );
        return value;
    } catch (error) {
        console.error('Set error:', error.message);
        return null;
    }
}

async function deleteKey(key) {
    try {
        const database = await connect();
        if (!database) return;
        const collection = database.collection('data');
        await collection.deleteOne({ _id: key });
    } catch (error) {
        console.error('Delete error:', error.message);
    }
}

module.exports = { get, set, delete: deleteKey };