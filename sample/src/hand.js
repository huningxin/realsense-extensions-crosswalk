var startButton = document.getElementById('start');
var stopButton = document.getElementById('stop');
startButton.disabled = true;
stopButton.disabled = true;

var depthCanvas = document.getElementById('depth');
var depthContext = depthCanvas.getContext('2d');
depthContext.clearRect(0, 0, depthCanvas.width, depthCanvas.height);

var statusSpan = document.getElementById('status');

var fpsCounter = new Stats();
fpsCounter.domElement.style.position = 'absolute';
fpsCounter.domElement.style.top = '0px';
fpsCounter.domElement.style.left = '0px';
document.body.appendChild(fpsCounter.domElement);

var handModule;

var stopped = true;

function runPipeline() {
  handModule.process().then(
      function() {
        updateDepth();
        updateHandData();
        if (!stopped)
          runPipeline();
      },
      function(e) {
        statusSpan.innerHTML = e.message;
      }
  );
}

function updateDepth() {
  handModule.getSample().then(
      function(sample) {
        var depthImage = sample.depth;
        if (depthImage.width != depthCanvas.width || depthImage.height != depthCanvas.height) {
          depthCanvas.width = depthImage.width;
          depthCanvas.height = depthImage.height;
          depthContext = depthCanvas.getContext('2d');
          statusSpan.innerHTML = 'depth image (' +
              depthImage.width + 'x' + depthImage.height + ')';
        }
        depthContext.clearRect(0, 0, depthCanvas.width, depthCanvas.height);
        var imageData = depthContext.createImageData(depthImage.width, depthImage.height);
        RSUtils.ConvertDepthToRGBUsingHistogram(
            depthImage, [255, 255, 255], [0, 0, 0], imageData.data);
        depthContext.putImageData(imageData, 0, 0);
      },
      function(e) {
        statusSpan.innerHTML = e.message;
      }
  );
}

function updateHandData() {
  handModule.getHandData().then(
      function(handData) {
        fpsCounter.update();
      },
      function(e) {
          statusSpan.innerHTML = e.message;
      }
  );
}

function handleError(e) {
  statusSpan.innerHTML = e.message;
}

function main() {
  try {
    handModule = new realsense.Hand.HandModule();
  } catch (e) {
    statusSpan.innerHTML = e.message;
  }
  handModule.init().then(
      function() {
        statusSpan.innerHTML = 'init succeeds.';
        startButton.disabled = false;
        stopButton.disabled = false;
      },
      handleError
  );
  startButton.onclick = function(e) {
    handModule.open().then(
        function() {
          statusSpan.innerHTML = 'open succeeds.';
          stopped = false;
          runPipeline();
        },
        handleError
    );
  };
  stopButton.onclick = function(e) {
    handModule.close().then(
        function() {
          statusSpan.innerHTML = 'close succeeds.';
          stopped = true;
        },
        handleError
    );
  };
}
