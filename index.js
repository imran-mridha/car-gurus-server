const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dmnves2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// Verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const categoryCollection = client.db("carGurus").collection("categories");
    const usersCollection = client.db("carGurus").collection("users");
    const productsCollection = client.db("carGurus").collection("products");
    const bookingsCollection = client.db("carGurus").collection("bookings");
    const paymentsCollection = client.db("carGurus").collection("payments");
    const reportingsCollection = client.db("carGurus").collection("reportings");

    // Admin Verify
    const verifyAdmin = async(req, res, next)=> {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

     // Verify Seller
     const verifySeller = async(req, res, next)=> {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'seller') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

     // Verify buyer
     const verifyBuyer = async(req, res, next)=> {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'buyer') {
          return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }


    // Get JWT Token
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        return res.send({ accessToken: token });
      }
      console.log(user);
      res.status(403).send({ accessToken: "" });
    });
    // get categories data
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoryCollection.find(query).toArray();
      res.send(categories);
    });

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


    //Admin Role
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //Seller Role
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

     //Buyer Role
     app.get("/users/buyers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "buyer" });
    });


    // All seller
    app.get("/sellers",verifyJWT,verifyAdmin, async (req, res) => {
      const query = {
        role: "seller",
      };
      const selers = await usersCollection.find(query).toArray();
      res.send(selers);
    });

    // All Buyers
    app.get("/buyers",verifyJWT,verifyAdmin, async (req, res) => {
      const query = {
        role: "buyer",
      };
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });

    // Delete Buyer
    app.delete("/buyers/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // Delete Seller
    app.delete("/sellers/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });


//// All Product Api

    // get products
    app.get("/products",verifyJWT, async (req, res) => {
      const query = {};
      const products = await productsCollection.find(query).toArray();
      const soldProduct = products.filter(product => product.status === "sold")
      const filterProducts = products.filter(product => !soldProduct.includes(product))
      res.send(filterProducts);
    });


    app.get("/my-products/seller/:email",verifyJWT,verifySeller, async (req, res) => {
      const email = req.params.email;
      const query = { sellerEmail: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    // get products
    app.get("/products/:categoryId",verifyJWT, async (req, res) => {
      const catId = req.params.categoryId;
      const query = { categoryId: catId };
      const products = await productsCollection.find(query).toArray();
      const soldProduct = products.filter(product => product.status === "sold")
      const filterProducts = products.filter(product => !soldProduct.includes(product))
      res.send(filterProducts);
    });

    // Add products
    app.post("/products",verifyJWT,verifySeller, async (req, res) => {

      let product = req.body;
      const categoryQuery = {
        _id: ObjectId(product.categoryId)
      }

      const categories = await categoryCollection.findOne(categoryQuery);
      const catName = categories.name;

      product.categoryName = catName;

      const userQuery = {
        email: product.sellerEmail
      }

      const user = await usersCollection.findOne(userQuery)
      const isVerified = user.verified;

      if(isVerified === 'true'){
        product.verified = 'true'
      }

      const result = await productsCollection.insertOne(product);
      res.send(result)
    });

    app.delete("/products/:id",verifyJWT,verifySeller, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });

/// End All Product Api


///  All Booking Api

    // get my bookings data
    app.get("/bookings",verifyJWT,verifyBuyer, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });
    // Post Booking Data
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const query = {
        // appoinmentDate: booking.appoinmentDate,
        name: booking.name,
        email: booking.email,
      };
      const alreadyBooked = await bookingsCollection.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You already booked ${booking.name}.`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    // Get booking with id
    app.get("/bookings/:id",verifyJWT,verifyBuyer, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

/// End All Booking Api


//aLL reporting api

    // get reporting data
    app.get("/reporting",verifyJWT, async (req, res) => {
      const query = {};
      const report = await reportingsCollection.find(query).toArray();
      res.send(report);
    });

    app.delete("/reporting/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const findReportProduct = await reportingsCollection.findOne(filter);
      const productId = findReportProduct.productId;
      const findProduct = await productsCollection.findOne({_id: ObjectId(productId)})
      const result1 = await reportingsCollection.deleteOne(findReportProduct)
      const result2 = await productsCollection.deleteOne(findProduct)

      res.send(result1);
    });

    // Post Reporting Data
    app.post("/reporting", async (req, res) => {
      const report = req.body;
      // console.log(booking);
      const query = {
        // appoinmentDate: booking.appoinmentDate,
        name: report.name,
        email: report.email,
      };
      const alreadyReport = await reportingsCollection.find(query).toArray();

      if (alreadyReport.length) {
        const message = `You already Reported ${report.name}.`;
        return res.send({ acknowledged: false, message });
      }
      const result = await reportingsCollection.insertOne(report);
      res.send(result);
    });

   //end reporting api

// All payment api

    // payment intent
    app.post("/create-payment-intent",verifyJWT, async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const ammount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: ammount,
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // post payment data
    app.post("/payments",verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const id2 = payment.productId;

      const filter = { _id: ObjectId(id) };
      const filter2 = { _id: ObjectId(id2) };
      const updatedDoc = {
        $set: {
          paid: 'true',
          tranjectionId: payment.tranjectionId,
        },
      };
      const updatedDoc2 = {
        $set: {
          status: "sold",
          
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      const updatedResult2 = await productsCollection.updateOne(
        filter2,
        updatedDoc2
      );
      res.send(result);
    });

  // End Payment api


    // mae advertise
    app.put('/makeAdvertise/:id',verifyJWT,verifySeller, async(req, res)=>{
      const id = req.params.id;
      console.log(id);
      const filter = {
        _id: ObjectId(id)
      }
      const options = {upsert: true};
      const updateDoc = {
        $set: {
          isAdvertise: 'true'
        }
      };
      const result = await productsCollection.updateOne(filter,updateDoc,options)
      
      res.send(result)
    })

    
    app.get('/advertiseItems', async(req,res)=>{
      const query = {
        isAdvertise: 'true'
      }
      const products = await productsCollection.find(query).toArray();
      const soldProduct = products.filter(product => product.status === "sold")
      const filterProducts = products.filter(product => !soldProduct.includes(product))
      
      res.send(filterProducts)
    })

    // Verify seller

    app.put('/sellers/verified/:email',verifyJWT,verifyAdmin, async(req,res)=>{

      const email = req.params.email;

      const filter = {

        sellerEmail: email
      }
      const filter2 = {
        email: email
      }
      const options = {upsert : true}

      const updateDoc = {
        $set: {
          verified: 'true'
        }
      }

      const productHave = await productsCollection.find(filter).toArray()

      if(productHave.length){
        const set = await productsCollection.updateMany(filter,updateDoc,options)
      }

      const result = await usersCollection.updateOne(filter2, updateDoc,options)

      res.send(result);
    })

  } finally {
  }
}

run().catch((error) => console.log(error));

app.get("/", async (req, res) => {
  res.send("Car Gurus server running....");
});

app.listen(port, () => {
  console.log("Server Running on port", port);
});
