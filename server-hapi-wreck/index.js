const express = require('express')
const app = express()
const Wreck = require('@hapi/wreck');

app.get('/', async function (req, res, next) {
  try {
    await Wreck.get('http://api:3004');
    res.send('hello from server hapi-wreck')
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

app.listen(3010)
