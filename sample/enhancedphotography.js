var statusElement = document.getElementById('status');
var startButton = document.getElementById('start');
var stopButton = document.getElementById('stop');
var snapShotButton = document.getElementById('snapshot');
var loadButton = document.getElementById('load');
var saveButton = document.getElementById('save');
var fileInput = document.getElementById('fileInput');
var measureRadio = document.getElementById('measure');
var refocusRadio = document.getElementById('refocus');
var depthEnhanceRadio = document.getElementById('depthEnhance');
var depthUpscaleRadio = document.getElementById('depthUpscale');
var pasteOnPlaneRadio = document.getElementById('pastOnPlane');
var popColorRadio = document.getElementById('popColor');

var preview_canvas = document.getElementById('preview');
var image_canvas = document.getElementById('image');
var overlay_canvas = document.getElementById('overlay');

var preview_context, preview_data, image_context, image_data;
var overlay_context;
var ep;
var currentPhoto, savePhoto;
var width = 640, height = 480;
var canvas_width = 400, canvas_height = 300;

var click_count = 0;
var start_x = 0;
var start_y = 0;
var end_x = 0, end_y = 0;
var has_image = false;
var sticker;
var has_select_points = false;

function ConvertDepthToRGBUsingHistogram(
    depthImage, nearColor, farColor, rgbImage) {
  var depthImageData = depthImage.data;
  var imageSize = depthImage.width * depthImage.height;
  for (var l = 0; l < imageSize; ++l) {
    rgbImage[l * 4] = 0;
    rgbImage[l * 4 + 1] = 0;
    rgbImage[l * 4 + 2] = 0;
    rgbImage[l * 4 + 3] = 255;
  }
  // Produce a cumulative histogram of depth values
  var histogram = new Int32Array(256 * 256);
  for (var i = 0; i < imageSize; ++i) {
    if (depthImageData[i]) {
      ++histogram[depthImageData[i]];
    }
  }
  for (var j = 1; j < 256 * 256; ++j) {
    histogram[j] += histogram[j - 1];
  }

  // Remap the cumulative histogram to the range 0..256
  for (var k = 1; k < 256 * 256; k++) {
    histogram[k] = (histogram[k] << 8) / histogram[256 * 256 - 1];
  }

  // Produce RGB image by using the histogram to interpolate between two colors
  for (var l = 0; l < imageSize; ++l) {
    if (depthImageData[l]) { // For valid depth values (depth > 0)
      // Use the histogram entry (in the range of 0..256) to interpolate between nearColor and
      // farColor
      var t = histogram[depthImageData[l]];
      rgbImage[l * 4] = ((256 - t) * nearColor[0] + t * farColor[0]) >> 8;
      rgbImage[l * 4 + 1] = ((256 - t) * nearColor[1] + t * farColor[1]) >> 8;
      rgbImage[l * 4 + 2] = ((256 - t) * nearColor[2] + t * farColor[2]) >> 8;
      rgbImage[l * 4 + 3] = 255;
    }
  }
}

function drawCross(x, y) {
  overlay_context.beginPath();
  overlay_context.strokeStyle = 'blue';
  overlay_context.lineWidth = 2;
  overlay_context.moveTo(x - 7, y - 7);
  overlay_context.lineTo(x + 7, y + 7);
  overlay_context.stroke();
  overlay_context.moveTo(x + 7, y - 7);
  overlay_context.lineTo(x - 7, y + 7);
  overlay_context.stroke();
  overlay_context.closePath();
}

function measureDistance(e) {
  if (has_image == false)
    return;

  click_count = click_count + 1;
  var x = parseInt((e.clientX - overlay_canvas.offsetLeft) * width / canvas_width);
  var y = parseInt((e.clientY - overlay_canvas.offsetTop) * height / canvas_height);
  if (click_count % 2 == 0) {
    drawCross(x, y);
    overlay_context.beginPath();
    overlay_context.moveTo(start_x, start_y);
    overlay_context.lineTo(x, y);
    overlay_context.strokeStyle = 'blue';
    overlay_context.lineWidth = 2;
    overlay_context.stroke();
    overlay_context.closePath();
    statusElement.innerHTML = 'Status Info : Measure: ';
    ep.measureDistance(currentPhoto, {x: start_x, y: start_y}, {x: x, y: y}).then(
        function(d) {
          statusElement.innerHTML += 'distance = ' +
              parseFloat(d.distance).toFixed(2) + ' millimeters';
          overlay_context.fillStyle = 'blue';
          overlay_context.font = 'bold 14px Arial';
          overlay_context.fillText(
              parseFloat(d.distance).toFixed(2) + ' mm',
              (start_x + x) / 2, (start_y + y) / 2 - 5);
        },
        function(e) { statusElement.innerHTML += e; });
  } else {
    overlay_context.clearRect(0, 0, width, height);
    drawCross(x, y);
    start_x = x;
    start_y = y;
  }
}

function depthRefocus(e) {
  if (has_image == false)
    return;

  var x = parseInt((e.clientX - overlay_canvas.offsetLeft) * width / canvas_width);
  var y = parseInt((e.clientY - overlay_canvas.offsetTop) * height / canvas_height);

  overlay_context.clearRect(0, 0, width, height);
  drawCross(x, y);

  ep.depthRefocus(currentPhoto, { x: x, y: y }, 50.0).then(
      function(photo) {
        savePhoto = photo;
        photo.queryReferenceImage().then(
            function(image) {
              image_data = image_context.createImageData(image.width, image.height);
              statusElement.innerHTML = 'Depth refocus success. Please select focus point again.';
              overlay_context.clearRect(0, 0, width, height);
              image_data.data.set(image.data);
              image_context.putImageData(image_data, 0, 0);
            },
            function(e) { statusElement.innerHTML = e; });
      },
      function(e) { statusElement.innerHTML = e; });
}

function depthEnhance() {
  ep.enhanceDepth(currentPhoto, 'low').then(
      function(photo) {
        savePhoto = photo;
        photo.queryDepthImage().then(
            function(image) {
              image_context.clearRect(0, 0, width, height);
              image_data = image_context.createImageData(image.width, image.height);
              statusElement.innerHTML = 'Finished depth enhancing.';
              ConvertDepthToRGBUsingHistogram(
                  image, [255, 255, 255], [0, 0, 0], image_data.data);
              image_context.putImageData(image_data, 0, 0);
            },
            function(e) { statusElement.innerHTML = e; });
      },
      function(e) { statusElement.innerHTML = e; });
}

function depthUpscale() {
  ep.depthResize(currentPhoto, { width: width, height: height }).then(
      function(photo) {
        savePhoto = photo;
        photo.queryDepthImage().then(
            function(image) {
              image_data = image_context.createImageData(image.width, image.height);
              statusElement.innerHTML = 'Finished depth upscaling.';
              ConvertDepthToRGBUsingHistogram(
                  image, [255, 255, 255], [0, 0, 0], image_data.data);
              image_context.putImageData(image_data, 0, 0);
            },
            function(e) { statusElement.innerHTML = e; });
      },
      function(e) { statusElement.innerHTML = e; });
}

function doPasteOnPlane() {
  if (!has_image || !pasteOnPlaneRadio.checked)
    return;

  if (!has_select_points) {
    statusElement.innerHTML =
        'Select TOP LEFT and BOTTOM LEFT corners to paste sticker on plane.';
    return;
  }

  ep.pasteOnPlane(currentPhoto, sticker, { x: start_x, y: start_y }, { x: end_x, y: end_y }).then(
      function(photo) {
        savePhoto = photo;
        photo.queryReferenceImage().then(
            function(image) {
              statusElement.innerHTML = 'Finished paste on plane.';
              image_data.data.set(image.data);
              image_context.putImageData(image_data, 0, 0);
            },
            function(e) { statusElement.innerHTML = e; });
      },
      function(e) { statusElement.innerHTML = e; });
}

function pasteOnPlane(e) {
  if (has_image == false || !sticker)
    return;

  click_count = click_count + 1;
  end_x = parseInt((e.clientX - overlay_canvas.offsetLeft) * width / canvas_width);
  end_y = parseInt((e.clientY - overlay_canvas.offsetTop) * height / canvas_height);
  if (click_count % 2 == 0) {
    drawCross(end_x, end_y);
    overlay_context.beginPath();
    overlay_context.moveTo(start_x, start_y);
    overlay_context.lineTo(end_x, end_y);
    overlay_context.strokeStyle = 'blue';
    overlay_context.lineWidth = 2;
    overlay_context.stroke();
    overlay_context.closePath();

    has_select_points = true;
    doPasteOnPlane();
  } else {
    overlay_context.clearRect(0, 0, width, height);
    drawCross(end_x, end_y);
    start_x = end_x;
    start_y = end_y;
  }
}

function popColor(e) {
  if (has_image == false)
    return;

  var x = parseInt((e.clientX - overlay_canvas.offsetLeft) * width / canvas_width);
  var y = parseInt((e.clientY - overlay_canvas.offsetTop) * height / canvas_height);

  overlay_context.clearRect(0, 0, width, height);
  drawCross(x, y);

  ep.computeMaskFromCoordinate(currentPhoto, { x: x, y: y }).then(
      function(mask_image) {
        currentPhoto.queryReferenceImage().then(
          function(color_image) {
            for (var x = 0; x < color_image.width; x++)
            {
              for (var y = 0; y < color_image.height; y++)
              {
                var index = y * color_image.width * 4 + x * 4;
                var mask_index = y * mask_image.width + x;
                var alpha = 1.0 - mask_image.data[mask_index];

                // BGR
                var grey = 0.0722 * color_image.data[index + 2] +
                    0.7152 * color_image.data[index + 1] + 0.2126 * color_image.data[index];

                color_image.data[index] =
                    parseInt(color_image.data[index] * (1 - alpha) + grey * (alpha));
                color_image.data[index + 1] =
                    parseInt(color_image.data[index + 1] * (1 - alpha) + grey * (alpha));
                color_image.data[index + 2] =
                    parseInt(color_image.data[index + 2] * (1 - alpha) + grey * (alpha));
              }
            }

            image_context.clearRect(0, 0, width, height);
            image_data = image_context.createImageData(color_image.width, color_image.height);
            image_data.data.set(color_image.data);
            image_context.putImageData(image_data, 0, 0);

            currentPhoto.clone().then(
                function(photo) {
                  savePhoto = photo;
                  savePhoto.setColorImage(color_image).then(
                      function() {
                        statusElement.innerHTML =
                            'Finish processing color pop, select again!';
                      },
                      function(e) { statusElement.innerHTML = e; });
                },
                function(e) { statusElement.innerHTML = e; });
          },
          function(e) { statusElement.innerHTML = e; });
      },
      function(e) { statusElement.innerHTML = e; });
}

function main() {
  ep = realsense.EnhancedPhotography;

  preview_context = preview_canvas.getContext('2d');
  image_context = image_canvas.getContext('2d');
  overlay_context = overlay.getContext('2d');

  fileInput.addEventListener('change', function(e) {
    var file = fileInput.files[0];
    var imageType = /image.*/;

    if (file.type.match(imageType)) {
      var reader = new FileReader();

      reader.onload = function(e) {
        var pasted_image = new Image();
        pasted_image.src = reader.result;

        var temp_canvas = document.createElement('canvas');
        var temp_context = temp_canvas.getContext('2d');
        temp_context.drawImage(pasted_image, 0, 0);
        var pasted_image_data = temp_context.getImageData(
            0, 0, pasted_image.width, pasted_image.height);

        sticker = {
          format: 'RGB32',
          width: pasted_image.width,
          height: pasted_image.height,
          data: pasted_image_data.data
        };

        doPasteOnPlane();
      };

      reader.readAsDataURL(file);
    } else {
      statusElement.innerHTML = 'File not supported!';
    }
  });

  measureRadio.addEventListener('click', function(e) {
    if (measureRadio.checked) {
      if (has_image == false) {
        statusElement.innerHTML = 'Please capture/load a photo first.';
        return;
      }

      statusElement.innerHTML = 'Select two points to measure distance.';
      overlay_context.clearRect(0, 0, width, height);
      currentPhoto.queryReferenceImage().then(
          function(image) {
            image_context.clearRect(0, 0, width, height);
            image_data = image_context.createImageData(image.width, image.height);
            image_data.data.set(image.data);
            image_context.putImageData(image_data, 0, 0);
          },
          function(e) { statusElement.innerHTML = e; });
    }
  }, false);

  refocusRadio.addEventListener('click', function(e) {
    if (refocusRadio.checked) {
      if (has_image == false) {
        statusElement.innerHTML = 'Please capture/load a photo first.';
        return;
      }

      statusElement.innerHTML = 'Select the refocus point.';
      overlay_context.clearRect(0, 0, width, height);
      currentPhoto.queryReferenceImage().then(
          function(image) {
            image_context.clearRect(0, 0, width, height);
            image_data = image_context.createImageData(image.width, image.height);
            image_data.data.set(image.data);
            image_context.putImageData(image_data, 0, 0);
          },
          function(e) { statusElement.innerHTML = e; });
    }
  }, false);

  depthEnhanceRadio.addEventListener('click', function(e) {
    if (depthEnhanceRadio.checked) {
      if (has_image == false) {
        statusElement.innerHTML = 'Please capture/load a photo first.';
        return;
      }
      overlay_context.clearRect(0, 0, width, height);
      depthEnhance();
    }
  }, false);

  depthUpscaleRadio.addEventListener('click', function(e) {
    if (depthUpscaleRadio.checked) {
      if (has_image == false) {
        statusElement.innerHTML = 'Please capture/load a photo first.';
        return;
      }
      overlay_context.clearRect(0, 0, width, height);
      depthUpscale();
    }
  }, false);

  pasteOnPlaneRadio.addEventListener('click', function(e) {
    if (pasteOnPlaneRadio.checked) {
      if (has_image == false) {
        statusElement.innerHTML = 'Please capture/load a photo first.';
        return;
      }

      if (!sticker) {
        statusElement.innerHTML =
            'Please click [Choose file] button to load the pasted image.';
      } else {
        statusElement.innerHTML =
          'Select TOP LEFT and BOTTOM LEFT corners to paste sticker on plane.';
      }

      overlay_context.clearRect(0, 0, width, height);
      currentPhoto.queryReferenceImage().then(
          function(image) {
            image_context.clearRect(0, 0, width, height);
            image_data.data.set(image.data);
            image_context.putImageData(image_data, 0, 0);
          },
          function(e) { statusElement.innerHTML = e; });
    }
  }, false);

  popColorRadio.addEventListener('click', function(e) {
    if (popColorRadio.checked) {
      if (has_image == false) {
        statusElement.innerHTML = 'Please capture/load a photo first.';
        return;
      }

      statusElement.innerHTML = 'Select the point to pop color.';
      overlay_context.clearRect(0, 0, width, height);
      currentPhoto.queryReferenceImage().then(
          function(image) {
            image_context.clearRect(0, 0, width, height);
            image_data.data.set(image.data);
            image_context.putImageData(image_data, 0, 0);
          },
          function(e) { statusElement.innerHTML = e; });
    }
  }, false);

  overlay_canvas.addEventListener('mousedown', function(e) {
    if (measureRadio.checked) {
      measureDistance(e);
    }
    if (refocusRadio.checked) {
      depthRefocus(e);
    }
    if (pasteOnPlaneRadio.checked) {
      pasteOnPlane(e);
    }
    if (popColorRadio.checked) {
      popColor(e);
    }
  }, false);

  preview_data = preview_context.createImageData(width, height);

  var image_fps = new Stats();
  image_fps.domElement.style.position = 'absolute';
  image_fps.domElement.style.top = '0px';
  image_fps.domElement.style.right = '0px';
  document.getElementById('canvas_container').appendChild(image_fps.domElement);

  var getting_image = false;

  ep.onpreview = function(e) {
    if (getting_image)
      return;
    getting_image = true;
    ep.getPreviewImage().then(
        function(image) {
          preview_data.data.set(image.data);
          preview_context.putImageData(preview_data, 0, 0);
          image_fps.update();
          getting_image = false;
        }, function() {});
  };

  ep.onerror = function(e) {
    statusElement.innerHTML = 'Status Info : onerror: ' + e.status;
  };

  startButton.onclick = function(e) {
    statusElement.innerHTML = 'Status Info : Start: ';
    getting_image = false;
    ep.startPreview().then(function(e) { statusElement.innerHTML += e; },
                           function(e) { statusElement.innerHTML += e; });
  };

  snapShotButton.onclick = function(e) {
    statusElement.innerHTML = 'Status Info : TakeSnapshot: ';
    ep.takeSnapShot().then(
        function(photo) {
          currentPhoto = photo;
          savePhoto = photo;
          currentPhoto.queryReferenceImage().then(
              function(image) {
                image_data = image_context.createImageData(image.width, image.height);
                statusElement.innerHTML += 'Sucess';
                overlay_context.clearRect(0, 0, width, height);
                image_data.data.set(image.data);
                image_context.putImageData(image_data, 0, 0);
                has_image = true;
                if (depthEnhanceRadio.checked) {
                  depthEnhance();
                }
                if (depthUpscaleRadio.checked) {
                  depthUpscale();
                }
              },
              function(e) { statusElement.innerHTML += e; });
        },
        function(e) { statusElement.innerHTML += e; });
  };

  saveButton.onclick = function(e) {
    // TODO(qjia7): Allow user to config the file path.
    statusElement.innerHTML = 'Status Info : Save as C:/workspace/photo2.jpg ';
    ep.saveAsXMP(savePhoto, 'C:/workspace/photo2.jpg').then(
        function(e) { statusElement.innerHTML += e; },
        function(e) { statusElement.innerHTML += e; });
  };

  loadButton.onclick = function(e) {
    // TODO(qjia7): Allow user to config the file path.
    statusElement.innerHTML =
        'Status Info : Load from C:/workspace/photo1.jpg : ';
    ep.loadFromXMP('C:/workspace/photo1.jpg').then(
        function(photo) {
          currentPhoto = photo;
          savePhoto = photo;
          currentPhoto.queryReferenceImage().then(
              function(image) {
                image_context.clearRect(0, 0, width, height);
                image_data = image_context.createImageData(image.width, image.height);
                statusElement.innerHTML += 'Sucess';
                overlay_context.clearRect(0, 0, width, height);
                image_data.data.set(image.data);
                image_context.putImageData(image_data, 0, 0);
                has_image = true;
                if (depthEnhanceRadio.checked) {
                  depthEnhance();
                }
                if (depthUpscaleRadio.checked) {
                  depthUpscale();
                }
              },
              function(e) { statusElement.innerHTML += e; });},
        function(e) { statusElement.innerHTML += e; });
  };

  stopButton.onclick = function(e) {
    statusElement.innerHTML = 'Status Info : Stop: ';
    ep.stopPreview().then(function(e) { statusElement.innerHTML += e; },
                          function(e) { statusElement.innerHTML += e; });
  };
}
