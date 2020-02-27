const axios = require('axios')
const express = require('express')
const app = express()
const morgan = require('morgan')
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

function runServer () {
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
  
  app.get('/plain-text', function (req, res) {
    res.send('Hello World')
  })
   
  app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })
  
  app.listen(3007)
}

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  runServer()
  console.log(`Worker ${process.pid} started`);
}