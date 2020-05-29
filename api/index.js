const axios = require('axios')
const express = require('express')
const app = express()

app.get('/', function (req, res) {
  setTimeout(() => {
    res.send('haha')
  }, 9000);
})

app.use((err, req, res) => {
  console.error(err.stack)
  res.send('hahah')
})

app.listen(3004)
