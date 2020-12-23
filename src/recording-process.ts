import { Camera } from '.'
import { EventEmitter, once } from 'events'
import TypedEmitter from 'typed-emitter'
import moment from 'moment'
import fs from 'fs-extra'
import { dirname, resolve as resolvePath } from 'path'
import retry from 'p-retry'
import delay from 'delay'

interface RecordingProcessEvents {
    // initialize: () => void
    // initialized: () => void
    // record: () => void
    // recorded: () => void
    // finalize: () => void
    // finalized: () => void
    start: () => void
    stop: () => void
    ended: (error?: Error | null) => void
    statusChange: (newStatus: RecordingProcessStatus) => void
    error: (error: Error) => void
    warn: (message: string) => void
    info: (message: string) => void
}

type RecordingProcessStatus = 'NEW' | 'INITIALIZING' | 'RECORDING' | 'FINALIZING' | 'ENDED'

export interface RecordingProcessOptions {
    camera: Camera
    profileToken?: string | null
    recordPath: string
    duration?: number | null
    keepWorkingDir?: boolean
    log?: boolean
}

// TODO use process.ts
export default abstract class RecordingProcess extends EventEmitter implements TypedEmitter<RecordingProcessEvents> {
    protected camera: Camera
    protected profileToken: string | null
    protected workingDir: string | null
    protected keepWorkingDir: boolean
    protected recordPath: string
    protected logPath: string | null = null
    protected recordingStartDate?: Date
    protected recordingEndDate?: Date
    protected status: RecordingProcessStatus = 'NEW'
    protected duration: number | null
    protected cacheSnapshotUri?: {uri: string}
    protected cacheStreamUri?: {uri: string}

    public constructor(opts: RecordingProcessOptions) {
        super()
        this.camera = opts.camera
        this.profileToken = opts.profileToken || null
        this.duration = opts.duration !== Infinity && opts.duration || null
        this.keepWorkingDir = opts.keepWorkingDir || false

        const recordPathExtension = this.getRecordPathExtension()
        this.recordPath = this.changePathExtension(opts.recordPath, recordPathExtension)
        this.workingDir = this.changePathExtension(this.recordPath, null)

        if (opts.log || opts.log === undefined) {
            this.logPath = recordPathExtension
                ? this.changePathExtension(this.recordPath, 'log')
                : resolvePath(this.recordPath, 'log.log')
        }
    }

    public start(): void {
        this.start = () => {
            throw new Error('Has already been started')
        }

        this.emit('start')
        this.run()
    }

    public stop(): void {
        this.stop = () => {}

        this.emit('stop')
    }

    public getStatus(): RecordingProcessStatus {
        return this.status
    }

    public getRecordingElapsedTime(): number {
        if (!this.recordingStartDate) {
            return 0;
        }

        if (this.recordingEndDate) {
          return moment(this.recordingEndDate).diff(this.recordingStartDate, 'seconds');
        }

        return moment().diff(this.recordingStartDate, 'seconds');
    }

    public getRecordingRemainingTime(): number {
        if (!this.recordingStartDate) {
            return Infinity;
        }

        if (this.recordingEndDate) {
          return 0;
        }

        if (!this.duration) {
          return Infinity;
        }

        const remaining = moment(this.recordingStartDate).add(this.duration, 'seconds').diff(new Date, 'seconds');

        return remaining > 0 ? remaining : 0;
    }

    public getRecordPath(): string {
        return this.recordPath
    }

    public getWorkingDir(): string | null {
        return this.workingDir
    }

    public getLogPath(): string | null {
        return this.logPath
    }

    protected async run() {
        let durationTimeout: any;

        this.handleLogging()

        try {
            this.status = 'INITIALIZING'
            this.emit('statusChange', this.status)
            await this.initialize()

            this.status = 'RECORDING'
            this.emit('statusChange', this.status)
            if (this.duration) {
                durationTimeout = setTimeout(() => this.stop(), this.duration * 1000)
            }
            this.recordingStartDate = new Date
            await this.record()
            this.recordingEndDate = new Date
            clearTimeout(durationTimeout)

            this.status = 'FINALIZING'
            this.emit('statusChange', this.status)
            await this.finalize()

            this.status = 'ENDED'
            this.emit('statusChange', this.status)
            this.emit('ended')
        } catch (error) {
            clearTimeout(durationTimeout)
            this.status = 'ENDED'
            this.emit('statusChange', this.status)
            this.emit('error', error)
            this.emit('ended', error)
        }
    }

    protected handleLogging() {
        if (!this.logPath) {
            return
        }

        let logStream: fs.WriteStream

        //const logFd: number = fs.openSync(this.logPath, 'a')
        ;['info', 'warn', 'error'].forEach(level => {
            const log = (message: string | Error) => {
                if (!logStream) {
                    logStream = fs.createWriteStream(this.logPath as string, {flags: 'a'})
                    logStream.once('error', (error) => {
                        this.emit('warn', 'Log error : ' + error.toString())
                    })
                    this.once('ended', () => {
                        logStream.end()
                        logStream.removeAllListeners('error')
                    })
                }

                if (message instanceof Error) {
                    message = message + ' (' + message.stack + ')'
                }

                logStream.write(level + '::' + (new Date).toISOString() + ' - ' + message + '\n')
            }
            this.on(level, log)
            this.once('ended', () => this.off(level, log))
        })
    }

    // todo handle expiration
    protected async getCameraSnapshotUri(): Promise<string> {
        if (!this.cacheSnapshotUri) {
            this.cacheSnapshotUri = await retry(() => this.camera.getSnapshotUri(this.profileToken), {
                retries: 2,
                onFailedAttempt: ({attemptNumber}) => delay([50, 250][attemptNumber - 1])
            })
        }

        return this.cacheSnapshotUri.uri
    }

    // todo handle expiration
    protected async getCameraStreamUri(): Promise<string> {
        if (!this.cacheStreamUri) {
            this.cacheStreamUri = await retry(() => this.camera.getStreamUri(this.profileToken), {
                retries: 2,
                onFailedAttempt: ({attemptNumber}) => delay([50, 250][attemptNumber - 1])
            })
        }

        return this.cacheStreamUri.uri
    }

    protected abstract getRecordPathExtension(): string | null

    protected async initialize(): Promise<void> {
        for (let path of [this.recordPath, this.logPath, this.workingDir]) {
            if (!path) {
                continue;
            }
            await fs.ensureDir(this.changePathExtension(path, null) === path ? path : dirname(path))
        }

        await this.recordInitialize()
    }

    protected abstract async recordInitialize(): Promise<void>
    protected abstract async record(): Promise<void>
    protected abstract async recordFinalize(): Promise<void>

    protected async finalize(): Promise<void> {
        await this.recordFinalize()

        if (this.workingDir && this.workingDir !== this.recordPath) {
            const workingDirEmpty = (await fs.readdir(this.workingDir)).length === 0
            if (workingDirEmpty || !this.keepWorkingDir) {
                await fs.remove(this.workingDir)
            }
        }
    }

    protected changePathExtension(path: string, newExtension: string | null) {
      const pathWithoutExtension = path.replace(/\.[a-z0-4]{1,4}$/, '');

      return pathWithoutExtension + (newExtension ? '.' + newExtension : '');
    }
}
