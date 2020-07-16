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
const ERROR = 'error'
const LOG = 'log'

// create new user
router.post('/api/exercise/new-user', (req, res) => {
  const username = req.body[USER_NAME];
  if (username === '') {
    res.status(400).json({ [ERROR]: 'empty username field in request\'s body' })
    return
  }

  UserModel.findOne({ [USER_NAME]: username })
    .then(doc => {
      if (!doc) {
        new UserModel({ [USER_NAME]: username }).save()
          .then(doc => {
            res.json({ [USER_NAME]: doc[USER_NAME], [_ID]: doc[_ID] })
          })
          .catch(err => {
            sendInternalError(err, res);
          })
      } else {
        res.json({ [ERROR]: 'Username already taken' })
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
    res.status(400).json({ [ERROR]: 'required fields missing', missing })
    return
  }

  // duration validation
  const duration = parseFloat(req.body[DURATION])
  if ((duration < 0) || !Number.isInteger(duration) || (duration === NaN)) {
    res.status(400).json({ [ERROR]: 'field duration must be a positive integer' })
    return
  }

  // date 
  if (bodyKeys.includes(DATE)) {
    // check for valid date
    if (!validateDate(req.body[DATE], 'boolean', 'yyyy-mm-dd')) {
      res.status(400).json({ [ERROR]: 'invalid date' })
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
    { '$push': { [LOG]: newExercise } },
    { 'new': true })
    .then(doc => {
      res.json(doc)
    })
    .catch(err => {
      sendInternalError(res, err)
    })

  //
})

// get exercise log for iserId
router.get(`/api/exercise/log`, (req, res) => {

  console.log('req.query', req.query)
  const userId = req.query[USER_ID]
  if (userId == '') {
    res.status(400).json({ [ERROR]: 'userId required' })
    return
  }

  UserModel.findById(userId)
    .then(doc => {
      if (!doc) {
        res.status(400).json({ [ERROR]: 'unknown userId' })
      } else {
        res.json({
          [_ID]: doc[_ID],
          [USER_NAME]: doc[USER_NAME],
          [LOG]: doc[LOG]
        })
      }
    })
    .catch(err => {
      sendInternalError(res, err)
    })
})


module.exports = router;

function sendInternalError(err, res) {
  console.log(' - - - - - - - send internal error - - - - - - ');
  console.log(err);
  console.log(' - - - - - - end of internal error - - - - - - ');
  res.status(500).json({ error: err });
}
