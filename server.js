const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'ttnData';
let db;

app.use(cors());
app.use(express.json());

async function connectToMongo() {
  try {
    const client = await MongoClient.connect(mongoUrl);
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

app.post('/webhook', async (req, res) => {
  const data = req.body;
  console.log('Received data from TTN:', data);

  if (db) {
    try {
      await db.collection('uplinks').insertOne(data);
      console.log('Data inserted into MongoDB');
      io.emit('data', data);
      res.status(200).send('Data received and stored');
    } catch (err) {
      console.error('Error inserting data:', err);
      res.status(500).send('Error storing data');
    }
  } else {
    res.status(500).send('Database not connected');
  }
});

app.get('/data', async (req, res) => {
  if (db) {
    try {
      const data = await db.collection('uplinks').find().sort({_id: -1}).limit(10).toArray();
      res.json(data);
    } catch (err) {
      console.error('Error retrieving data:', err);
      res.status(500).send('Error retrieving data');
    }
  } else {
    res.status(500).send('Database not connected');
  }
});

io.on('connection', (socket) => {
  console.log('A client connected');
  socket.on('disconnect', () => console.log('A client disconnected'));
});

const PORT = process.env.PORT || 3000;


async function startServer() {
  await connectToMongo();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();