import { RecordingProcess, RecordingProcessOptions } from '.'
import { promisify } from 'util'
import * as stream from 'stream'
import got from 'got'
import { createWriteStream, remove } from 'fs-extra'

const pipeline = promisify(stream.pipeline);

export default class SnapshotRecordingProcess extends RecordingProcess {
    constructor(opts: RecordingProcessOptions) {
        super(opts)
        // I am not fan of that but it's not overkill
        this.workingDir = null
    }

    protected getRecordPathExtension() {
        return 'jpg'
    }

    protected async recordInitialize() {}

    protected async record() {
        try {
            await pipeline(
                got.stream(await this.getCameraSnapshotUri()),
                createWriteStream(this.recordPath)
            )
        } catch(e) {
            await remove(this.recordPath)
            throw e
        }
    }

    protected async recordFinalize() {}
}
