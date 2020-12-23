import { EventEmitter, once } from 'events'
import { spawn, ChildProcess } from 'child_process'
const ffmpegPath = require('ffmpeg-static')

export interface VideoProcessor {
    execFfmpeg(args: string[]): void
    spawnFfmpeg(args: string[]): ChildProcess
}

export function videoProcessing<T extends { new(...args: any[]): Required<EventEmitter> }>(constructor: T) {
    return class extends constructor implements VideoProcessor {
        execFfmpeg = async (args: string[]) => {
            const ffmpeg = spawn(ffmpegPath, args, { detached: false })
            let lastSTDERR = '';

            ffmpeg.stdout.on('data', (data) => {
                this.emit('info', '[FFMPEG STDOUT] ' + data)
            })

            ffmpeg.stderr.on('data', (data) => {
                this.emit('info', '[FFMPEG STDERR] ' + data)
                lastSTDERR = data
            })

            const [exitCode] = await once(ffmpeg, 'exit');

            if (exitCode) {
              throw new Error('FFmpeg exits with code ' + exitCode + ' and lastSTDERR  ' + lastSTDERR);
            }
        }
        spawnFfmpeg = (args: string[]): ChildProcess => {
            const ffmpeg = spawn(ffmpegPath, args, { detached: true })

            ffmpeg.stdout.on('data', (data) => {
                this.emit('info', '[FFMPEG STDOUT] ' + data)
            })

            ffmpeg.stderr.on('data', (data) => {
                this.emit('info', '[FFMPEG STDERR] ' + data)
            })

            return ffmpeg
        }
    }
}