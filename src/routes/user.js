const express = require('express');
const router = express.Router();
const UserModel = require('../models/user_model');

router.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  if (username === '') {
    res.json({ error: 'empty username field in request\'s body' })
    return
  }

  UserModel.findOne({ username })
    .then(doc => {
      if (!doc) {
        new UserModel({ username }).save()
          .then(doc => {
            res.json({ username: doc.username, _id: doc._id })
          })
          .catch(err => {
            console.log(err)
            res.status(500).json(err)
          })
      } else {
        res.json({ error: 'Username already taken' })
      }
    })
});

router.get('/api/exercise/users', (req, res) => {
  UserModel.find({}, '_id username')
    .then(doc => {
      res.json(doc)
    })
})



module.exports = router;