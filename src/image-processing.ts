import { RecordingProcess } from '.'

export interface ImageProcessor {
}

export function imageProcessing<T extends { new(...args: any[]): Required<RecordingProcess> }>(constructor: T) {
    return class extends constructor implements ImageProcessor {
    }
}