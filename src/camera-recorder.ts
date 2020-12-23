import {
    Camera,
    RecordingProcess,
    SnapshotRecordingProcess,
    SnapshotsSerieRecordingProcess,
    TimelapsRecordingProcess,
    StreamRecordingProcess
} from '.'
import moment from 'moment'
import { template, templateSettings } from 'lodash'
templateSettings.interpolate = /{([\s\S]+?)}/g;

interface RecorderSnapshotOptions {
    camera?: Camera
    profileToken?: string | null
    recordPath?: string
    builtinLog?: boolean
}

interface RecorderSnapshotsSerieOptions {
    camera?: Camera
    profileToken?: string | null
    recordPath?: string
    duration?: number | null
    snapshotsInterval?: number | null
    snapshotFilenameTemplate?: string
    builtinLog?: boolean
}

interface RecorderStreamOptions {
    camera?: Camera
    profileToken?: string | null
    recordPath?: string
    duration?: number | null
    keepWorkingDir?: boolean
    builtinLog?: boolean
}

interface RecorderTimelapsOptions {
    camera?: Camera
    profileToken?: string | null
    recordPath?: string
    duration?: number | null
    snapshotsInterval?: number | null
    videoFramerate?: number
    keepWorkingDir?: boolean
    builtinLog?: boolean
}

interface RecorderOptions {
    camera?: Camera
    profileToken?: string | null
    recordPathTemplate?: string
    serieSnapshotFilenameTemplate?: string
    dateFormat?: string
    timeFormat?: string
    dateTimeFormat?: string
    builtinLog?: boolean
    keepWorkingDir?: boolean
}

export default class CameraRecorder {
    protected recorderOptions: RecorderOptions

    public constructor(opts: RecorderOptions = {}) {
        this.recorderOptions = {
            recordPathTemplate: 'cam/{cameraName}/{dateTime}',
            serieSnapshotFilenameTemplate: '{time} - {snapshotIndex}',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: 'HH:mm:ss',
            dateTimeFormat: moment.defaultFormat.replace('Z', ''),
            ...opts
        }
    }

    public recordSnapshot(opts: RecorderSnapshotOptions = {}): RecordingProcess {
        const recorderOptions = {...this.recorderOptions, ...opts}

        if (!recorderOptions.camera) {
            throw new Error('Expected camera')
        }

        return this.returnAutostartProcess(new SnapshotRecordingProcess({
            camera: recorderOptions.camera,
            recordPath: recorderOptions.recordPath || this.resolveRecordPath(recorderOptions),
            profileToken: recorderOptions.profileToken,
            log: recorderOptions.builtinLog
        }))
    }

    public recordSnapshotsSerie(opts: RecorderSnapshotsSerieOptions): RecordingProcess {
        const recorderOptions = {...this.recorderOptions, ...opts}

        if (!recorderOptions.camera) {
            throw new Error('Expected camera')
        }

        return this.returnAutostartProcess(new SnapshotsSerieRecordingProcess({
            camera: recorderOptions.camera,
            recordPath: recorderOptions.recordPath || this.resolveRecordPath(recorderOptions),
            profileToken: recorderOptions.profileToken,
            log: recorderOptions.builtinLog,
            duration: recorderOptions.duration,
            snapshotsInterval: recorderOptions.snapshotsInterval,
            snapshotsFilenameResolver: (index: string) => this.resolveSerieSnapshotFilename(index, recorderOptions)
        }))
    }

    public recordTimelaps(opts: RecorderTimelapsOptions): RecordingProcess {
        const recorderOptions = {...this.recorderOptions, ...opts}

        if (!recorderOptions.camera) {
            throw new Error('Expected camera')
        }

        return this.returnAutostartProcess(new TimelapsRecordingProcess({
            camera: recorderOptions.camera,
            recordPath: recorderOptions.recordPath || this.resolveRecordPath(recorderOptions),
            profileToken: recorderOptions.profileToken,
            log: recorderOptions.builtinLog,
            duration: recorderOptions.duration,
            snapshotsInterval: recorderOptions.snapshotsInterval,
            videoFramerate: recorderOptions.videoFramerate,
            keepWorkingDir: recorderOptions.keepWorkingDir
        }))
    }

    public recordStream(opts: RecorderStreamOptions): RecordingProcess {
        const recorderOptions = {...this.recorderOptions, ...opts}

        if (!recorderOptions.camera) {
            throw new Error('Expected camera')
        }

        return this.returnAutostartProcess(new StreamRecordingProcess({
            camera: recorderOptions.camera,
            recordPath: recorderOptions.recordPath || this.resolveRecordPath(recorderOptions),
            profileToken: recorderOptions.profileToken,
            log: recorderOptions.builtinLog,
            duration: recorderOptions.duration,
            keepWorkingDir: recorderOptions.keepWorkingDir
        }))
    }

    protected returnAutostartProcess<T extends RecordingProcess>(process: T): T {
        setImmediate(() => process.start())

        return process
    }

    protected resolveSerieSnapshotFilename(index: string, recorderOptions: RecorderSnapshotsSerieOptions & RecorderOptions): string {
        const filenameTemplate = recorderOptions.snapshotFilenameTemplate || recorderOptions.serieSnapshotFilenameTemplate
        const now = moment();

        return template(filenameTemplate)({
          snapshotIndex: index,
          date: now.format(recorderOptions.dateFormat),
          time: now.format(recorderOptions.timeFormat),
          dateTime: now.format(recorderOptions.dateTimeFormat)
        }).toString()
    }

    protected resolveRecordPath(recorderOptions: RecorderOptions): string {
        const now = moment();

        if (!recorderOptions.camera) {
            throw new Error('Expected camera')
        }

        return template(recorderOptions.recordPathTemplate)({
          cameraName: recorderOptions.camera.getName(),
          profileToken: recorderOptions.profileToken,
          date: now.format(recorderOptions.dateFormat),
          time: now.format(recorderOptions.timeFormat),
          dateTime: now.format(recorderOptions.dateTimeFormat)
        }).toString();
    }
}
