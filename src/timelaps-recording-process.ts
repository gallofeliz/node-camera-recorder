import { RecordingProcess, RecordingProcessOptions, SnapshotsSerieRecordingProcess } from '.'
import { once } from 'events'
import { VideoProcessor, videoProcessing } from './video-processing'

interface TimelapsRecordingProcessOptions extends RecordingProcessOptions {
    snapshotsInterval?: number | null
    videoFramerate?: number
}

@videoProcessing
export default class TimelapsRecordingProcess extends RecordingProcess {
    protected snapshotsInterval: number | null
    protected videoFramerate: number

    public constructor(opts: TimelapsRecordingProcessOptions) {
        super(opts)

        this.snapshotsInterval = opts.snapshotsInterval !== Infinity && opts.snapshotsInterval || null
        this.videoFramerate = opts.videoFramerate || 10
    }

    protected getRecordPathExtension() {
        return 'mp4'
    }

    protected async recordInitialize() {}

    protected async record() {
        const snapshotRecordingProcess = new SnapshotsSerieRecordingProcess({
            camera: this.camera,
            profileToken: this.profileToken,
            recordPath: this.workingDir as string,
            snapshotsInterval: this.snapshotsInterval,
            snapshotsFilenameResolver: (index) => index,
            log: false
        })

        if (this.logPath) {
            let infoListener: (message: string) => void
            let warnListener: (message: string) => void

            snapshotRecordingProcess.on('info', infoListener = (message) => this.emit('info', message))
            snapshotRecordingProcess.on('warn', warnListener = (message) => this.emit('warn', message))

            snapshotRecordingProcess.once('ended', () => {
                snapshotRecordingProcess.off('info', infoListener)
                snapshotRecordingProcess.off('warn', warnListener)
            })
        }

        this.once('stop', () => snapshotRecordingProcess.stop())

        setImmediate(() => snapshotRecordingProcess.start())

        await once(snapshotRecordingProcess, 'ended')
    }

    protected async recordFinalize() {
        await (this as any as VideoProcessor).execFfmpeg([
            '-framerate',
            this.videoFramerate.toString(),
            '-i',
            this.workingDir + '/%05d.jpg',
            this.recordPath
        ])
    }
}
