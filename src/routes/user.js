const express = require('express');
const router = express.Router();
const UserModel = require('../models/user_model');
const validateDate = require('validate-date');

const _ID = '_id'
const USER_ID = 'userId'
const USER_NAME = 'username'
const DESCRIPTION = 'description'
const DURATION = 'duration'
const DATE = 'date'

// create new user
router.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  if (username === '') {
    res.status(400).json({ error: 'empty username field in request\'s body' })
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
            sendInternalError(err, res);
          })
      } else {
        res.json({ error: 'Username already taken' })
      }
    })
});

// get list of all users
router.get('/api/exercise/users', (req, res) => {
  UserModel.find({}, '_id username')
    .then(doc => {
      res.json(doc)
    })
    .catch(err => {
      sendInternalError(res, err)
    })
})

// add exercise
router.post('/api/exercise/add', (req, res) => {
  const bodyKeys = Object.keys(req.body)
  const requiredKeys = [USER_ID, DESCRIPTION, DURATION]
  const missing = []

  requiredKeys.forEach(k => {
    if (!bodyKeys.includes(k)) missing.push(k)
  })

  if (missing.length > 0) {
    res.status(400).json({ error: 'required fields missing', missing })
    return
  }

  // duration validation
  const duration = parseFloat(req.body[DURATION])
  if ((duration < 0) || !Number.isInteger(duration) || (duration === NaN)) {
    res.status(400).json({ error: 'field duration must be a positive integer' })
    return
  }

  // date 
  if (bodyKeys.includes(DATE)) {
    // check for valid date
    if (!validateDate(req.body[DATE], 'boolean', 'yyyy-mm-dd')) {
      res.status(400).json({ error: 'invalid date' })
      return
    }
  } else {
    const now = new Date();
    let month = now.getMonth();
    month = month > 9 ? month : `0${month}`
    let day = now.getDate();
    day = day > 9 ? day : `0${day}`
    req.body[DATE] = `${now.getFullYear()}-${month}-${day}`
  }

  const newExercise = {}
  const exerciseKeys = [DESCRIPTION, DURATION, DATE]
  exerciseKeys.forEach(k => { newExercise[k] = req.body[k] })
  UserModel.findByIdAndUpdate(req.body[USER_ID],
    { '$push': { 'log': newExercise } },
    { 'new': true })
    .then(doc => {
      res.json(doc)
    })
    .catch(err => {
      console.log('findByIdAndUpdate error', err)
      console.log(' - - - - - end off error - - - - - ');
    })

  //
})


module.exports = router;

function sendInternalError(err, res) {
  console.log(err);
  res.status(500).json({ error: err });
}
