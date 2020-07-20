require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

/*
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} : ${req.originalUrl}`)
  const b = req.body
  if (b) {
    Object.keys(b).forEach((k) => console.log(k, ':', b[k], '-', typeof k))
  }
  console.log('\n')
  next()
})
*/

app.use(require('./routes/new-user'))
app.use(require('./routes/users'))
app.use(require('./routes/add'))
app.use(require('./routes/log'))

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'))
})

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt').send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
