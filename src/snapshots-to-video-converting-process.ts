import { Process, ProcessOptions, changePathExtension } from '.'
import { VideoProcessor, videoProcessing } from './video-processing'
import glob from 'glob'
import { promisify } from 'util'
import { sortBy } from 'lodash'
import { writeFile, ensureDir } from 'fs-extra'
import { tmpdir } from 'os'
import { resolve as resolvePath } from 'path'

const pglob = promisify(glob)

export interface SnapshotsToVideoConvertingProcessOptions {
    snaphotsPath: string
    videoPath: string
    videoFramerate?: number
    log?: boolean
}

@videoProcessing
export default class SnapshotsToVideoConvertingProcess extends Process {
    protected snaphotsPath: string
    protected videoPath: string
    protected videoFramerate: number

    constructor(opts: SnapshotsToVideoConvertingProcessOptions) {
        super({
            logPath: opts.log !== false ? changePathExtension(opts.videoPath, 'log') : undefined
        })

        this.snaphotsPath = opts.snaphotsPath
        this.videoPath = changePathExtension(opts.videoPath, 'mp4')
        this.videoFramerate = opts.videoFramerate || 10
    }

    protected async process() {
        const snapshotsFiles = sortBy(await pglob('*.jpg', { cwd: this.snaphotsPath, absolute: true }))
        const ffmpegFileContent = snapshotsFiles.map(file => `file '${file}'`).join('\n')
        const partsFilename = resolvePath(tmpdir(), Math.random().toString(36).substring(2, 15) + '.txt')
        await writeFile(partsFilename, ffmpegFileContent)

        await (this as any as VideoProcessor).execFfmpeg([
            '-f', 'concat',
            '-safe', '0',
            '-r', this.videoFramerate.toString(),
            '-i', partsFilename,
            '-threads', '1', // Test for my Raspb
            this.videoPath
        ])
    }
}
