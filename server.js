const UDP = require('dgram')
const fs = require('fs')
const express = require('express')

const server = UDP.createSocket('udp4')

const port = process.env.PORT || 2222

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}


server.on('message', (message, info) => {
    console.log('received message')
    server.send(message, 65002)
})

server.on('listening', () => {
    console.log("Server is lestening on port " + port)
})

server.bind(port)
const app = express()


app.get('/PORT', (req, res) => {
    res.send(port)
})

app.get('/address', (req, res) => {
    res.send(server.address())
})




app.get('/results', (req, res) => {
    let x = getRandomInt(100)
    let y = getRandomInt(100)
    let width = 30
    let height = 30
    res.json({
        bbox: [{ x, y, width, height }]
    })
})

app.listen(port, () => {
    console.log("app listen on port: " + port)
})