import { Camera } from '.'
import { EventEmitter } from 'events'
import * as url from 'url'
import { Cam as OnvifModuleCamera, CamOpts as OnvifModuleCameraOptions } from 'onvif'

type OnvifCameraUriOptions = { uri: string, name?: string }
type OnvifCameraOptsForOnvifModule = { name?: string } & OnvifModuleCameraOptions
type OnvifCameraOptions = OnvifCameraOptsForOnvifModule | OnvifCameraUriOptions

const isOnvifCameraUriOptions = (opts: OnvifCameraOptions): opts is OnvifCameraUriOptions => {
    return typeof (opts as OnvifCameraUriOptions).uri === 'string'
}

export default class OnvifCamera extends EventEmitter implements Camera {
    protected onvifCamOps: OnvifModuleCameraOptions
    protected name: string
    protected onvifCamPromise: Promise<OnvifModuleCamera> | undefined

    public constructor(uri: string)
    public constructor(opts: OnvifCameraOptions)

    public constructor(uriOrOpts: string | OnvifCameraOptions) {
        super()
        let opts = typeof uriOrOpts === 'string'
          ? { uri: uriOrOpts }
          : uriOrOpts

        if (isOnvifCameraUriOptions(opts)) {
          const {hostname, port, username, password} = new url.URL(`onvif://${opts.uri}`)
          opts = {
            ...opts,
            hostname, port: parseInt(port, 10), username, password
          }
        }

        this.name = opts.name || opts.hostname
        this.onvifCamOps = opts
    }

    protected async connect(): Promise<OnvifModuleCamera> {
        if (!this.onvifCamPromise) {
          this.onvifCamPromise = new Promise((resolve, reject) => {
            const onvifCam = new OnvifModuleCamera(this.onvifCamOps, (err) => {
              if(err) {
                onvifCam.removeAllListeners('rawRequest')
                onvifCam.removeAllListeners('rawResponse')

                const correctStackedError = new Error('Onvif Connection Error : ' + err.message)
                // Avoid Camera locking
                delete this.onvifCamPromise
                return reject(correctStackedError)
              }
              resolve(onvifCam)
            })

            onvifCam.on('rawResponse', (response) =>
              this.emit('onvifResponse', response)
            )
            onvifCam.on('rawRequest', (request) =>
              this.emit('onvifRequest', request.replace(/(<Password>|<Password .*>)([^<]+)(<\/Password>)/g, '$1***$3'))
            )
          })
        }

        return this.onvifCamPromise
    }

    public async getStreamUri(profileToken?: string | null): Promise<{uri: string}> {
        const onvifCam = await this.connect()

        return new Promise((resolve, reject) => {
          onvifCam.getStreamUri({profileToken}, (err, data) => {
            if (err) {
                const correctStackedError = new Error('Onvif getStreamUri Error : ' + err.message)
                return reject(correctStackedError)
            }
            resolve(data)
          })
        })
    }

    public async getSnapshotUri(profileToken?: string | null): Promise<{uri: string}> {
        const onvifCam = await this.connect()

        return new Promise((resolve, reject) => {
          onvifCam.getSnapshotUri({profileToken}, (err, data) => {
            if (err) {
                const correctStackedError = new Error('Onvif getSnapshotUri Error : ' + err.message)
                return reject(correctStackedError)
            }
            resolve(data)
          })
        })
    }

    public async getProfiles(): Promise<Array<{$: {token: string}}>> {
        const onvifCam = await this.connect()

        return onvifCam.profiles
    }

    public getName(): string {
        return this.name
    }
}
