const UDP = require('dgram')
const express = require('express')
const ort = require('onnxruntime-node');
const { join } = require('path');
const Jimp = require('jimp')
const multer = require('multer')
const fs = require('fs')
const { Server } = require("socket.io");
const sharp = require('sharp')
const { createServer } = require("http");
const bodyParser = require('body-parser')

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

async function loadImagefromPathOrBuffer(pathOrBuffer, width = 640, height = 640) {
    var imageData = await Jimp.read(pathOrBuffer)
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

async function tensorFromRGB(redArray, greenArray, blueArray, height, width) {
    if (!(redArray.length == greenArray.length && redArray.length == blueArray.length)) throw new Error(" 3 array not the same lengh")
    const INPUT_HEIGHT = 640
    const INPUT_WIDTH = 640
    const buffer = Buffer.alloc(3 * redArray.length)
    for (let i = 0; i < redArray.length; i = i + 3) {
        buffer[i] = redArray[i]
        buffer[i + 1] = greenArray[i]
        buffer[i + 2] = blueArray[i]
    }

    const newBuffer = await sharp(buffer, {
        raw: {
            channels: 3,
            height,
            width
        }
    })
        .resize(INPUT_WIDTH, INPUT_HEIGHT)
        .toBuffer()


    const float32Array = new Float32Array(newBuffer)
    const tensor = new ort.Tensor("float32", float32Array, [1, 3, 640, 640])
    return tensor
}


async function getImageTensorFromPathOrBuffer(path, dims = [1, 3, 640, 640]) {
    var image = await loadImagefromPathOrBuffer(path, dims[2], dims[3]);
    var imageTensor = imageDataToTensor(image, dims);
    return imageTensor;
}

function parsePredictResult(rawResult, threshHold = 30) {
    const THRESHOLD = BigInt(threshHold)
    let outputResult = []
    let rawOutputArray = []
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
            Object.values(outputResult[outputResult.length - 1]).forEach(val => rawOutputArray.push(val))
            rawOutputArray[rawOutputArray.length - 2] = Number(rawResult.labels.data[index / 5])
        }
    }
    return { outputResult, rawOutputArray }
}

async function getTensorFromBase64String(base64string) {
    const buffer = Buffer.from(base64string, 'base64')
    const INPUT_HEIGHT = 640
    const INPUT_WIDTH = 640

    const data = await sharp(buffer).resize(INPUT_WIDTH, INPUT_HEIGHT, { fit: 'fill' }).raw({ depth: 'char' }).toBuffer()
    const tensor = new ort.Tensor('float32', new Float32Array(data), [1, 3, 640, 640])
    return tensor
}

async function main() {
    const PORT = process.env.PORT || 3000
    const app = express()
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    const httpServer = createServer(app);
    const io = new Server(httpServer);

    const session = await ort.InferenceSession.create(join(process.cwd(), 'onnx_model', 'end2end.onnx'));

    httpServer.listen(PORT, () => {
        console.log("HTTP Server and Socket waiting on PORT: " + PORT)
    })

    io.on("connection", socket => {
        socket.send("connection established")
        socket.on('disconnect', (reason) => {
            socket.send('disconnected')
        })
        socket.on('predict', async (base64string) => {
            const buffer = Buffer.from(base64string, 'base64')
            const tensor = await getImageTensorFromPathOrBuffer(buffer)
            const result = await session.run({
                'input': tensor
            })
            const predicResult = parsePredictResult(result)
            console.log('ok')
            socket.emit("result", predicResult.rawOutputArray)
        })
    })

    app.use(express.json({ limit: '5MB' }))

    app.get('/PORT', (req, res) => {
        res.send(EXPRESS_PORT)
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

    app.use('/uploads', express.static('upload_page'))

    app.post('/upload', upload.single('image'), async (req, res) => {
        try {
            const imgTensor = await getImageTensorFromPathOrBuffer(req.file.path)
            const threshHold = req.query.threshold || 30
            fs.unlink(join(process.cwd(), req.file.path), (err) => {
                if (err)
                    console.error(err)

            })
            const results = await session.run({
                'input': imgTensor
            })
            res.json({ bbox: parsePredictResult(results, threshHold).outputResult })
        } catch (error) {
            console.error(error)
        }
    })

    app.post('/uploadRGB', async (req, res) => {
        try {
            const tensor = await tensorFromRGB(req.body.r, req.body.g, req.body.b, req.body.height, req.body.width)
            const results = await session.run({
                'input': tensor
            })
            res.json({ bbox: parsePredictResult(results).outputResult })
        } catch (error) {
            console.error(error)
            res.status(500).json({
                error
            })
            throw error
        }
    }
    )

}

main()