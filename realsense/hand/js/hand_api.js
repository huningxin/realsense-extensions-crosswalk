// Copyright (c) 2016 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var HandModule = function(objectId) {
  common.BindingObject.call(this, objectId ? objectId : common.getUniqueId());

  this._registerLifecycleTracker();

  if (objectId == undefined)
    internal.postMessage('handModuleConstructor', [this._id]);

  function wrapSampleReturns(data) {
    const bytesPerInt32 = 4;
    const bytesPerFloat64 = 8;
    const imageHeaderSize = 3 * bytesPerInt32; // format, width and height
    var offset = bytesPerInt32 * 2; // skip call_id and padding
    var float64View = new Float64Array(data, offset, 1);
    var timeStamp = float64View[0];
    offset += bytesPerFloat64;
    var int32View = new Int32Array(data, offset, imageHeaderSize / bytesPerInt32);
    // color format
    var format = '';
    if (int32View[0] == 1) {
      format = 'RGB32';
    } else if (int32View[0] == 2) {
      format = 'DEPTH';
    }
    // color width, height
    var width = int32View[1];
    var height = int32View[2];
    // color data
    var offset = offset + imageHeaderSize;
    var data = new Uint16Array(data, offset, width * height);
    return {
      timeStamp: timeStamp,
      depth: {format: format, width: width, height: height, data: data}
    };
  }

  function wrapY8ImageReturns(data) {
    // 3 int32 (4 bytes) values.
    var header_byte_offset = 3 * 4;
    var int32_array = new Int32Array(data, 0, 3);
    // int32_array[0] is the callback id.
    var width = int32_array[1];
    var height = int32_array[2];
    var buffer = new Uint8Array(data, header_byte_offset, width * height);
    return { format: 'Y8', width: width, height: height, data: buffer };
  }

  var handModuleObject = this;
  function wrapHandsReturns(hands) {
    var handObjectArray = [];
    for (var i in hands) {
      var handObject = new Hand(handModuleObject, hands[i]);
      handObjectArray.push(handObject);
    }
    return handObjectArray;
  }

  this._addMethodWithPromise('init');
  this._addMethodWithPromise('openDevice');
  this._addMethodWithPromise('closeDevice');
  this._addMethodWithPromise('detect', null, wrapHandsReturns);
  this._addMethodWithPromise('getSample', null, wrapSampleReturns);

  this._addMethodWithPromise('_getSegmentationImageById', null, wrapY8ImageReturns);
};

var Hand = function(handModule, hand) {
  Object.defineProperties(this, {
    'uniqueId' : {
      value: hand.uniqueId,
    },
    'timeStamp': {
      value: hand.timeStamp,
    },
    'calibrated': {
      value: hand.calibrated,
    },
    'bodySide': {
      value: hand.bodySide,
    },
    'boundingBoxImage': {
      value: hand.boundingBoxImage,
    },
    'massCenterImage': {
      value: hand.massCenterImage,
    },
    'palmOrientation': {
      value: hand.palmOrientation,
    },
    'palmRadiusImage': {
      value: hand.palmRadiusImage,
    },
    'palmRadiusWorld': {
      value: hand.palmRadiusWorld,
    },
    'extremityPoints': {
      value: hand.extremityPoints,
    },
    'fingerData': {
      value: hand.fingerData,
    },
    'trackedJoints': {
      value: hand.trackedJoints,
    },
    'trackingStatus': {
      value: hand.trackingStatus,
    },
    'openness': {
      value: hand.openness,
    },
    'normalizedJoints': {
      value: hand.normalizedJoints,
    }
  });

  function addMethod(handObject, name) {
    Object.defineProperty(handObject, name, {
      value: function() {
        debugger;
        return new Promise(function(resolve, reject) {
          handModule['_' + name + 'ById'](hand.uniqueId).then(
            function(result) {
              resolve(result);
            },
            function(error) {
              reject(error);
            }
          );
        });
      }
    });
  };

  addMethod(this, 'getSegmentationImage');
};

HandModule.prototype = new common.EventTargetPrototype();
HandModule.prototype.constructor = HandModule;
exports.HandModule = HandModule;
