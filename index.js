const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rmgr5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded
        next()
    });

}

async function run() {
    try {
        await client.connect()
        console.log('DB Connected!')
        const toolCollection = client.db('paint-pro').collection('tools')
        const orderCollection = client.db('paint-pro').collection('orders')
        const userCollection = client.db('paint-pro').collection('users')


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })

            res.send({ result, token })

        })

        app.get('/tool', async (req, res) => {
            const tools = await toolCollection.find().toArray()
            res.send(tools)
        })
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const tool = await toolCollection.findOne(query)
            res.send(tool)
        })

        app.post('/order', async (req, res) => {
            const order = req.body
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const userEmail = req.query.email
            const decodedEmail = req.decoded.email
            if (decodedEmail === userEmail) {
                const query = { email: userEmail }
                const orders = await orderCollection.find(query).toArray()
                res.send(orders)
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' })
            }
        })

        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        })


    }
    finally {

    }
}

run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Hello From Paint Pro!')
})

app.listen(port, () => {
    console.log('Paint Pro, Listening to port:', port)
})



