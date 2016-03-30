var RSUtils = {
  'getDateString': function getDateString() {
    var date = new Date();
    var dateString =
        date.getFullYear() +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        ('0' + date.getDate()).slice(-2) +
        ('0' + date.getHours()).slice(-2) +
        ('0' + date.getMinutes()).slice(-2) +
        ('0' + date.getSeconds()).slice(-2);
    return dateString;
  },
  'ConvertDepthToRGBUsingHistogram': function (depthImage, nearColor, farColor, rgbImage) {
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
};
