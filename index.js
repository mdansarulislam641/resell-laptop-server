const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const stripe = require("stripe")(process.env.STRIPE_KEY);

// midleware
app.use(cors());
app.use(express.json())

const verifyJWT = async(req,res,next)=>{
    const headers = req.headers.authorization ;
    if(!headers){
        return res.status(401).send({message:"unauthorized access"})
    }
    const token = headers.split(' ')[1];

    jwt.verify(token,process.env.JWT_TOKEN,(err,decoded)=>{
        if(err){
            return res.status(401).send({message:'unauthorized access'})
        }
       else{
        req.decoded = decoded ;
        next()
       }
    })
}


// mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fg2t6rb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// db collection
const categoryCollection = client.db('laptop-resell-market').collection('category');
const productsCollection = client.db('laptop-resell-market').collection('products')
const usersCollection = client.db('laptop-resell-market').collection('users')
const bookingCollection = client.db('laptop-resell-market').collection('bookings');
const wishListCollection = client.db('laptop-resell-market').collection('wishlist');

// admin verify
const VerifyAdmin = async(req,res,next)=>{
  const decodedEmail = req.decoded.email ;
  const emailQuery = {email:decodedEmail};
  const user = await usersCollection.findOne(emailQuery);
  if(user?.isAdmin !== 'admin'){
     return res.status(401).send("forbidden user");
  }
  next()
}
// buyer verify
const VerifyBuyer = async(req,res,next)=>{
  const decodedEmail = req.decoded.email ;
  const emailQuery = {email:decodedEmail};
  const user = await usersCollection.findOne(emailQuery);
  if(user?.role !== 'buyer'){
     return res.status(401).send("forbidden user");
  }
  next()
}
// buyer verify
const VerifySeller = async(req,res,next)=>{
  const decodedEmail = req.decoded.email ;
  const emailQuery = {email:decodedEmail};
  const user = await usersCollection.findOne(emailQuery);
  if(user?.role !== 'seller'){
     return res.status(401).send("forbidden user");
  }
  next()
}




function run() {
    try {
        client.connect();
    }
    catch (error) {
        console.log(error.message)
    }
}




// users add to db collect user
app.post('/users',async(req,res)=>{
 try{
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    res.send(result);
 }
 catch(error){
    console.log(error.message)
}
})




// jwt token
app.get('/jwt',async(req,res)=>{
    const email = req.query.email ;
    const query = {email : email};
    const user = await usersCollection.findOne(query);
    if(user){
        const token = jwt.sign({email},process.env.JWT_TOKEN,{expiresIn:'7d'})
        return res.send({resellToken:token});
    }
    else{
        res.status(403).send({token:''})
    }
    
    
})


// get specific product by id in booking collection
app.get('/booking-product/:id', async(req,res)=>{
 try{
  const id = req.params.id ;
  const filter = { product_id : id}
  // const options = {upsert : true}
  // const updatedDoc = {
  //   $set:{
  //     payBill : true
  //   }
  // }
  // const result = await bookingCollection.updateOne(filter,updatedDoc,options);
  const result = await bookingCollection.findOne(filter)
  res.send(result)
 }
 catch(e){
  console.log(e.message)
 }
})


// get specific product by id in wishlist collection
app.put('/wishlist-product/:id', async(req,res)=>{
 try{
  const id = req.params.id ;
  const filter = { product_id : (id)}
  const options = {upsert : true}
  const updatedDoc = {
    $set:{
      payBill : true
    }
  }
  const result = await wishListCollection.updateOne(filter,updatedDoc,options);
  res.send(result)
 }
 catch(e){
  console.log(e.message)
 }
})


// product find by specific id for pay bill
app.get('/product-get-payment/:id', async(req, res)=>{
  const id = req.params.id;
  const query = {_id : ObjectId(id)}
  const result = await productsCollection.findOne(query)
  res.send(result)
})


// get seller user
app.get('/users/:seller',verifyJWT,VerifyAdmin,async(req,res)=>{
  try{
    const seller = req.params.seller ;
    const  query = {role : seller};
    const result = await usersCollection.find(query).toArray();
    res.send(result)
  }

    catch(error){
        console.log(error.message)
    }
})
// get buyers user
app.get('/users/:buyer',verifyJWT,VerifyAdmin,async(req,res)=>{
  try{
    const buyer = req.params.buyer ;
    const  query = {role : buyer};
    const result = await usersCollection.find(query).toArray();
    res.send(result)
  }

    catch(error){
        console.log(error.message)
    }
})

// user verify under the admin  in productCollection
app.put('/users/:email',verifyJWT,async(req,res)=>{
  try{
    const email = req.params.email ;
    const filter = {userEmail:email};
    const options = {upsert : true};
    const updatedDoc = {
        $set:{
            verified : true
        }
    }
    const result = await productsCollection.updateMany(filter,updatedDoc,options)
    res.send(result);
  }
  catch(e){
    console.log(e.message)
  }
})

// user verify by admin in userCollection
app.put('/users-verify/:id',async(req,res)=>{
    try{
      const id = req.params.id ;
      const filter = {_id:ObjectId(id)};
      const options = {upsert : true};
      const updatedDoc = {
          $set:{
              verified : true
          }
      }

    const result = await usersCollection.updateOne(filter,updatedDoc,options)
    res.send(result);
  }
  catch(e){
    console.log(e.message)
  }
})

// delete user 
app.delete('/users/:id',verifyJWT,VerifyAdmin,async(req,res)=>{
   try{
    const id = req.params.id ;
    const query = {_id:ObjectId(id)}
    const result = await usersCollection.deleteOne(query);
    res.send(result);
   }

    catch(error){
        console.log(error.message)
    }
})

// category get from database
app.get('/categories', async (req, res) => {
    try {
        const query = {};
        const result = await categoryCollection.find(query).toArray();
        res.send(result)
    }
    catch(error){
        res.send({
            success:false,
            message:error.message
        })
    }
})

// category fin specific by id
app.get('/categories/:id',async(req,res)=>{
  try{
    const id = req.params.id ;
    const query = {_id:ObjectId(id)};
    const result = await categoryCollection.findOne(query);
    res.send(result);
  }

    catch(error){
        console.log(error.message)
    }
})


// check isAdmin 
app.get('/dashboard/admin/:email',async(req,res)=>{
try{
  const email = req.params.email ;
  const query = {email : email};
  const user = await usersCollection.findOne(query)
 
   res.send({isAdmin:user})
}
catch(e){
  console.log(e.message)
}

})

// check Buyer
app.get('/dashboard/buyer/:email',async(req,res)=>{
try{
  const email = req.params.email ;
  const query = {email : email};
  const user = await usersCollection.findOne(query)
 
   res.send({isBuyer:user})
}
catch(e){
  console.log(e.message)
}

})
// check Seller
app.get('/dashboard/seller/:email',async(req,res)=>{
try{
  const email = req.params.email ;
  const query = {email : email};
  const user = await usersCollection.findOne(query)
 
   res.send({isSeller:user})
}
catch(e){
  console.log(e.message)
}

})


// add product seller product add for api
app.post('/products',verifyJWT,VerifySeller,async(req, res)=>{
    try{
        const productInfo = req.body;
        const result = await productsCollection.insertOne(productInfo);
        res.send(result);
    }
    catch(error){
        res.send({
            success:false,
            message:error.message
        })
    }

})

// delete product can for wise seller
app.delete('/products/:id',async(req,res)=>{
  try{
    const id = req.params.id ;
    const query = {_id:ObjectId(id)};
    const result =await productsCollection.deleteOne(query);
    res.send(result)
  }
  catch(e){
    console.log(e.message)
  }
})



// get product by category wise
app.get('/products/:categoryName',async(req,res)=>{
try{
    const category = req.params.categoryName ;
    const query = {categoryName:category}
    const result = await productsCollection.find(query).toArray();
    res.send(result)
}
catch(error){
    console.log(error.message)
}

})

// product get by user email for myProducts
app.get('/products',verifyJWT,VerifySeller,async(req,res)=>{
try{
    const email = req.query.email ;
    const query = {userEmail : email};
    const result = await productsCollection.find(query).toArray();
    res.send(result);
}
catch(error){
    console.log(error.message)
}
})

// if user book product so it's sold it add products data
app.put('/products/:id',async(req,res)=>{
   try{
    const id = req.params.id ;
    const filter = {_id :ObjectId(id)};
    const options = {upsert:true}
    const updatedDoc = {
        $set:{
            sold : true
        }
    }
    const result = await productsCollection.updateOne(filter,updatedDoc,options)
    res.send(result)
   }
   catch(e){
    console.log(e.message)
   }
})


// payment product 
app.get('/dashboard/payment/:id',async(req,res)=>{
  const id = req.params.id ;
  const query = { _id: ObjectId(id)};
  const result = await bookingCollection.findOne(query);
  res.send(result)
})

// advertise product on home page 
app.put('/product-advertise/:id',async(req,res)=>{
  try{
    const id = req.params.id ;
    const filter = {_id:ObjectId(id)};
    const options = {upsert:true};
    const updatedDoc = {
        $set:{
            advertise:true
        }
    }
    const result = await productsCollection.updateOne(filter,updatedDoc,options);
    res.send(result)
  }
  catch(e){
    console.log(e.message)
   }
})


// get all advertise product for showing client ui
app.get('/advertise-product',async(req,res)=>{
    const filter = {advertise : true};
    const result = await productsCollection.find(filter).toArray();
    res.send(result);

})

// get advertise product for details only single on product
app.get('/advertise-product/:id',async(req,res)=>{
  try{
    const id = req.params.id ;
    const query = {_id:ObjectId(id)};
    const result = await productsCollection.findOne(query);
    res.send(result)
  }
  catch(e){
    console.log(e.message);
  }
})

// get user orders booking
app.get('/buyer-products/:email',verifyJWT,VerifyBuyer,async(req,res)=>{
  try{
    const email = req.params.email ;
    const query = {email : email};
    const result = await bookingCollection.find(query).toArray();
    res.send(result)
  }
  catch(e){
    console.log(e.message)
  }
})


// booking post product if user booking product stored db
app.post('/bookings',async(req,res)=>{
   try{
    const product = req.body ;
    const result =await bookingCollection.insertOne(product)
    res.send(result)
   }
   catch(error){
    console.log(error.message)
}
})


// payment api make
app.post('/create-payment-intent',async(req,res)=>{
try{
  const price = req.body.sellPrice ;
  const amount = parseFloat(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount:amount,
    currency:'usd',
    "payment_method_types":[
      'card'
    ]
  });
  res.send({
    clientSecret:paymentIntent.client_secret
  });

}
catch(e){
  console.log(e.message)
}
})

// add item wishList from user/ buyer
app.post('/wishlist',verifyJWT,async(req,res)=>{
  try{
    const wishListInfo = req.body ;
  const result = await wishListCollection.insertOne(wishListInfo)
  res.send(result)
  }
  catch(e){
    console.log(e.message)
  }
})


// get wishlist product
app.get('/wishlist/:email',verifyJWT,VerifyBuyer,async(req, res)=>{
  const email = req.params.email ;
  const query = {email : email};
  const result = await wishListCollection.find(query) .toArray();

  res.send(result)
})




app.get('/', (req, res) => {
    res.send({
        success: true,
        message: "it's Work"
    })
})


run();

app.listen(process.env.PORT, () => {
    console.log(`server running on port ${process.env.PORT}`)
})