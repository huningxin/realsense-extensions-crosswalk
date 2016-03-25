// Copyright (c) 2016 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var HandModule = function(object_id) {
  common.BindingObject.call(this, object_id ? object_id : common.getUniqueId());
  common.EventTarget.call(this);

  if (object_id == undefined)
    internal.postMessage('faceModuleConstructor', [this._id]);

  function wrapSampleReturns(data) {
    var int32_array = new Int32Array(data, 0, 4);
    // color format
    var color_format = '';
    if (int32_array[1] == 1) {
      color_format = 'RGB32';
    } else if (int32_array[1] == 2) {
      color_format = 'DEPTH';
    }
    // color width, height
    var color_width = int32_array[2];
    var color_height = int32_array[3];
    // color data
    var offset = 4 * 4; // 4 int32(4 bytes)
    var color_data =
        new Uint8Array(data, offset, color_width * color_height * 4);
    offset = offset + color_width * color_height * 4;

    int32_array = new Int32Array(data, offset, 3);
    // depth format
    var depth_format = '';
    if (int32_array[0] == 1) {
      depth_format = 'RGB32';
    } else if (int32_array[0] == 2) {
      depth_format = 'DEPTH';
    }
    // depth width, height
    var depth_width = int32_array[1];
    var depth_height = int32_array[2];
    // depth data
    var offset = offset + 3 * 4; // 3 int32(4 bytes)
    var depth_data =
        new Uint16Array(data, offset, depth_width * depth_height);
    offset = offset + depth_width * depth_height * 2;

    return {
      depth: depth_image_value,
    };
  }

  this._addMethodWithPromise('start');
  this._addMethodWithPromise('stop');
  this._addMethodWithPromise('getSample', null, wrapSampleReturns);
  this._addMethodWithPromise('getOutput');

  var HandErrorEvent = function(type, data) {
    this.type = type;

    if (data) {
      this.error = data.error;
      this.message = data.message;
    }
  };
  this._addEvent('error', HandErrorEvent);

  this._addEvent('sampleprocessed');
  this._addEvent('ready');
  this._addEvent('ended');
};

HandModule.prototype = new common.EventTargetPrototype();
HandModule.prototype.constructor = HandModule;
exports.HandModule = HandModule;
