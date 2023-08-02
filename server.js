const UDP = require('dgram')
const fs = require('fs')

const server = UDP.createSocket('udp4')

const port = process.env.PORT || 2222

server.on('message', (message, info) => {
    fs.writeFileSync('received.jpg', message)
})

server.bind(port)
