const axios = require('axios')
const express = require('express')
const app = express()

const httpAdapter = require('./http-adapter');

const client = axios.create({
  timeout: 10000,
  adapter: httpAdapter
})

app.get('/', async function (req, res, next) {
  try {
    await client.get('http://api:3004')
    res.send('hello from server alternate')
  } catch (e) {
    next(e)
  }
})

app.get('/plain-text', function (req, res) {
  res.send('Hello World')
})

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(3008)
