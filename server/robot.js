'use strict'

const Cylon = require('cylon')

module.exports = (windowed, queue) => Cylon.robot({
  connections: {
    opencv: { adaptor: 'opencv' }
  },

  devices: {
    window: { driver: 'window' },
    camera: {
      driver: 'camera',
      camera: 0,
      haarcascade: __dirname + '/haarcascade_frontalface_alt.xml'
    }
  },

  faces: undefined,

  work: function(my) {
    // We setup our face detection when the camera is ready to
    // display images, we use `once` instead of `on` to make sure
    // other event listeners are only registered once.
    my.camera.once('cameraReady', function() {
      console.log('The camera is ready!')

      // We add a listener for the facesDetected event
      // here, we will get (err, image/frame, faces) params back in
      // the listener function that we pass.
      // The faces param is an array conaining any face detected
      // in the frame (im).
      my.camera.on('facesDetected', function(err, im, faces) {
        if (err) { console.log(err) }

        // We loop through the faces and manipulate the image
        // to display a square in the coordinates for the detected
        // faces.

        if( this.faces === undefined ) {
          // setup
          this.faces = faces
        }

        const persistentFaces = []
        let matchedAnyFace = false

        faces.forEach((face) => {
          let matchedMultipleFrames = false

          for (let i = 0; i < this.faces.length; i++) {
            const otherFace = this.faces[i]

            if (otherFace.matchCount === undefined) {
              otherFace.matchCount = 0
            }

            if (Math.abs(otherFace.x - face.x) < 100 && Math.abs(otherFace.y - face.y) < 100) {
              otherFace.matchCount++
              otherFace.x = face.x
              otherFace.y = face.y
              otherFace.height = face.height
              otherFace.width = face.width
              matchedAnyFace = true

              // console.log('face matchCount: ' + otherFace.matchCount)
              if (otherFace.matchCount > 2) {
                matchedMultipleFrames = true

                persistentFaces.push(otherFace)
              }

              break
            }
          }
          if (windowed === true) {
            const color =
              matchedMultipleFrames
              ? [ 255, 0, 0 ]
              : [0, 255, 0]
            im.rectangle(
              [face.x, face.y],
              [face.width, face.height],
              color,
              2
            )
          }

        }) // forEach

        if (matchedAnyFace === false) {
          // reset faces array

          // console.log('reset')
          this.faces = faces
        }

        queue.push(persistentFaces)

        // The second to last param is the color of the rectangle
        // as an rgb array e.g. [r,g,b].
        // Once the image has been updated with rectangles around
        // the faces detected, we display it in our window.
        if (windowed === true) {
          my.window.show(im, 40)
        }

        // After displaying the updated image we trigger another
        // frame read to ensure the fastest processing possible.
        // We could also use an interval to try and get a set
        // amount of processed frames per second, see below.
        my.camera.readFrame()
      })

      // We listen for frameReady event, when triggered
      // we start the face detection passing the frame
      // that we just got from the camera feed.
      my.camera.on('frameReady', function(err, im) {
        if (err) { console.log(err) }
        my.camera.detectFaces(im)
      })

      my.camera.readFrame()
    })
  }
})
