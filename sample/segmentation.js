var statusElement = document.getElementById('status');
var startButton = document.getElementById('start');
var stopButton = document.getElementById('stop');
var takePhotoButton = document.getElementById('takePhoto');
var loadPhoto = document.getElementById('loadPhoto');
var saveButton = document.getElementById('save');
var restartButton = document.getElementById('restart');
var undoButton = document.getElementById('undo');
var redoButton = document.getElementById('redo');

var previewCanvas = document.getElementById('preview');
var imageCanvas = document.getElementById('image');
var overlayCanvas = document.getElementById('overlay');

const FirstClick = 0, SecondClick = 1, TraceClicks = 2;
var ep, segmentation, photoCapture, XDMUtils;
var previewContext, previewData, imageContext, imageData, overlayContext;
var currentPhoto, savePhoto;

var width = 1920, height = 1080;
var canvasWidth = 400, canvasHeight = 300;
var curPhotoWidth, curPhotoHeight;
var topX, topY, bottomX, bottomY;
var lastX = -1, lastY = -1;
var nextClick = FirstClick;
var hasImage = false;
var stopDrawLine = false;
var markupImgHints = [];
var points = [];
var foreground;
var isLeftButtonDown = false, isRightButtonDown = false;


function doBlendColorPop(colorImage, maskImage) {
  var GREY = 0x7f;
  var alpha;
  for (var x = 0; x < colorImage.width; x++) {
    for (var y = 0; y < colorImage.height; y++) {
      var index = y * colorImage.width * 4 + x * 4;
      var maskIndex = y * maskImage.width + x;
      var mask = maskImage.data[maskIndex];
      if (mask > 0) alpha = 1.0;
      else alpha = 0.0;

      colorImage.data[index] = parseInt(alpha * colorImage.data[index] +
          (1 - alpha) * ((colorImage.data[index] >> 4) + GREY));
      colorImage.data[index + 1] = parseInt(alpha * colorImage.data[index + 1] +
          (1 - alpha) * ((colorImage.data[index + 1] >> 4) + GREY));
      colorImage.data[index + 2] = parseInt(alpha * colorImage.data[index + 2] +
          (1 - alpha) * ((colorImage.data[index + 2] >> 4) + GREY));
    }
  }
}

function resetMarkupImgHints() {
  if (markupImgHints.length) markupImgHints = [];
  var len = curPhotoWidth * curPhotoHeight;
  for (var i = 0; i < len; i++) {
    markupImgHints[i] = 0;
  }
}

function resetPoints() {
  if (points.length) points = [];
}

function createInitialMask() {
  var value = 255;
  for (var y = topY; y != bottomY; y += (topY < bottomY) ? 1 : -1)
  {
    for (var x = topX; x != bottomX; x += (topX < bottomX) ? 1 : -1)
    {
      markupImgHints[y * curPhotoWidth + x] = value;
    }
  }
}

function connectMissedPixels(starts, ends) {
  if (starts.x == ends.x)
  {
    for (var y = starts.y; y != ends.y; y += (starts.y < ends.y) ? 1 : -1)
    {
      points.push({x: starts.x, y: y});
    }
  } else {
    var slope = (ends.y - starts.y) / parseFloat(ends.x - starts.x);

    for (var x = starts.x; x != ends.x; x += (starts.x < ends.x) ? 1 : -1)
    {
      var y = parseInt((slope * (x - starts.x) + starts.y) + 0.5);
      points.push({x: x, y: y});
    }
  }
}

function updateMarkupImage(pointX, pointY, isForeground) {
  points.push({x: pointX, y: pointY});

  foreground = isForeground;

  if (lastX == -1 && lastY == -1)
    points.push({ x: pointX, y: pointY });
  else
    connectMissedPixels({x: lastX, y: lastY}, {x: pointX, y: pointY});

  lastX = pointX;
  lastY = pointY;
}

function main() {
  ep = realsense.DepthEnabledPhotography.EnhancedPhoto;
  photoCapture = realsense.DepthEnabledPhotography.PhotoCapture;
  XDMUtils = realsense.DepthEnabledPhotography.XDMUtils;

  previewContext = previewCanvas.getContext('2d');
  imageContext = imageCanvas.getContext('2d');
  overlayContext = overlay.getContext('2d');
  previewData = previewContext.createImageData(width, height);

  var gettingImage = false;

  overlayCanvas.addEventListener('mousedown', function(e) {
    if (!hasImage)
      return;
    if (nextClick == FirstClick) {
      topX = parseInt((e.clientX - overlayCanvas.offsetLeft) * width / canvasWidth);
      topY = parseInt((e.clientY - overlayCanvas.offsetTop) * height / canvasHeight);
      nextClick = SecondClick;
    } else if (nextClick == SecondClick) {
      bottomX = parseInt((e.clientX - overlayCanvas.offsetLeft) * width / canvasWidth);
      bottomY = parseInt((e.clientY - overlayCanvas.offsetTop) * height / canvasHeight);

      createInitialMask();

      var markupImage = {
        format: 'Y8',
        width: curPhotoWidth,
        height: curPhotoHeight,
        data: markupImgHints
      };
      segmentation.objectSegment(markupImage).then(
          function(maskImage) {
            currentPhoto.queryContainerImage().then(
                function(colorImage) {
                  doBlendColorPop(colorImage, maskImage);

                  imageContext.clearRect(0, 0, width, height);
                  imageData = imageContext.createImageData(
                      colorImage.width, colorImage.height);
                  imageData.data.set(colorImage.data);
                  imageContext.putImageData(imageData, 0, 0);

                  currentPhoto.clone().then(
                      function(photo) {
                        savePhoto = photo;
                        savePhoto.setContainerImage(colorImage).then(
                            function() {
                              statusElement.innerHTML = 'Finish processing segmentation!' +
                                  'Click and drag the left(foregroud) and right(background)' +
                                  'mouse buttons to refine the mask';
                              nextClick = TraceClicks;
                            },
                            function(e) { statusElement.innerHTML = e; });
                      },
                      function(e) { statusElement.innerHTML = e; });
                },
                function(e) { statusElement.innerHTML = e });
          },
          function(e) { statusElement.innerHTML = e });
    } else if (nextClick == TraceClicks) {
      stopDrawLine = false;
      resetPoints();
      var x = parseInt((e.clientX - overlayCanvas.offsetLeft) * width / canvasWidth);
      var y = parseInt((e.clientY - overlayCanvas.offsetTop) * height / canvasHeight);
      overlayContext.beginPath();
      if (e.button == 0) {
        isLeftButtonDown = true;
        overlayContext.strokeStyle = 'blue';
      } else {
        isRightButtonDown = true;
        overlayContext.strokeStyle = 'green';
      }
      overlayContext.lineWidth = 0.5;
      overlayContext.moveTo(x, y);
    }
  }, false);

  overlayCanvas.addEventListener('mousemove', function(e) {
    bottomX = parseInt((e.clientX - overlayCanvas.offsetLeft) * width / canvasWidth);
    bottomY = parseInt((e.clientY - overlayCanvas.offsetTop) * height / canvasHeight);
    if (nextClick == SecondClick) {
      overlayContext.clearRect(0, 0, width, height);
      var offsetX = bottomX - topX;
      var offsetY = bottomY - topY;
      overlayContext.strokeStyle = 'red';
      overlayContext.lineWidth = 2;
      overlayContext.strokeRect(topX, topY, offsetX, offsetY);
    } else if (nextClick == TraceClicks && (isLeftButtonDown || isRightButtonDown)) {
      if (!stopDrawLine) {
        overlayContext.lineTo(bottomX, bottomY);
        overlayContext.stroke();
        // for precessing
        if (isLeftButtonDown) {
          updateMarkupImage(bottomX, bottomY, true);
        } else if (isRightButtonDown) {
          updateMarkupImage(bottomX, bottomY, false);
        }
      } else {
        overlayContext.closePath();
      }
    }
  }, false);

  overlayCanvas.addEventListener('mouseup', function(e) {
    if (nextClick == TraceClicks) {
      if (e.button == 0) {
        isLeftButtonDown = false;
      } else {
        isRightButtonDown = false;
      }
      stopDrawLine = true;
      lastX = lastY = -1;

      segmentation.refineMask(points, foreground).then(
          function(maskImage) {
            currentPhoto.queryContainerImage().then(
                function(colorImage) {
                  doBlendColorPop(colorImage, maskImage);

                  imageContext.clearRect(0, 0, width, height);
                  imageData = imageContext.createImageData(
                      colorImage.width, colorImage.height);
                  imageData.data.set(colorImage.data);
                  imageContext.putImageData(imageData, 0, 0);

                  currentPhoto.clone().then(
                      function(photo) {
                        savePhoto = photo;
                        savePhoto.setContainerImage(colorImage).then(
                            function() {
                              statusElement.innerHTML = 'Click and drag the left(foregroud) and' +
                              'right(background) mouse buttons to refine the mask';
                            },
                            function(e) { statusElement.innerHTML = e; });
                      },
                      function(e) { statusElement.innerHTML = e; });
                },
                function(e) { statusElement.innerHTML = e; });
          },
          function(e) { statusElement.innerHTML += e; });
    }
  }, false);

  photoCapture.onpreview = function(e) {
    if (gettingImage)
      return;
    gettingImage = true;
    photoCapture.getPreviewImage().then(
        function(image) {
          previewData.data.set(image.data);
          previewContext.putImageData(previewData, 0, 0);
          gettingImage = false;
        }, function() { });
  };

  photoCapture.onerror = function(e) {
    statusElement.innerHTML = 'Status Info : onerror: ' + e.status;
  };

  startButton.onclick = function(e) {
    statusElement.innerHTML = 'Status Info : Start: ';
    gettingImage = false;
    photoCapture.startPreview({
      colorWidth: 1920,
      colorHeight: 1080,
      depthWidth: 480,
      depthHeight: 360,
      framerate: 30}).then(
        function(e) { statusElement.innerHTML += e; },
        function(e) { statusElement.innerHTML += e; });
  };

  takePhotoButton.onclick = function(e) {
    photoCapture.takePhoto().then(
        function(photo) {
          currentPhoto = photo;
          savePhoto = photo;
          if (!segmentation) {
            try {
              segmentation = new realsense.DepthEnabledPhotography.Segmentation(currentPhoto);
            } catch (e) {
              statusElement.innerHTML = e.message;
              segmentation = null;
              return;
            }
          }

          currentPhoto.queryContainerImage().then(
              function(image) {
                curPhotoWidth = image.width;
                curPhotoHeight = image.height;
                resetMarkupImgHints();
                resetPoints();
                nextClick = FirstClick;
                imageData =
                    imageContext.createImageData(image.width, image.height);
                statusElement.innerHTML = 'Select the bounding box around the object.';
                overlayContext.clearRect(0, 0, width, height);
                imageData.data.set(image.data);
                imageContext.putImageData(imageData, 0, 0);
                hasImage = true;
              },
              function(e) { statusElement.innerHTML += e; });
        },
        function(e) { statusElement.innerHTML += e; });
  };

  saveButton.onclick = function(e) {
    if (!savePhoto) {
      statusElement.innerHTML = 'There is no photo to save';
      return;
    }
    XDMUtils.saveXDM(savePhoto).then(
        function(blob) {
          var reader = new FileReader();
          reader.onload = function(evt) {
            var image = document.getElementById('imageDisplayArea');
            image.src = evt.target.result;
            // Currently, crosswalk has bugs to download (see XWALK-5220). So the following code
            // doesn't work. Once download is enabled. The processed image will be
            // downloaded into 'Downloads' folder.
            var a = document.createElement('a');
            a.href = evt.target.result;
            a.download = true;
            a.click();
            statusElement.innerHTML = 'Save successfully';
          };
          reader.readAsDataURL(blob);
        },
        function(e) { statusElement.innerHTML = e; });
  };

  loadPhoto.addEventListener('change', function(e) {
    var file = loadPhoto.files[0];
    XDMUtils.isXDM(file).then(
        function(success) {
          if (success) {
            XDMUtils.loadXDM(file).then(
                function(photo) {
                  currentPhoto = photo;
                  savePhoto = photo;
                  if (!segmentation) {
                    try {
                      segmentation =
                          new realsense.DepthEnabledPhotography.Segmentation(currentPhoto);
                    } catch (e) {
                      statusElement.innerHTML = e.message;
                      segmentation = null;
                      return;
                    }
                  }

                  currentPhoto.queryContainerImage().then(
                      function(image) {
                        curPhotoWidth = image.width;
                        curPhotoHeight = image.height;
                        resetMarkupImgHints();
                        resetPoints();
                        nextClick = FirstClick;
                        imageContext.clearRect(0, 0, width, height);
                        imageData = imageContext.createImageData(image.width, image.height);
                        statusElement.innerHTML = 'Select the bounding box around the object.';
                        overlayContext.clearRect(0, 0, width, height);
                        imageData.data.set(image.data);
                        imageContext.putImageData(imageData, 0, 0);
                        hasImage = true;
                      },
                      function(e) { statusElement.innerHTML = e; });
                },
                function(e) { statusElement.innerHTML = e; });
          } else {
            statusElement.innerHTML = 'This is not a XDM file. Load failed.';
          }
        },
        function(e) { statusElement.innerHTML = e; });
  });

  stopButton.onclick = function(e) {
    statusElement.innerHTML = 'Status Info : Stop: ';
    photoCapture.stopPreview().then(function(e) { statusElement.innerHTML += e; },
                                    function(e) { statusElement.innerHTML += e; });
  };

  restartButton.onclick = function(e) {
    overlayContext.clearRect(0, 0, width, height);
    currentPhoto.queryContainerImage().then(
        function(image) {
          curPhotoWidth = image.width;
          curPhotoHeight = image.height;
          resetMarkupImgHints();
          resetPoints();
          nextClick = FirstClick;
          imageContext.clearRect(0, 0, width, height);
          imageData =
              imageContext.createImageData(image.width, image.height);
          statusElement.innerHTML = 'Select the bounding box around the object.';
          overlayContext.clearRect(0, 0, width, height);
          imageData.data.set(image.data);
          imageContext.putImageData(imageData, 0, 0);
          hasImage = true;
        },
        function(e) { statusElement.innerHTML += e; });
  };

  undoButton.onclick = function(e) {
    if (!segmentation || !hasImage) {
      statusElement.innerHTML = 'Undo Scribble Error';
    }
    segmentation.undo().then(
        function(maskImage) {
          currentPhoto.queryContainerImage().then(
              function(colorImage) {
                doBlendColorPop(colorImage, maskImage);

                imageContext.clearRect(0, 0, width, height);
                imageData = imageContext.createImageData(
                    colorImage.width, colorImage.height);
                imageData.data.set(colorImage.data);
                imageContext.putImageData(imageData, 0, 0);

                currentPhoto.clone().then(
                    function(photo) {
                      savePhoto = photo;
                      savePhoto.setContainerImage(colorImage).then(
                          function() {
                            statusElement.innerHTML = 'Undo Scribble Complete';
                          },
                          function(e) { statusElement.innerHTML = e; });
                    },
                    function(e) { statusElement.innerHTML = e; });
              },
              function(e) { statusElement.innerHTML = e; });
        },
        function(e) { statusElement.innerHTML = e; });
  };

  redoButton.onclick = function(e) {
    if (!segmentation || !hasImage) {
      statusElement.innerHTML = 'Redo Scribble Error';
    }
    segmentation.redo().then(
        function(maskImage) {
          currentPhoto.queryContainerImage().then(
              function(colorImage) {
                doBlendColorPop(colorImage, maskImage);

                imageContext.clearRect(0, 0, width, height);
                imageData = imageContext.createImageData(
                    colorImage.width, colorImage.height);
                imageData.data.set(colorImage.data);
                imageContext.putImageData(imageData, 0, 0);

                currentPhoto.clone().then(
                    function(photo) {
                      savePhoto = photo;
                      savePhoto.setContainerImage(colorImage).then(
                          function() {
                            statusElement.innerHTML = 'Redo Scribble Complete';
                          },
                          function(e) { statusElement.innerHTML = e; });
                    },
                    function(e) { statusElement.innerHTML = e; });
              },
              function(e) { statusElement.innerHTML = e; });
        },
        function(e) { statusElement.innerHTML = e; });
  };
}
