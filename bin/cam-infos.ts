#!/usr/bin/env ts-node

import { OnvifCamera } from '..';

(async() => {

  if (!process.env.CAMERA_URI) {
      throw new Error('Expected env CAMERA_URI')
  }

  const cam = new OnvifCamera(process.env.CAMERA_URI)

  const profiles = await cam.getProfiles()

  const mapping = await Promise.all(profiles.map(async (profile) => ({
    profileToken: profile.$.token,
    snapshotUri: (await cam.getSnapshotUri(profile.$.token)).uri,
    streamUri: (await cam.getStreamUri(profile.$.token)).uri
  })))

  console.table(mapping)

})();