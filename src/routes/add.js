const express = require('express')
const router = express.Router()
const UserModel = require('../models/user_model')
const validateDate = require('validate-date')
const { sendInternalError, getFormattedDate } = require('./common')

// add exercise
router.post('/api/exercise/add', (req, res) => {
  const body = req.body
  const bodyKeys = Object.keys(body)

  const requiredKeys = ['userId', 'description', 'duration']

  const missing = []
  requiredKeys.forEach((k) => {
    if (!bodyKeys.includes(k)) missing.push(k)
  })

  if (missing.length > 0) {
    res.status(400).json({ error: 'required fields missing', missing })
    return
  }

  // duration validation
  const duration = parseFloat(body.duration)
  if (duration < 0 || !Number.isInteger(duration) || duration === NaN) {
    res.status(400).json({ error: 'field duration must be a positive integer' })
    return
  }

  // date
  const d = body.date
  if (d === null || d === '' || d === undefined) {
    const now = new Date()
    let month = now.getMonth() + 1
    month = month > 9 ? month : `0${month}`
    let day = now.getDate()
    day = day > 9 ? day : `0${day}`
    body[DATE] = `${now.getFullYear()}-${month}-${day}`
  } else if (!validateDate(req.body.date, 'boolean', 'yyyy-mm-dd')) {
    res.status(400).json({ error: 'invalid date' })
    return
  }

  const newExercise = {}
  const exerciseKeys = ['description', 'duration', 'date']
  exerciseKeys.forEach((k) => {
    newExercise[k] = body[k]
  })

  UserModel.findByIdAndUpdate(
    body.userId,
    { $push: { log: newExercise } },
    { new: true, useFindAndModify: false }
  )
    .then((doc) => {
      if (doc) {
        const l = doc.log
        const resJson = {
          id: String(doc._id),
          username: doc.username,
          date: getFormattedDate(l[l.length - 1].date),
          duration: parseInt(body.duration),
          description: body.description,
        }
        console.log(resJson)
        console.log('\n')
        res.status(201).json(resJson)
      } else {
        res.status(400).json({ error: 'unknown user id' })
      }
    })
    .catch((err) => {
      console.log(err)
      sendInternalError(res, err)
    })

  //
})

module.exports = router
