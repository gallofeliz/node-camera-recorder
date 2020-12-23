# node-camera-recorder

Node Camera Recorder for noobs ; ONVIF Support

Node that it's a personal project, and if you need an improvement, you can open an issue but I am free to do it or not. You can fork the project to adapt it.

## features

Availables :
- recordStream : Record a video
- recordSnapshot : Record a picture (need a snapshot url but we can add a fallback to the stream)
- recordSnapshotsSerie : Record a serie of pictures (for example 1 picture each second)
- recordTimelaps : Record a timelaps (for example a video 5min with a framerate of 24 of pictures each minute)

## Examples of use

See bin/

```
#!/usr/bin/env ts-node

import { OnvifCamera, CameraRecorder } from '..';
import { once } from 'events'

(async() => {

  const recorder = new CameraRecorder({ new OnvifCamera('user:pass@ip:port') })

  console.log('RECORD !')

  const recordingProcess = recorder.recordStream({ profileToken: 'hd' })

  process.on('SIGINT', function() {
    console.log("Stopping record ...");
    recordingProcess.stop();
  });

  await once(recordingProcess, 'ended')

  console.log(recordingProcess.getRecordPath())

})();
```

You can see recorder options (duration, logs, paths, etc) in src/camera-recorder.ts
