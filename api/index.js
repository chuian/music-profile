// Express version of your API for Vercel + MongoDB

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const DB = "musicprofile";
const COLL = "profiles";

const app = express();
app.use(express.json());

// ensure mongo connection
async function getCollection() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db(DB).collection(COLL);
}

/* --------------------
   CREATE (POST /api)
----------------------*/
app.post("/", async (req, res) => {
  try {
    const coll = await getCollection();
    const result = await coll.insertOne(req.body);
    res.status(200).json({ message: "Saved", insertedId: result.insertedId });
  } catch (err) {
    console.error("POST error:", err);
    res.status(500).json({ error: String(err) });
  }
});

/* --------------------
   READ LIST (GET /api)
----------------------*/
app.get("/", async (req, res) => {
  try {
    const coll = await getCollection();

    // optional: ?id=abc
    const id = req.query.id;
    if (id) {
      if (String(id).startsWith("local_"))
        return res.status(400).json({ error: "Local id cannot be fetched" });

      try {
        const doc = await coll.findOne({ _id: new ObjectId(id) });
        if (!doc) return res.status(404).json({ error: "Not found" });
        return res.json(doc);
      } catch {
        return res.status(400).json({ error: "Invalid id" });
      }
    }

    const docs = await coll.find({}).sort({ _id: -1 }).limit(20).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* ------------------------------
   READ SINGLE VIA PATH (/api/:id)
-------------------------------*/
app.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const coll = await getCollection();
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: "Invalid id" });
  }
});

/* --------------------
   UPDATE (PUT /api)
----------------------*/
app.put("/", async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || body._id;

    if (!id) return res.status(400).json({ error: "Missing id" });
    if (String(id).startsWith("local_"))
      return res.status(400).json({ error: "Local id cannot be updated" });

    const coll = await getCollection();
    const update = { ...body };
    delete update.id;
    delete update._id;

    const result = await coll.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) return res.status(404).json({ error: "Not found" });

    res.json({ message: "Updated", doc: result.value });
  } catch (err) {
    res.status(400).json({ error: "Invalid id" });
  }
});

/* --------------------
   DELETE (DELETE /api)
----------------------*/
app.delete("/", async (req, res) => {
  try {
    const id = req.body.id || req.body._id;

    if (!id) return res.status(400).json({ error: "Missing id" });
    if (String(id).startsWith("local_"))
      return res.status(400).json({ error: "Local id cannot be deleted" });

    const coll = await getCollection();
    const del = await coll.deleteOne({ _id: new ObjectId(id) });
    if (!del.deletedCount) return res.status(404).json({ error: "Not found" });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: "Invalid id" });
  }
});

/* --------------------
   EXPORT FOR VERCEL
----------------------*/
module.exports = app;
