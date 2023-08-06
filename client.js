const fs = require('fs')
const { io } = require("socket.io-client");



async function main() {
    const buffer = fs.readFileSync('demo.jpg')
    const base64string = Buffer.from(buffer).toString('base64')
    const socket = io("http://localhost:3000")

    socket.on("result", (buffer) => {
        console.log(buffer)
    })
    socket.emit("predict", base64string)
}

main()