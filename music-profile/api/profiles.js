import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("❌ Missing MONGO_URI environment variable");

let client;
let db;

export default async function handler(req, res) {
  try {
    if (!client || !client.topology?.isConnected()) {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db("musicprofile");
    }

    const profiles = db.collection("profiles");

    switch (req.method) {
      case "GET": {
        const data = await profiles.find({}).sort({ _id: -1 }).toArray();
        res.status(200).json(data);
        break;
      }

      case "POST": {
        const body =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        if (!body.name || !body.genre) {
          res.status(400).json({ error: "Missing name or genre" });
          return;
        }
        await profiles.insertOne({
          name: body.name,
          genre: body.genre,
          createdAt: new Date(),
        });
        res.status(201).json({ message: "Profile added successfully" });
        break;
      }

      default:
        res.status(405).json({ error: "Method not allowed" });
        break;
    }
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
