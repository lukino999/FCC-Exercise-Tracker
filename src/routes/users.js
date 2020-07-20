const express = require('express')
const router = express.Router()
const UserModel = require('../models/user_model')
const sendInternalError = require('./common').sendInternalError

// get list of all users
router.get('/api/exercise/users', (req, res) => {
  UserModel.find({}, '_id username')
    .then((doc) => {
      res.json(doc)
    })
    .catch((err) => {
      sendInternalError(res, err)
    })
})

module.exports = router
