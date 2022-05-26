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
        const reviewCollection = client.db('paint-pro').collection('reviews')

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next()
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }
        }

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            console.log(isAdmin)
            res.send({ admin: isAdmin })
        })

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
        app.put('/user/update/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)

        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.post('/tool', verifyJWT, verifyAdmin, async (req, res) => {
            const tool = req.body
            const result = await toolCollection.insertOne(tool)
            res.send(result)
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
        app.delete('/tool/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await toolCollection.deleteOne(query)
            res.send(result)

        })

        app.post('/order', verifyJWT, async (req, res) => {
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

        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray()
            res.send(reviews)
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



