export { default as Camera } from './camera'
export { default as OnvifCamera } from './onvif-camera'
export { default as GenericCamera } from './gereneric-camera'
export { default as CameraRecorder } from './camera-recorder'
export { default as Process, ProcessOptions } from './process'
export { default as RecordingProcess, RecordingProcessOptions } from './recording-process'
export { default as SnapshotRecordingProcess } from './snapshot-recording-process'
export { default as SnapshotsSerieRecordingProcess } from './snapshots-serie-recording-process'
export { default as TimelapsRecordingProcess } from './timelaps-recording-process'
export { default as StreamRecordingProcess } from './stream-recording-process'
export { default as SnapshotsToVideoConvertingProcess, SnapshotsToVideoConvertingProcessOptions } from './snapshots-to-video-converting-process'

export function changePathExtension(path: string, newExtension: string | null): string {
  const pathWithoutExtension = path.replace(/\.[a-z0-4]{1,4}$/, '');

  return pathWithoutExtension + (newExtension ? '.' + newExtension : '');
}
