const UDP = require('dgram')
const express = require('express')
const ort = require('onnxruntime-node');
const { join } = require('path');
const Jimp = require('jimp')
const multer = require('multer')
const fs = require('fs')

const upload = multer({
    dest: './temp_imgs'
})

const labels = ['person',
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
    var imageData = await Jimp.read(path)
    return imageData.resize(width, height)
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

function parsePredictResult(rawResult) {
    const THRESHOLD = BigInt(30)
    let outputResult = []
    for (let index = 0; index < 300; index = index + 5) {
        let accuracy = rawResult.dets.data[index + 4] * 100
        if (accuracy >= THRESHOLD) {
            outputResult.push(
                {
                    x: rawResult.dets.data[index],
                    y: rawResult.dets.data[index + 1],
                    height: rawResult.dets.data[index + 2],
                    width: rawResult.dets.data[index + 3],
                    lable: labels[rawResult.labels.data[index / 5]],
                    accuracy: accuracy
                }
            )
        }
    }
    return outputResult
}

async function main() {
    const udpServer = UDP.createSocket('udp4')
    const PORT = process.env.PORT || 3000
    const app = express()

    const session = await ort.InferenceSession.create(join(process.cwd(), 'onnx_model', 'end2end.onnx'));

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

    app.use('/uploads', express.static('upload_page'))

    app.post('/upload', upload.single('image'), async (req, res) => {
        try {
            const imgTensor = await getImageTensorFromPath(req.file.path)

            fs.unlink(join(process.cwd(), req.file.path), (err) => {
                if (err)
                    console.error(err)

            })
            const results = await session.run({
                'input': imgTensor
            })
            res.json({ bbox: parsePredictResult(results) })
        } catch (error) {
            console.error(error)
        }
    })

}

main()