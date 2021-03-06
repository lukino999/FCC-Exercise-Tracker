const mongoose = require('mongoose')
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [{ description: String, duration: Number, date: Date }],
})

module.exports = mongoose.model('User', UserSchema)
