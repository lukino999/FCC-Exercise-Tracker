const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
const LIMIT = 'limit'
const FROM = 'from'
const TO = 'to'
const UNKNOWN_USER_ID = 'unknown userId';


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
            res.status(201).json({ [USER_NAME]: doc[USER_NAME], [_ID]: doc[_ID] })
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
  const body = req.body
  const bodyKeys = Object.keys(body)
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
  const duration = parseFloat(body[DURATION])
  if ((duration < 0) || !Number.isInteger(duration) || (duration === NaN)) {
    res.status(400).json({ [ERROR]: 'field duration must be a positive integer' })
    return
  }

  // date 
  console.log('body[DATE]', body[DATE])
  if ((body[DATE] === null) || (body[DATE] === '') || (body[DATE] === undefined)) {
    console.log(' - - creating new Date');
    const now = new Date();
    let month = now.getMonth();
    month = month > 9 ? month : `0${month}`
    let day = now.getDate();
    day = day > 9 ? day : `0${day}`
    body[DATE] = `${now.getFullYear()}-${month}-${day}`
  }

  // check for valid date
  if (!validateDate(req.body[DATE], 'boolean', 'yyyy-mm-dd')) {
    console.log(' - - invalid date');
    res.status(400).json({ [ERROR]: 'invalid date' })
    return
  }

  const newExercise = {}
  const exerciseKeys = [DESCRIPTION, DURATION, DATE]
  exerciseKeys.forEach(k => { newExercise[k] = body[k] })

  console.log(body)

  UserModel.findByIdAndUpdate(body[USER_ID],
    { $push: { [LOG]: newExercise } },
    { new: true, useFindAndModify: false })
    .then(doc => {
      if (doc) {
        console.log('add exercise\n', doc)
        res.status(201).json({
          [_ID]: doc[_ID],
          [USER_NAME]: doc[USER_NAME],
          [DATE]: body[DATE],
          [DURATION]: parseInt(body[DURATION]),
          [DESCRIPTION]: body[DESCRIPTION]
        })
      } else {
        console.log(doc)
        res.status(400).json({ [ERROR]: UNKNOWN_USER_ID })
      }
    })
    .catch(err => {
      sendInternalError(res, err)
    })

  //
})

// get exercise log for userId
router.get('/api/exercise/log', (req, res) => {
  const userId = req.query[USER_ID]
  if (userId == '') {
    res.status(400).json({ [ERROR]: 'userId required' })
    return
  }

  // build pipeline
  const from = req.query[FROM]
  let filterFrom
  if (from) {
    if (validateDate(from, 'boolean', 'yyyy-mm-dd')) {
      filterFrom = { $gte: ['$$entry.date', new Date(from)] }
    } else {
      res.status(400).json({ error: 'invalid date format on query field -from-' })
      return
    }
  }

  const to = req.query[TO]
  let filterTo
  if (to) {
    if (validateDate(to, 'boolean', 'yyyy-mm-dd')) {
      filterTo = { $lte: ['$$entry.date', new Date(to)] }
    } else {
      res.status(400).json({ error: 'invalid date format on query field -to-' })
      return
    }
  }

  const pipeline = [{ $match: { _id: mongoose.Types.ObjectId(userId) } }]
  let extraLimit = 0
  if ((filterFrom !== undefined) || (filterTo !== undefined)) {
    const filters = []
    if (filterFrom) {
      filters.push(filterFrom)
      pipeline.push({ $project: { username: true, log: { $concatArrays: ['$log', [{ fake: 1, date: new Date(from) }]] } } })
    }
    if (filterTo) {
      filters.push(filterTo)
      pipeline.push({ $project: { username: true, log: { $concatArrays: ['$log', [{ fake: 1, date: new Date(to) }]] } } })
      extraLimit++
    }

    pipeline.push({
      $project: {
        username: 1,
        log: {
          $filter: {
            input: '$log',
            as: 'entry',
            cond: {
              $and: filters
            }
          }
        }
      }
    })
  }

  pipeline.push({ $unwind: '$log' }, { $sort: { 'log.date': -1 } })

  const limit = parseFloat(req.query[LIMIT])


  if (limit) {
    if ((limit < 1) || !Number.isInteger(limit)) {
      res.status(400).json({ [ERROR]: 'field \'limit\' must be a positive integer' })
      return
    } else {
      pipeline.push({ $limit: limit + extraLimit })
    }
  }

  pipeline.push({
    $group: {
      _id: '$_id',
      username: { $first: '$username' },
      log: { $push: '$log' }
    }
  }
    ,
    {
      $project: {
        username: true, log: {
          $filter: {
            input: '$log',
            as: 'entry',
            cond: { $ne: ['$$entry.fake', 1] }
          }
        }
      }
    }
  )

  UserModel.aggregate(pipeline)
    .then(docs => {
      if (docs.length == 0) {
        console.log('unkown userId')
        res.status(400).json({ [ERROR]: 'unknown userId' })
      } else {
        const doc = docs[0]
        console.log('get log\n', doc);
        res.json({
          [_ID]: doc[_ID],
          [USER_NAME]: doc[USER_NAME],
          count: doc[LOG].length,
          [LOG]: doc[LOG]
        })
      }
    })
    .catch(err => {
      sendInternalError(res, err)
    })
})

module.exports = router;

function sendInternalError(res, err) {
  console.log(' - - - - - - - send internal error - - - - - - ');
  console.log(err);
  console.log(' - - - - - - end of internal error - - - - - - ');
  res.status(500).send(err);
}
