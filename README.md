# Setup
- npm install -g loadtest
- docker-compose up --build

# Servers
- localhost:3005 (server-normal)
- localhost:3006 (server-infinity)

# Loadtest Example

```
loadtest --rps 400 -n 20000 http://localhost:3006
```

# Container Monitoring

http://localhost:8080/docker
