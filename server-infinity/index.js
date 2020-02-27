const axios = require('axios')
const express = require('express')
const app = express()
const morgan = require('morgan')

const Agent = require('agentkeepalive');
const keepAliveAgent = new Agent({
  maxSockets: Infinity,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
});

const axiosInstance = axios.create({httpAgent: keepAliveAgent});

app.use(morgan('combined'))

app.get('/', function (req, res) {
  axiosInstance.get('http://api:3004')
    .catch((e) => {
      res.status(500).send('error')
    })
    .then((data) => {
      res.send('Hello World')
    })
})
 
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(3006)
