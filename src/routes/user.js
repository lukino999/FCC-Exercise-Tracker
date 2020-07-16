const express = require('express');
const router = express.Router();
const UserModel = require('../models/user_model');

router.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  if (username === '') {
    console.log('please enter username')
    res.json({ error: 'empty username field' })
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





module.exports = router;