require('dotenv').config();
const { MongoClient } = require('mongodb');

let client;
let db;

async function connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not set!');
        return null;
    }
    try {
        console.log('Connecting to MongoDB...');
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('moffurubot');
        console.log('Connected to MongoDB!');
        return db;
    } catch (error) {
        console.error('MongoDB error:', error.message);
        return null;
    }
}

async function get(key) {
    const database = await connect();
    if (!database) return null;
    const collection = database.collection('data');
    const result = await collection.findOne({ _id: key });
    return result?.value;
}

async function set(key, value) {
    const database = await connect();
    if (!database) return null;
    const collection = database.collection('data');
    await collection.updateOne(
        { _id: key },
        { $set: { value: value } },
        { upsert: true }
    );
    return value;
}

async function deleteKey(key) {
    const database = await connect();
    if (!database) return;
    const collection = database.collection('data');
    await collection.deleteOne({ _id: key });
}

module.exports = { get, set, delete: deleteKey };