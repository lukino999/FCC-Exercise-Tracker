const express = require('express')
const router = express.Router()
const UserModel = require('../models/user_model')
const sendInternalError = require('./common').sendInternalError

// create new user
router.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username
  if (username === '') {
    res.status(400).json({ error: "empty username field in request's body" })
    return
  }

  UserModel.findOne({ username: username }).then((doc) => {
    if (!doc) {
      new UserModel({ username: username })
        .save()
        .then((doc) => {
          res.status(201).json({ username: doc.username, _id: doc._id })
        })
        .catch((err) => {
          sendInternalError(err, res)
        })
    } else {
      res.json({ error: 'Username already taken' })
    }
  })
})

module.exports = router
