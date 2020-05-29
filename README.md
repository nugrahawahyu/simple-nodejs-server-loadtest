# Setup
- npm install -g loadtest
- docker-compose -f docker-compose-builder.yml build
- docker stack deploy --compose-file docker-compose.yml simple-server-loadtest

# Clean Up
- docker stack down simple-server-loadtest

# Servers
- localhost:3005 (server-normal)
- localhost:3006 (server-alternate)

# Loadtest Example

```
loadtest --rps 400 -n 20000 http://localhost:3006
```

# Container Monitoring

http://localhost:8080/docker
