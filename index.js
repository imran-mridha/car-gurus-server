const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dmnves2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
  try{
    const categoryCollecton = client.db("carGurus").collection("categories");

    app.get('/categories', async(req,res)=>{
      const query = {};
      const categories = await categoryCollecton.find(query).toArray();
      res.send(categories)
    })

    
  }
  finally{

  }
}

run().catch(error => console.log(error))


app.get("/", async (req, res) => {
  res.send("Doctors portal server running....");
});

app.listen(port, () => {
  console.log("Server Running on port", port);
});
