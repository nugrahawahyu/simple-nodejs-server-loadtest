const axios = require('axios')
const express = require('express')
const app = express()

app.get('/', function (req, res) {
  setTimeout(() => {
    res.send('haha')
  }, 500);
})
 
app.listen(3004)
