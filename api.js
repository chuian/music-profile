const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || '';
const client = new MongoClient(uri);
const DB = 'musicprofile';
const COLL = 'profiles';

module.exports = async (req, res) => {
  try {
    // connect if not connected (Vercel cold starts)
    if (!client.topology || !client.topology.isConnected()) await client.connect();
    const db = client.db(DB);
    const coll = db.collection(COLL);

    if (req.method === 'POST') {
      const body = await parseBody(req);
      body.createdAt = new Date();
      const result = await coll.insertOne(body);
      res.status(200).json({ message: 'Saved', id: result.insertedId });
      return;
    }

    if (req.method === 'GET') {
      const { id, search } = req.query || parseQuery(req);
      if (id) {
        const doc = await coll.findOne({ _id: new ObjectId(id) });
        res.status(200).json(doc || {});
        return;
      }
      // simple search handling: if search starts with 'public:true' return public, otherwise search text fields
      const q = {};
      if (search) {
        if (search === 'public:true') q.public = true;
        else {
          const regex = new RegExp(escapeRegex(search), 'i');
          q.$or = [
            { name: regex }, { eventName: regex }, { musicPalette: regex }, { vibesWanted: regex }, { mood: regex }
          ];
        }
      }
      const docs = await coll.find(q).sort({ createdAt: -1 }).limit(100).toArray();
      res.status(200).json(docs);
      return;
    }

    if (req.method === 'PUT') {
      const { id } = req.query || parseQuery(req);
      if (!id) return res.status(400).json({ error: 'Missing id for update' });
      const body = await parseBody(req);
      body.updatedAt = new Date();
      await coll.updateOne({ _id: new ObjectId(id) }, { $set: body });
      res.status(200).json({ message: 'Updated' });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || parseQuery(req);
      if (!id) return res.status(400).json({ error: 'Missing id for delete' });
      await coll.deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ message: 'Deleted' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
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

function parseQuery(req) {
  // For Vercel's simple req, query might be in url after '?'
  const url = req.url || '';
  const qp = {};
  const idx = url.indexOf('?');
  if (idx === -1) return qp;
  const query = url.slice(idx + 1);
  query.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) qp[k] = decodeURIComponent(v || '');
  });
  return qp;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
