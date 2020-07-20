const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const UserModel = require('../models/user_model')
const validateDate = require('validate-date')
const { sendInternalError, getFormattedDate } = require('./common')

// get exercise log for userId
router.get('/api/exercise/log', (req, res) => {
  const userId = req.query.userId
  if (userId == '') {
    res.status(400).json({ error: 'userId required' })
    return
  }

  // filter from
  const from = req.query.from
  let filterFrom
  if (from) {
    if (validateDate(from, 'boolean', 'yyyy-mm-dd')) {
      filterFrom = { $gte: ['$$entry.date', new Date(from)] }
    } else {
      res
        .status(400)
        .json({ error: 'invalid date format on query field -from-' })
      return
    }
  }

  // filter to
  const to = req.query.to
  let filterTo
  if (to) {
    if (validateDate(to, 'boolean', 'yyyy-mm-dd')) {
      filterTo = { $lte: ['$$entry.date', new Date(to)] }
    } else {
      res.status(400).json({ error: 'invalid date format on query field -to-' })
      return
    }
  }

  // initialise pipeline
  const pipeline = [{ $match: { _id: mongoose.Types.ObjectId(userId) } }]

  let extraLimit = 0
  if (filterFrom !== undefined || filterTo !== undefined) {
    const filters = []
    if (filterFrom) {
      filters.push(filterFrom)
      pipeline.push({
        $project: {
          username: true,
          log: { $concatArrays: ['$log', [{ fake: 1, date: new Date(from) }]] },
        },
      })
    }
    if (filterTo) {
      filters.push(filterTo)
      pipeline.push({
        $project: {
          username: true,
          log: { $concatArrays: ['$log', [{ fake: 1, date: new Date(to) }]] },
        },
      })
      extraLimit++
    }

    pipeline.push({
      $project: {
        username: 1,
        log: {
          $filter: {
            input: '$log',
            as: 'entry',
            cond: { $and: filters },
          },
        },
      },
    })
  }

  pipeline.push({ $unwind: '$log' }, { $sort: { 'log.date': -1 } })

  const limit = parseFloat(req.query.limit)
  if (limit) {
    if (limit < 1 || !Number.isInteger(limit)) {
      res
        .status(400)
        .json({ error: "field 'limit' must be a positive integer" })
      return
    } else {
      pipeline.push({ $limit: limit + extraLimit })
    }
  }

  pipeline.push(
    {
      $group: {
        _id: '$_id',
        username: { $first: '$username' },
        log: { $push: '$log' },
      },
    },
    {
      $project: {
        username: true,
        log: {
          $filter: {
            input: '$log',
            as: 'entry',
            cond: { $ne: ['$$entry.fake', 1] },
          },
        },
      },
    }
  )

  UserModel.aggregate(pipeline)
    .then((docs) => {
      if (docs.length == 0) {
        res.status(400).json({ error: 'unknown user id' })
      } else {
        const doc = docs[0]
        doc.log.forEach((e) => (e.date = getFormattedDate(e.date)))
        const resJson = {
          _id: doc._id,
          username: doc.username,
          count: doc.log.length,
          log: doc.log,
        }

        res.json(resJson)
      }
    })
    .catch((err) => {
      sendInternalError(res, err)
    })
})

module.exports = router
