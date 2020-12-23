export default interface Camera {
    getStreamUri: (profileToken?: string | null) => Promise<{uri: string/*, timeout: string*/}>
    getSnapshotUri: (profileToken?: string | null) => Promise<{uri: string/*, timeout: string*/}>
    getProfiles: () => Promise<Array<{$: {token: string}}>>
    getName: () => string
}
