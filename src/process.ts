import { EventEmitter, once } from 'events'
import TypedEmitter from 'typed-emitter'
import fs from 'fs-extra'
import { dirname, resolve as resolvePath } from 'path'

interface ProcessEvents {
    start: () => void
    stop: () => void
    ended: (error?: Error | null) => void
    statusChange: (newStatus: ProcessStatus) => void
    error: (error: Error) => void
    warn: (message: string) => void
    info: (message: string) => void
}

export interface ProcessOptions {
    logPath?: string,
    name?: string
}

type ProcessStatus = 'NEW' | 'INITIALIZING' | 'PROCESSING' | 'FINALIZING' | 'ENDED'

export default abstract class Process extends EventEmitter implements TypedEmitter<ProcessEvents> {
    protected status: ProcessStatus = 'NEW'
    protected logPath: string | null = null
    protected name: string

    public constructor(opts: ProcessOptions) {
        super()

        this.name = opts.name || this.constructor.name

        if (opts.logPath) {
            this.logPath = this.changePathExtension(opts.logPath, 'log')
        }
    }

    public start(): void {
        this.start = () => {
            throw new Error('Has already been started')
        }

        this.emit('start')
        setImmediate(() => this.run())
    }

    public stop(): void {
        this.stop = () => {}

        this.emit('stop')
    }

    public getStatus(): ProcessStatus {
        return this.status
    }

    public getLogPath(): string | null {
        return this.logPath
    }

    public getName() {
        return this.name
    }

    protected pipeIWEEvents(childProcess: Process) {
        if (childProcess.getStatus() === 'ENDED') {
            return
        }

        ['info', 'warn', 'error'].forEach(level => {
            const bubble = (message: string | Error) => {
                // Should be cloned :'(
                if (message instanceof Error) {
                    message.message = `[${childProcess.getName()}] ` + message.message
                } else {
                    message = `[${childProcess.getName()}] ` + message
                }

                this.emit(level, message)
            }

            childProcess.on(level, bubble)
            childProcess.once('ended', () => childProcess.off(level, bubble))
        })

    }

    protected async run() {
        this.handleLogging()

        try {
            this.changeStatus('INITIALIZING')
            await this.initialize()

            this.changeStatus('PROCESSING')
            await this.process()

            this.changeStatus('FINALIZING')
            await this.finalize()

            this.changeStatus('ENDED')
            this.emit('ended')
        } catch (error) {
            this.changeStatus('ENDED')
            this.emit('error', error)
            this.emit('ended', error)
        }
    }

    protected async initialize(): Promise<void> {}
    protected abstract async process(): Promise<void>
    protected async finalize(): Promise<void> {}

    protected changeStatus(newStatus: ProcessStatus) {
        this.status = newStatus
        this.emit('statusChange', this.status)
    }

    protected handleLogging() {
        if (!this.logPath) {
            return
        }

        let logStream: fs.WriteStream

        ;['info', 'warn', 'error'].forEach(level => {
            const log = async (message: string | Error) => {
                if (!logStream) {
                    const logPath = this.logPath as string
                    await fs.ensureDir(this.changePathExtension(logPath, null) === logPath ? logPath : dirname(logPath))
                    logStream = fs.createWriteStream(logPath, {flags: 'a'})
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

                logStream.write(level + `:: [${this.name}] ` + (new Date).toISOString() + ' - ' + message + '\n')
            }
            this.on(level, log)
            this.once('ended', () => this.off(level, log))
        })
    }

    // todo out of the class in a helper
    protected changePathExtension(path: string, newExtension: string | null) {
      const pathWithoutExtension = path.replace(/\.[a-z0-4]{1,4}$/, '');

      return pathWithoutExtension + (newExtension ? '.' + newExtension : '');
    }
}
