const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const DB = 'musicprofile';
const COLL = 'profiles';

module.exports = async (req, res) => {
  try {
    if (!client.topology || !client.topology.isConnected()) await client.connect();
    const db = client.db(DB);
    const coll = db.collection(COLL);

    if (req.method === 'POST') {
      const body = await parseBody(req);
      await coll.insertOne(body);
      res.status(200).json({ message: 'Saved' });
    } else if (req.method === 'GET') {
      const docs = await coll.find({}).sort({ _id: -1 }).limit(20).toArray();
      res.status(200).json(docs);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: String(err) });
  }
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
  });
}
