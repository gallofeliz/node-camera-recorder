#!/usr/bin/env ts-node

import { OnvifCamera, CameraRecorder } from '..';
import { once } from 'events'

(async() => {

  if (!process.env.CAMERA_URI) {
      throw new Error('Expected env CAMERA_URI')
  }

  const camera = new OnvifCamera(process.env.CAMERA_URI)

  const recorder = new CameraRecorder({ camera })

  console.log('RECORD !')

  const recordingProcess = recorder.recordTimelaps({ profileToken: process.env.PROFILE_TOKEN })

  process.on('SIGINT', function() {
    console.log("Stopping record ...");
    recordingProcess.stop();
  });

  await once(recordingProcess, 'ended')

  console.log(recordingProcess.getRecordPath())

})();