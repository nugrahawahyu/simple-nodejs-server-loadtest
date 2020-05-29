const axios = require('axios')
const express = require('express')
const app = express()
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const client = axios.create({
  timeout: 10000
})

function runServer () {
  app.get('/', async function (req, res, next) {
    try {
      await client.get('http://api:3004')
      res.send('hello from server cluster')
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