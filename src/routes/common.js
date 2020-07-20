module.exports.sendInternalError = (res, err) => {
  console.log(' - - - - - - - send internal error - - - - - - ')
  console.log(err)
  console.log(' - - - - - - end of internal error - - - - - - ')
  res.status(500).send({ error: 'internal error' })
}

module.exports.getFormattedDate = (d) => {
  const date = new Date(d)
  const month = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][date.getMonth()]
  const dayString = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    date.getDay()
  ]
  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
  return `${dayString} ${month} ${day} ${date.getFullYear()}`
}
