var startButton = document.getElementById('start');
var stopButton = document.getElementById('stop');
startButton.disabled = true;
stopButton.disabled = true;

var depthCanvas = document.getElementById('depth');
var depthContext = depthCanvas.getContext('2d');
var overlayCanvas = document.getElementById('overlay');
var overlayContext = overlayCanvas.getContext('2d');
depthCanvas.width = overlayCanvas.width = 640;
depthCanvas.height = overlayCanvas.height = 480;
depthContext.clearRect(0, 0, depthCanvas.width, depthCanvas.height);
overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

var statusSpan = document.getElementById('status');

var fpsCounter = new Stats();
fpsCounter.domElement.style.position = 'absolute';
fpsCounter.domElement.style.top = '0px';
fpsCounter.domElement.style.left = '0px';
document.body.appendChild(fpsCounter.domElement);

var handModule;
var stopped = true;

var showTrackedJoints = true;
var drawExtremePoints = document.getElementById('extremities');
drawExtremePoints.checked = false;
var drawJoints = document.getElementById('joints');
drawJoints.checked = true;
var drawSkeleton = document.getElementById('skeleton');
drawSkeleton.checked = true;
var showDepth = document.getElementById('depthmap');
showDepth.checked = true;
var lineWidth = 3;

function runPipeline() {
  handModule.process().then(
      function() {
        updateDepth();
        updateHandData();
        fpsCounter.update();
        if (!stopped)
          runPipeline();
      },
      function(e) {
        statusSpan.innerHTML = e.message;
      }
  );
}

function render() {
  renderDepth();
  renderHandData();

  requestAnimationFrame(render);
}

var depthData = {
  needsUpdate: false,
  image: null
};

function updateDepth() {
  if (!showDepth.checked) {
    return;
  }
  handModule.getSample().then(
      function(sample) {
        depthData.image = sample.depth;
        depthData.needsUpdate = true;
      },
      handleError
  );
}

function renderDepth() {
  if (!showDepth.checked || depthData.needsUpdate === false) {
    return;
  }
  depthContext.clearRect(0, 0, depthCanvas.width, depthCanvas.height);
  var depthImage = depthData.image;
  if (depthImage.width != depthCanvas.width || depthImage.height != depthCanvas.height) {
    depthCanvas.width = depthImage.width;
    depthCanvas.height = depthImage.height;
    depthContext = depthCanvas.getContext('2d');
    overlayCanvas.width = depthImage.width;
    overlayCanvas.height = depthImage.height;
    overlayContext = overlayCanvas.getContext('2d');
    statusSpan.innerHTML = 'depth image (' +
        depthImage.width + 'x' + depthImage.height + ')';
  }
  var imageData = depthContext.createImageData(depthImage.width, depthImage.height);
  RSUtils.ConvertDepthToRGBUsingHistogram(
      depthImage, [255, 255, 255], [0, 0, 0], imageData.data);
  depthContext.putImageData(imageData, 0, 0);
  depthData.needsUpdate = false;
}

function checkRenderHandData() {
  return (drawSkeleton.checked || drawExtremePoints.checked || drawJoints.checked);
}

var isRenderHandData = checkRenderHandData();


var jointsData = {
  needsToRender: false,
  jointsArray: null
};

function updateJointsData(hands) {
  if (!(drawJoints.checked || drawSkeleton.checked))
    return;
  var numOfHandsToUpdate = hands.length;
  var jointsArray = [];
  for (var index in hands) {
    var hand = hands[index];
    hand.getTrackedJoints().then(
        function(joints) {
          jointsArray.push(joints);
          numOfHandsToUpdate--;
          if (numOfHandsToUpdate === 0) {
            jointsData.needsToRender = true;
            jointsData.jointsArray = jointsArray;
          }
        },
        handleError
    );
  }
}

function updateHandData() {
  handModule.getHands().then(
      function(hands) {
        updateJointsData(hands);
      },
      handleError
  );
}

function drawArc(center, radius, color) {
  overlayContext.strokeStyle = color;
  overlayContext.lineWidth = lineWidth;
  overlayContext.beginPath();
  overlayContext.arc(center.x, center.y, radius, 0, Math.PI * 2, true);
  overlayContext.stroke();
}

function renderJointsData() {
  if (!(drawJoints.checked || drawSkeleton.checked) || !jointsData.needsToRender)
    return;
  overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  for (var i in jointsData.jointsArray) {
    var joints = jointsData.jointsArray[i];
    if (drawSkeleton.checked) {
      overlayContext.strokeStyle = 'rgb(51,153,255)';
      overlayContext.lineWidth = 3;
      function drawFingerSkeleton(wrist, finger) {
        overlayContext.beginPath();
        overlayContext.moveTo(wrist.positionImage.x, wrist.positionImage.y);
        overlayContext.lineTo(finger.base.positionImage.x, finger.base.positionImage.y);
        overlayContext.moveTo(finger.base.positionImage.x, finger.base.positionImage.y);
        overlayContext.lineTo(finger.joint1.positionImage.x, finger.joint1.positionImage.y);
        overlayContext.moveTo(finger.joint1.positionImage.x, finger.joint1.positionImage.y);
        overlayContext.lineTo(finger.joint2.positionImage.x, finger.joint2.positionImage.y);
        overlayContext.moveTo(finger.joint2.positionImage.x, finger.joint2.positionImage.y);
        overlayContext.lineTo(finger.tip.positionImage.x, finger.tip.positionImage.y);
        overlayContext.moveTo(finger.tip.positionImage.x, finger.tip.positionImage.y);
        overlayContext.stroke();
      }
      drawFingerSkeleton(joints.wrist, joints.thumb);
      drawFingerSkeleton(joints.wrist, joints.index);
      drawFingerSkeleton(joints.wrist, joints.middle);
      drawFingerSkeleton(joints.wrist, joints.ring);
      drawFingerSkeleton(joints.wrist, joints.pinky);
    }

    if (drawJoints.checked) {
      var radius = 2;
      drawArc(joints.wrist.positionImage, radius, 'black');
      drawArc(joints.center.positionImage, radius + 4, 'red');
      function drawFingerJoints(finger, radius, color) {
        drawArc(finger.base.positionImage, radius, color);
        drawArc(finger.joint1.positionImage, radius, color);
        drawArc(finger.joint2.positionImage, radius, color);
        drawArc(finger.tip.positionImage, radius + 3, color);
      }
      drawFingerJoints(joints.thumb, radius, 'green');
      drawFingerJoints(joints.index, radius, 'rgb(0,102,204)');
      drawFingerJoints(joints.middle, radius, 'rgb(245,245,0)');
      drawFingerJoints(joints.ring, radius, 'rgb(0,245,245)');
      drawFingerJoints(joints.pinky, radius, 'rgb(255,184,112)');
    }
  }
}

function renderHandData() {
  renderJointsData();
  return;

  

  for (var index in hands) {
    var hand = hands[index];
    if (drawExtremePoints.checked) {
      for (var property in hand.extremityPoints) {
        var radius = 2;
        var point = hand.extremityPoints[property];
        drawArc(point.pointImage, radius, 'red');
      }
    }
    if (drawJoints.checked || drawSkeleton.checked) {
      var joints = trackedJoints;
      if (joints === null)
        return;
      if (drawSkeleton.checked) {
        overlayContext.strokeStyle = 'rgb(51,153,255)';
        overlayContext.lineWidth = 3;
        function drawFingerSkeleton(wrist, finger) {
          overlayContext.beginPath();
          overlayContext.moveTo(wrist.positionImage.x, wrist.positionImage.y);
          overlayContext.lineTo(finger.base.positionImage.x, finger.base.positionImage.y);
          overlayContext.moveTo(finger.base.positionImage.x, finger.base.positionImage.y);
          overlayContext.lineTo(finger.joint1.positionImage.x, finger.joint1.positionImage.y);
          overlayContext.moveTo(finger.joint1.positionImage.x, finger.joint1.positionImage.y);
          overlayContext.lineTo(finger.joint2.positionImage.x, finger.joint2.positionImage.y);
          overlayContext.moveTo(finger.joint2.positionImage.x, finger.joint2.positionImage.y);
          overlayContext.lineTo(finger.tip.positionImage.x, finger.tip.positionImage.y);
          overlayContext.moveTo(finger.tip.positionImage.x, finger.tip.positionImage.y);
          overlayContext.stroke();
        }
        drawFingerSkeleton(joints.wrist, joints.thumb);
        drawFingerSkeleton(joints.wrist, joints.index);
        drawFingerSkeleton(joints.wrist, joints.middle);
        drawFingerSkeleton(joints.wrist, joints.ring);
        drawFingerSkeleton(joints.wrist, joints.pinky);
      }

      if (drawJoints.checked) {
        var radius = 2;
        drawArc(joints.wrist.positionImage, radius, 'black');
        drawArc(joints.center.positionImage, radius + 4, 'red');
        function drawFingerJoints(finger, radius, color) {
          drawArc(finger.base.positionImage, radius, color);
          drawArc(finger.joint1.positionImage, radius, color);
          drawArc(finger.joint2.positionImage, radius, color);
          drawArc(finger.tip.positionImage, radius + 3, color);
        }
        drawFingerJoints(joints.thumb, radius, 'green');
        drawFingerJoints(joints.index, radius, 'rgb(0,102,204)');
        drawFingerJoints(joints.middle, radius, 'rgb(245,245,0)');
        drawFingerJoints(joints.ring, radius, 'rgb(0,245,245)');
        drawFingerJoints(joints.pinky, radius, 'rgb(255,184,112)');
      }
    }
  }
}

function handleError(e) {
  statusSpan.innerHTML = e.message + ' ' + Date.now();
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

  render();
}
