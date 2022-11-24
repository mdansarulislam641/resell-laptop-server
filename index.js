const express = require('express')
const cors = require('cors');
require('dotenv').config();

const app = express();

// midleware
app.use(cors());
app.use(express.json())

// mongodb connection
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fg2t6rb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const categoryCollection = client.db('laptop-resell-market').collection('category');
function run() {
    try {
        client.connect();
    }
    catch (error) {
        console.log(error.message)
    }
}

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