const UDP = require('dgram')
const express = require('express')
const ort = require('onnxruntime-node');
const { join } = require('path');
const fs = require('fs')
const Jimp = require('jimp')

const lable = ['person',
    'bicycle',
    'car',
    'motorcycle',
    'airplane',
    'bus',
    'train',
    'truck',
    'boat',
    'bird',
    'cat',
    'dog',
    'horse',
    'sheep',
    'cow',
    'handbag',
    'tie',
    'skis',
    'baseball bat',
    'skateboard',
    'surfboard',
    'cup',
    'knife',
    'bowl',
    'banana',
    'apple',
    'sandwich',
    'orange',
    'broccoli',
    'pizza',
    'donut',
    'cake',
    'chair',
    'couch',
    'potted plant',
    'bed',
    'dining table',
    'toilet',
    'tv',
    'laptop',
    'keyboard',
    'sink',
    'refrigerator',
    'book',
    'clock',
    'vase',
    'scissors',
    'teddy bear',]

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

async function loadImagefromPath(path, width = 640, height = 640) {
    // Use Jimp to load the image and resize it.
    var imageData = await Jimp.default.read(path).then((imageBuffer) => {
        return imageBuffer.resize(width, height);
    });

    return imageData;
}

function imageDataToTensor(image, dims) {
    var imageBufferData = image.bitmap.data;
    const [redArray, greenArray, blueArray] = [[], [], []]
    for (let i = 0; i < imageBufferData.length; i += 4) {
        redArray.push(imageBufferData[i]);
        greenArray.push(imageBufferData[i + 1]);
        blueArray.push(imageBufferData[i + 2]);
    }

    const transposedData = redArray.concat(greenArray).concat(blueArray);

    let i, l = transposedData.length;
    const float32Data = new Float32Array(dims[1] * dims[2] * dims[3]);
    for (i = 0; i < l; i++) {
        float32Data[i] = transposedData[i] / 255.0;
    }
    const inputTensor = new ort.Tensor("float32", float32Data, dims);
    return inputTensor;
}

async function getImageTensorFromPath(path, dims = [1, 3, 640, 640]) {
    var image = await loadImagefromPath(path, dims[2], dims[3]);
    var imageTensor = imageDataToTensor(image, dims);
    return imageTensor;
}

async function main() {
    const udpServer = UDP.createSocket('udp4')
    const PORT = process.env.PORT || 2222
    const app = express()

    udpServer.on('message', (message, info) => {
        console.log('received message')
        udpServer.send(message, 65002)
    })

    udpServer.on('listening', () => {
        console.log("Server is lestening on port " + PORT)
    })

    udpServer.bind(PORT)


    app.get('/PORT', (req, res) => {
        res.send(PORT)
    })

    app.get('/address', (req, res) => {
        res.send(udpServer.address())
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

    app.listen(PORT, () => {
        console.log("app listen on port: " + PORT)
    })

    try {
        const session = await ort.InferenceSession.create(join(process.cwd(), 'onnx_model', 'end2end.onnx'));
        const start = Date.now()
        const imgTensor = await getImageTensorFromPath('demo.jpg')

        const results = await session.run({
            'input': imgTensor
        })

        const temp = results[session.outputNames[0]]
        console.log(Date.now() - start)
        console.log(temp)

    } catch (error) {
        console.error(error)
    }
}

main()