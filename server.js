const UDP = require('dgram')
const fs = require('fs')

const server = UDP.createSocket('udp4')

const port = process.env.PORT || 2222

server.on('message', (message, info) => {
    fs.writeFileSync('received.jpg', message)
})

server.on('listening', () => {
    console.log("Server is lestening on port " + port)
})

server.bind(port)
