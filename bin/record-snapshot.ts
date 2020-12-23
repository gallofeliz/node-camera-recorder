#!/usr/bin/env ts-node

import { OnvifCamera, CameraRecorder, SnapshotsToVideoConvertingProcess, changePathExtension } from '..'
import { once } from 'events'
import * as diskusage from 'diskusage'
import { stat, remove } from 'fs-extra'
import moment from 'moment'
import { CronJob } from 'cron'
import { dirname } from 'path'

if (!process.env.CAMERA_URI) {
  throw new Error('Expected env CAMERA_URI')
}

const dir = process.env.DATA_DIR || '/data'

const recordInterval = process.env.SNAPSHOT_INTERVAL ? parseInt(process.env.SNAPSHOT_INTERVAL, 10) : 30

const cleanThreshold = process.env.CLEAN_THREASHOLD ? parseFloat(process.env.CLEAN_THREASHOLD) : 0.25

const camera = new OnvifCamera(process.env.CAMERA_URI)
const recorder = new CameraRecorder({
    camera,
    recordPathTemplate: dir + '/{date}/{dateTime}',
    dateTimeFormat: moment.defaultFormat.replace('Z', '').replace(/:/g, '-') // Windows (Samba) sucks
})

let lastRecordedFilename: string;

async function doRecord() {
  console.log('RECORD !')
  try {
      try {
          // I have a STUPID wansview W5 and sometimes I get Http 500 calling snapshot uri
          const recordingProcess = recorder.recordSnapshot({ profileToken: process.env.PROFILE_TOKEN })
          await once(recordingProcess, 'ended')
          console.log(lastRecordedFilename = recordingProcess.getRecordPath())
      } catch (e) {
          if (!process.env.FALLBACK_PROFILE_TOKEN) {
              throw e;
          }
          const recordingProcess = recorder.recordSnapshot({ profileToken: process.env.FALLBACK_PROFILE_TOKEN })
          await once(recordingProcess, 'ended')
          console.log(lastRecordedFilename = recordingProcess.getRecordPath())
      }
  } catch (e) {
      console.error(e)
  }
}

interface DiskSpaceManagerOpts {
    minAge?: number
    maxAge?: number
    maxDiskUsage?: number
}

class DiskSpaceManager {
    public constructor(opts: DiskSpaceManagerOpts) {

    }
}

async function doClean() {
    const {available, total} = await diskusage.check(dir)
    const toFree = cleanThreshold * total - available

    console.log('toFree ' + (toFree / 1024 / 1024 / 1024) + ' G')

    if (toFree < 0) {
        console.log('Nothing to free')
        return
    }

    console.log('Need to free ' + toFree)

    require('glob')(dir + '/**', {nodir:true}, async (e: any, v: any) => {
        const pictures = v.sort()

        const toDelete = []
        let toDeleteTotalSize = 0

        for (let file of pictures) {
            const {size} = await stat(file)
            toDelete.push(file)
            toDeleteTotalSize += size

            if (toDeleteTotalSize >= toFree) {
                break
            }
        }

        toDelete.forEach(file => {
            remove(file)
        })

        console.log('Removing ' + toDelete.length + ' oldest files')

    })
}

setInterval(doRecord, 1000 * recordInterval)
setInterval(doClean, 1000 * 60 * 60 * 24)
doRecord()
doClean()

async function convertSnapshotsToVideo(snapshotsDir: string) {
  const tprocess = new SnapshotsToVideoConvertingProcess({
    snaphotsPath: snapshotsDir,
    videoPath: changePathExtension(snapshotsDir, 'mp4'),
    videoFramerate: 60
  })

  tprocess.start()

  await once(tprocess, 'ended')
}

// try {
//     new CronJob('0 0 18 * * *', () => {
//         convertSnapshotsToVideo(dirname(lastRecordedFilename))
//     }, null, true);

//     new CronJob('50 59 23 * * *', () => {
//         const snapshotsDir = dirname(lastRecordedFilename)
//         setTimeout(() => convertSnapshotsToVideo(snapshotsDir), 1000 * 70)
//     }, null, true);

// } catch (e) {
//     console.error(e)
// }
