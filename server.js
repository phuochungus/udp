const UDP = require('dgram')
const fs = require('fs')
const express = require('express')

const server = UDP.createSocket('udp4')

const port = process.env.PORT || 2222

server.on('message', (message, info) => {
    server.send(message)
})

server.on('listening', () => {
    console.log("Server is lestening on port " + port)
})

server.bind(port)
const app = express()


app.get('/PORT', (req, res) => {
    res.send(port)
})

app.listen(port, () => {
    console.log("app listen on port: " + port)
})