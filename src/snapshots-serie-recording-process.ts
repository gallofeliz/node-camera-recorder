import { RecordingProcess, RecordingProcessOptions } from '.'
import { once } from 'events'
import { resolve as resolvePath } from 'path'
import { promisify } from 'util'
import * as stream from 'stream'
import got from 'got'
import { createWriteStream, remove } from 'fs-extra'

const pipeline = promisify(stream.pipeline);

interface SnapshotsSerieRecordingProcessOptions extends RecordingProcessOptions {
    snapshotsInterval?: number | null
    snapshotsFilenameResolver?: ((index: string) => string) | null
}

export default class SnapshotsSerieRecordingProcess extends RecordingProcess {
    protected snapshotsInterval: number | null
    protected snapshotsFilenameResolver: (index: string) => string
    protected currentIndex = 0

    public constructor(opts: SnapshotsSerieRecordingProcessOptions) {
        super(opts)

        this.snapshotsInterval = opts.snapshotsInterval !== Infinity && opts.snapshotsInterval || null
        this.snapshotsFilenameResolver = opts.snapshotsFilenameResolver || ((index) => index)
    }

    protected getRecordPathExtension() {
        return null
    }

    protected async recordInitialize() {}

    protected async record() {
        let currentSnapshot: Promise<void> | null = null
        let recording = true
        let interval

        if (!this.snapshotsInterval) {
            (async () => {
                while(recording) {
                    currentSnapshot = this.takeSnapshot()
                    await currentSnapshot
                    currentSnapshot = null
                }
            })()

        } else {
            interval = setInterval(async () => {
                if (currentSnapshot) {
                    this.emit('warn', 'Serie Snapshot skipped : previous not ended');
                }
                currentSnapshot = this.takeSnapshot()
                await currentSnapshot
                currentSnapshot = null
            }, this.snapshotsInterval * 1000)

        }

        await once(this, 'stop')
        recording = false
        if (interval) {
            clearInterval(interval)
        }
        if (currentSnapshot) {
            await currentSnapshot
        }
    }

    protected async takeSnapshot() {
        const filename = this.changePathExtension(
            this.snapshotsFilenameResolver(('00000' + this.currentIndex++).slice(-5)),
            'jpg'
        )

        const dest = resolvePath(this.recordPath, filename)

        try {
            await pipeline(
                got.stream(await this.getCameraSnapshotUri()),
                createWriteStream(dest)
            )
        } catch (e) {
            await remove(dest)
            this.emit('warn', 'Serie Snapshot failed : ' + e.toString())
        }
    }

    protected async recordFinalize() {}
}
