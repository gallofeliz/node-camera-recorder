#!/usr/bin/env ts-node

import { OnvifCamera, CameraRecorder, RecordingProcess, Camera } from '..';
import { once } from 'events'
import got from 'got'
import { basename } from 'path'

interface RecorderInfinitelyStreamOptions {
    camera?: Camera
    profileToken?: string | null
    recordPath?: string
    partDuration: string | number
    partFilenameTemplate: string
    rotationCount: number
    rotationSize: number | string
    rotationDuration: number | string | null
    builtinLog?: boolean
}

interface RecorderInfinitelySnapshotsOptions {
    camera?: Camera
    profileToken?: string | null
    recordPath?: string
    snapshotsInterval: number
    snapshotFilenameTemplate: string
    rotationCount: number
    rotationSize: number | string
    rotationDuration: number | string | null
    builtinLog?: boolean
}

function recordInfinitelyStream(opts: RecorderInfinitelyStreamOptions): RecordingProcess {
    throw new Error('Not implemented')
}

function recordInfinitelySnapshots(opts: RecorderInfinitelySnapshotsOptions): RecordingProcess {
    throw new Error('Not implemented')
}

function recordOnMotion() {
    throw new Error('Not implemented')
}

// https://github.com/rsmbl/Resemble.js
// https://github.com/mapbox/pixelmatch

// MotionWatchingProcess ahah
class MotionWatcher {
    // start / stop
    // camera/profileToken sensibility=>value for calcul and threshold for trigger; snapshotInterval, mask
    // confirm nb => for ex take other snapshot to confirm the motion
    // emit('analyze', img1, img2, diff)
    // emit('motionDetected', lastImage, diffImage)
}
/*
Handler :

trigger (motion, calendar) => action (record, notify)
*/
class MotionRecorder {
    // motion nothing nothing motion motion noting ... <- How many time to wait a next motin to considerate the action stops
    // trigger a record as callback and stop it x seconds after the action stops
}

const Jimp = require('jimp');
const dateBanner = new Jimp(470, 45);

(async () => {

    const imagesFolder = 'cam/192.168.1.50/2020-07-02';

    const images: string[] = require('fs').readdirSync(imagesFolder).filter((image: string) => !image.includes('log')).map((image: string) => imagesFolder + '/' + image);

    const pLimit = require('p-limit');

    const limit = pLimit(10);

    for (let i in images) {
        if (i === '0') {
            continue;
        }

        limit(async () => {
            const image = images[i]
            const previousImage = images[parseInt(i)-1]

            console.log(image)
            const img1 = await Jimp.read(previousImage)
            const img2 = await Jimp.read(image)

            img1.mask(dateBanner, img1.bitmap.width - 10 - 470, 12)
            img2.mask(dateBanner, img2.bitmap.width - 10 - 470, 12)

            const diff = Jimp.diff(img1, img2, 0.3)
            const diffPct = diff.percent * 100
            const doCapture = diffPct >= 1

            if (doCapture) {
                img2.writeAsync('/tmp/study/' + basename(image))
            }

        })
    }


    return;
    if (!process.env.CAMERA_URI) {
      throw new Error('Expected env CAMERA_URI')
    }
    const camera = new OnvifCamera(process.env.CAMERA_URI as string)
    const recorder = new CameraRecorder({ camera, recordPathTemplate: '/tmp/study/aaaa_{time}' })

    console.log('GET URI')
    const snapshotUri = (await camera.getSnapshotUri('token2')).uri

    let img1 = await Jimp.read(await got(snapshotUri).buffer())
    let cleanImg1 = img1.clone().mask(dateBanner, img1.bitmap.width - 10 - 470, 12)

    setInterval(compare, 2000)

    let i = 0;
    async function compare() {
        i++
        console.log('>>>>>> START ' + i)

        const startAt = new Date;
        const img2 = await Jimp.read(await got(snapshotUri).buffer())

        const cleanImg2 = img2.clone().mask(dateBanner, img2.bitmap.width - 10 - 470, 12)

        const diff = Jimp.diff(cleanImg1, cleanImg2, 0.3)

        const diffPct = diff.percent * 100

        const doCapture = diffPct >= 0.25

        console.log('diff', diffPct, '%')

        diff.image.writeAsync('/tmp/study/diff_' + ('000' + i).substr(-4) + '_' + (doCapture ? 'CAPTURE_' : '') + diffPct.toFixed(2) + '.jpg')

        img1 = img2
        cleanImg1 = cleanImg2
        const endAt = new Date;
        console.log('END', (endAt.getTime() - startAt.getTime()) / 1000)

        if (doCapture) {
            recorder.recordSnapshot({ profileToken: 'token1' })
        }

    }


})()
