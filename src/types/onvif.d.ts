declare module 'onvif'
import { EventEmitter } from 'events'

export interface CamOpts { hostname: string, port?: number, username: string, password: string }

export class Cam extends EventEmitter {
    constructor(opts: CamOpts, callback: (err: Error | null) => void)
    getStreamUri(opts: {profileToken?: string | null}, callback: (err: Error | null, data?: {uri: string}) => void): void
    getSnapshotUri(opts: {profileToken?: string | null}, callback: (err: Error | null, data?: {uri: string}) => void): void
    profiles: Array<{$: {token: string}}>
}