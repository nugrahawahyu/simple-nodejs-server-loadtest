const axios = require('axios')
const express = require('express')
const app = express()
const morgan = require('morgan')

app.use(morgan('combined'))

app.get('/', function (req, res) {
  axios.get('http://api:3004')
    .catch((e) => {
      res.status(500).send('error')
    })
    .then((data) => {
      res.send('Hello World')
    })
})

// app.get('/', async function (req, res) {
//   try {
//     await axios.get('http://api:3004')
//     res.send('Hello World')
//   } catch (e) {
//     res.status(500).send('error')
//   }
// })
 
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(3005)
