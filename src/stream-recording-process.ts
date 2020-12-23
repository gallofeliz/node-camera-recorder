import { RecordingProcess } from '.'
import { execSync, ChildProcess } from 'child_process'
import { resolve as resolvePath } from 'path'
import { once } from 'events'
import { VideoProcessor, videoProcessing } from './video-processing'
import delay from 'delay'

@videoProcessing
export default class StreamRecordingProcess extends RecordingProcess {
    protected antiFloodDuration = 5

    protected getRecordPathExtension() {
        return 'mp4'
    }

    protected async recordInitialize() {}

    // I issued a elec stop and it was a flood of "network unreachable"
    // Add anti flood system
    protected async record() {
        let ffmpegRecordProcess: ChildProcess | null = null;
        let recordRunning = true;
        let partIndex = 0;

        (async() => {
            while(recordRunning) {
                const partPath = resolvePath(this.workingDir as string, ('00000' + partIndex++).slice(-5) + '.mp4')
                ffmpegRecordProcess = (this as any as VideoProcessor).spawnFfmpeg(
                    ['-i', await this.getCameraStreamUri(), '-acodec', 'copy', '-vcodec', 'copy', partPath]
                );
                const ffmpegRecordProcessStartAt = new Date;
                const [exitCode] = await once(ffmpegRecordProcess, 'exit');
                ffmpegRecordProcess = null
                const ffmpegRecordProcessStopAt = new Date;

                if (exitCode) {
                    this.emit('warn', 'FFMPEG exits with code > 0')
                }

                const ffmpegRecordDuration = (ffmpegRecordProcessStopAt.getTime() - ffmpegRecordProcessStartAt.getTime()) / 1000;
                if (ffmpegRecordDuration < this.antiFloodDuration) {
                    await delay((this.antiFloodDuration - ffmpegRecordDuration) * 1000)
                }
            }
        })()

        await once(this, 'stop')
        recordRunning = false
        if (ffmpegRecordProcess) {
            (ffmpegRecordProcess as ChildProcess).kill()

            await once(ffmpegRecordProcess, 'exit');
        }
    }

    /*
      We can have "empty" files, we cannot read them with the OS viewer,
      But ffmpeg is not impacted during the concat operation.

      Example of logs for these files :

      DEBUG:: 2020-06-11T16:31:11.069Z [FFMPEG STDERR] size=       0kB time=00:00:00.00 bitrate=N/A
      video:0kB audio:0kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: unknown
      Output file is empty, nothing was encoded (check -ss / -t / -frames parameters if used)
       {}
      DEBUG:: 2020-06-11T16:31:11.069Z [FFMPEG EXIT] {}
    */
    protected async recordFinalize() {
        execSync(
          'for f in ./*.mp4; do echo "file \'$f\'" >> parts.txt; done',
          {cwd: this.workingDir as string, stdio: 'ignore'}
        );

        await (this as any as VideoProcessor).execFfmpeg(
            ['-f', 'concat', '-safe', '0', '-i', resolvePath(this.workingDir as string, 'parts.txt'), '-c', 'copy', this.recordPath]
        )
    }


}
