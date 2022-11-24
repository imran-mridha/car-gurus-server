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
    const categoryCollection = client.db("carGurus").collection("categories");
    const usersCollection = client.db("carGurus").collection("users");
    const productsCollection = client.db("carGurus").collection("products");

    // get categories data
    app.get('/categories', async(req,res)=>{
      const query = {};
      const categories = await categoryCollection.find(query).toArray();
      res.send(categories)
    })

    // get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // add users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get products
    app.get('/products', async(req, res)=>{
      const query = {}
      const products = await productsCollection.find(query).toArray();
      res.send(products)
    })
  
    // Add products
    app.post('/products', async(req, res)=> {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result)
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
