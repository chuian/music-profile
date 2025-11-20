const { MongoClient, ObjectId } = require('mongodb');

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
      const result = await coll.insertOne(body);
      res.status(200).json({ message: 'Saved', insertedId: result.insertedId });
    } else if (req.method === 'GET') {
      const docs = await coll.find({}).sort({ _id: -1 }).limit(20).toArray();
      res.status(200).json(docs);
    } else if (req.method === 'PUT') {
      const body = await parseBody(req);
      const id = body.id || body._id;
      if (!id) return res.status(400).json({ error: 'Missing id for update' });
      if (String(id).startsWith('local_')) return res.status(400).json({ error: 'Local id cannot be updated on server' });
      try {
        const _id = new ObjectId(String(id));
        const update = { ...body };
        delete update.id; delete update._id;
        const updated = await coll.findOneAndUpdate({ _id }, { $set: update }, { returnDocument: 'after' });
        if (!updated.value) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ message: 'Updated', doc: updated.value });
      } catch (err) {
        return res.status(400).json({ error: 'Invalid id' });
      }
    } else if (req.method === 'DELETE') {
      const body = await parseBody(req);
      const id = body.id || body._id;
      if (!id) return res.status(400).json({ error: 'Missing id for delete' });
      if (String(id).startsWith('local_')) return res.status(400).json({ error: 'Local id cannot be deleted on server' });
      try {
        const _id = new ObjectId(String(id));
        const del = await coll.deleteOne({ _id });
        if (del.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ message: 'Deleted' });
      } catch (err) {
        return res.status(400).json({ error: 'Invalid id' });
      }
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
