import { Camera } from '.'

interface GenericCameraOpts {
    name?: string
    defaultProfileToken?: string
    profileTokens: {
        [profileToken: string]: {
            streamUri?: string
            snapshotUri?: string
        }
    }
}

export default class GenericCamera implements Camera {
    protected name: string
    protected defaultProfileToken: string
    protected profileTokens: GenericCameraOpts['profileTokens']

    public constructor(opts: GenericCameraOpts) {
        if (Object.keys(opts.profileTokens).length === 0) {
            throw new Error('Expected profileTokens')
        }

        this.name = opts.name || 'noname'
        this.defaultProfileToken = opts.defaultProfileToken || Object.keys(opts.profileTokens)[0]
        this.profileTokens = opts.profileTokens
    }

    public async getStreamUri(profileToken?: string | null): Promise<{uri: string}> {
        profileToken = profileToken || this.defaultProfileToken

        const uri = this.profileTokens[profileToken].streamUri

        if (!uri) {
            throw new Error('Camera not able to stream')
        }

        return {uri}
    }

    public async getSnapshotUri(profileToken?: string | null): Promise<{uri: string}> {
        profileToken = profileToken || this.defaultProfileToken

        const uri = this.profileTokens[profileToken].snapshotUri

        if (!uri) {
            throw new Error('Camera not able to snapshot')
        }

        return {uri}
    }

    public async getProfiles(): Promise<Array<{$: {token: string}}>> {
        return Object.keys(this.profileTokens).map(token => ({$: {token}}))
    }

    public getName(): string {
        return this.name
    }
}
