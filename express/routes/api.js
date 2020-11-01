const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const MongoDb = require('mongodb')
const { MongoClient } = require('mongodb')
const { v4: uuid4 } = require('uuid');

//const User = mongoose.model('User', {_id: String, email: String, password: String});

const client = new MongoClient('mongodb://mongodb:27017/', {useUnifiedTopology: true})
let cmfDb = null
client.connect().then(()=>{
    cmfDb = client.db('cmf')
})

function generateToken(key){
    const secret = 'abc42de52fg5dfg3342dr23r'
    return crypto.createHmac('RSA-SHA256', secret)
        .update(key + Date.now().toString())
        .digest('hex')
}

function protectPassword(password){
    return generateToken(password);
}

async function find(model, filter) {
    let items = []
    const cursor = cmfDb.collection(model).find(filter)
    await cursor.forEach((doc) => {
        items.push(doc)
    })
    return items
}

async function update(model, id, data){
    delete data._id
    await cmfDb.collection(model).updateOne({
        _id: MongoDb.ObjectId(id)
    }, {
        $set: data
    })
}

router.post('/crud', (req, res, next) => {
    switch (req.body.action) {
        case 'find':
            find(req.body.model).then((docs) => {
                res.json({
                    success: true,
                    items: docs
                })
            })
            break
        case 'create':
            cmfDb.collection(req.body.model).insertOne(req.body.data)
            res.json({
                success: true
            })
            break
        case 'read':
            find(req.body.model, {_id: MongoDb.ObjectId(req.body._id)}).then((docs) => {
                res.json({
                    success: true,
                    document: docs[0]
                })
            })
            break
        case 'update':
            update(req.body.model, req.body._id, req.body.data).then(() => {
                res.json({
                    success: true
                })
            })
            break
        case 'delete':
            cmfDb.collection(req.body.model).deleteOne({
                _id: MongoDb.ObjectId(req.body._id)
            })
            res.json({
                success: true
            })
            break
        default:
            res.json({
                success: false,
                error: "CRUD action not defined: " + req.body.action,
            })
    }
})

router.get('/nav-tree/sections', (req, res, next) => {
    const defaultValue = uuid4()
    res.json({
        success: true,
        defaultValue: defaultValue,
        items: [{
            value: defaultValue,
            label: 'Foo bar 1'
        }, {
            value: uuid4(),
            label: 'Foo bar 2'
        }]
    })
})

router.post('/signup', (req, res, next) => {
    if (!req.body.email || !req.body.password) {
        res.json({
            success: false,
            error: "Email or password not set",
        });
        return;
    }

    const user = new User({
        _id: uuid4(),
        email: req.body.email,
        password: protectPassword(req.body.password)
    });
    user.save();

    res.json({
        success: true,
        token: generateToken(),
        user: user,
    })
})

module.exports = router;
