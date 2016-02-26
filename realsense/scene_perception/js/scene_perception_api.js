// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var ScenePerception = function(objectId) {
  common.BindingObject.call(this, common.getUniqueId());
  common.EventTarget.call(this);

  if (objectId == undefined)
    internal.postMessage('scenePerceptionConstructor', [this._id]);


  function wrapSampleReturns(data) {
    const BYTES_PER_INT = 4;
    const BYTES_OF_RGBA = 4;
    var int32Array = new Int32Array(data, 0, 5);
    var cWidth = int32Array[1];
    var cHeight = int32Array[2];
    var dWidth = int32Array[3];
    var dHeight = int32Array[4];
    var headerOffset = 5 * BYTES_PER_INT;
    var cByteLength = cWidth * cHeight * BYTES_OF_RGBA;
    var color = new Uint8Array(data, headerOffset, cByteLength);
    var depth = new Uint16Array(data, headerOffset + cByteLength, dWidth * dHeight);
    return {color: {width: cWidth, height: cHeight, data: color},
      depth: {width: dWidth, height: dHeight, data: depth}};
  };

  function wrapVolumePreviewReturn(data) {
    const BYTES_PER_INT = 4;
    const BYTES_OF_RGBA = 4;
    var int32Array = new Int32Array(data, 0, 3);
    var width = int32Array[1];
    var height = int32Array[2];
    var headerOffset = 3 * BYTES_PER_INT;
    var preview = new Uint8Array(data, headerOffset, width * height * BYTES_OF_RGBA);
    return {width: width, height: height, data: preview};
  };

  function wrapMeshDataReturn(data) {
    // MeshData layout
    // NumBlockMesh: int32
    // NumVertices: int32
    // NumFaces: int32
    // BlockMesh Array
    // Vertices Array (Float32Array)
    // Faces Array (Int32Array)
    // Colors Array (Uint8Array)

    // BlockMesh layout
    // MeshId: int32
    // VertexStartIndex: int32
    // NumVertices: int32
    // FaceStartIndex: int32
    // NumFaces: int32
    const BYTES_PER_INT = 4;
    const BYTES_PER_FLOAT = 4;
    const BYTES_PER_SHORT = 2;
    var int32Array = new Int32Array(data, 0, 4);
    var numberOfBlockMesh = int32Array[1];
    var numberOfVertices = int32Array[2];
    var numberOfFaces = int32Array[3];
    var blockMeshes = [];
    var headerBytesLength = 4 * BYTES_PER_INT;
    var blockMeshIntLength = 5;
    var blockMeshesArray =
        new Int32Array(data, headerBytesLength, numberOfBlockMesh * blockMeshIntLength);
    for (var i = 0; i < numberOfBlockMesh; ++i) {
      var blockMesh = {
        meshId: blockMeshesArray[i * blockMeshIntLength],
        vertexStartIndex: blockMeshesArray[i * blockMeshIntLength + 1],
        numVertices: blockMeshesArray[i * blockMeshIntLength + 2],
        faceStartIndex: blockMeshesArray[i * blockMeshIntLength + 3],
        numFaces: blockMeshesArray[i * blockMeshIntLength + 4]
      };
      blockMeshes.push(blockMesh);
    }
    var verticesOffset =
        headerBytesLength + numberOfBlockMesh * blockMeshIntLength * BYTES_PER_INT;
    var vertices =
        new Float32Array(data,
                         verticesOffset,
                         numberOfVertices * 4);
    var facesOffset = verticesOffset + numberOfVertices * 4 * BYTES_PER_FLOAT;
    var faces =
        new Uint16Array(data,
                       facesOffset,
                       numberOfFaces * 3);
    var colorsOffset = facesOffset + numberOfFaces * 3 * BYTES_PER_SHORT;
    var colors =
        new Uint8Array(data,
                       colorsOffset,
                       numberOfVertices * 3);
    return {blockMeshes: blockMeshes,
      numberOfVertices: numberOfVertices,
      vertices: vertices,
      colors: colors,
      numberOfFaces: numberOfFaces,
      faces: faces};
  }

  function wrapVoxelsReturn(data) {
    // The format:
    //   CallbackID(int32),
    //   dataPending(int32),
    //   numberOfSurfaceVoxels(int32),
    //   hasColorData(int32, whether the color data is available),
    //   centerOfsurface_voxels_data_(Point3D[])
    //   surfaceVoxelsColorData(unit8[], 3 * BYTE,  RGB for each voxel)
    const BYTES_PER_INT = 4;
    const BYTES_PER_FLOAT = 4;
    var int32Array = new Int32Array(data, 0, 4);
    var dataPending = int32Array[1];
    var numberOfVoxels = int32Array[2];
    var hasColorData = int32Array[3];
    var voxelsOffset = 4 * BYTES_PER_INT;
    var voxels = new Float32Array(data, voxelsOffset, numberOfVoxels * 3);
    var colorData = null;
    if (hasColorData) {
      var colorDataOffset = voxelsOffset + numberOfVoxels * 3 * BYTES_PER_FLOAT;
      colorData = new Uint8Array(data, colorDataOffset, numberOfVoxels * 3);
    }

    return {
      dataPending: dataPending,
      centerOfSurfaceVoxels: voxels,
      numberOfSurfaceVoxels: numberOfVoxels,
      surfaceVoxelsColor: colorData

    };
  }

  function wrapMeshFileReturn(data) {
    // 1 int32 (4 bytes) value (callback id).
    var dataBuffer = data.slice(4);
    var blob = new Blob([dataBuffer], { type: 'text/plain' });
    return blob;
  }

  function wrapVerticesOrNormalsReturn(data) {
    const BYTES_PER_FLOAT = 4;
    var int32Array = new Int32Array(data, 0, 3);
    var width = int32Array[1];
    var height = int32Array[2];
    var data = new Float32Array(data, 3 * BYTES_PER_FLOAT);
    return {
      width: width,
      height: height,
      data: data
    };
  }

  this._addMethodWithPromise('init');
  this._addMethodWithPromise('reset');
  this._addMethodWithPromise('start');
  this._addMethodWithPromise('stop');
  this._addMethodWithPromise('destroy');

  this._addMethodWithPromise('enableReconstruction');
  this._addMethodWithPromise('enableRelocalization');
  this._addMethodWithPromise('setMeshingResolution');
  this._addMethodWithPromise('setMeshingThresholds');
  this._addMethodWithPromise('setCameraPose');
  this._addMethodWithPromise('setMeshingUpdateConfigs');
  this._addMethodWithPromise('configureSurfaceVoxelsData');
  this._addMethodWithPromise('setMeshingRegion');

  this._addMethodWithPromise('getSample', null, wrapSampleReturns);
  this._addMethodWithPromise('queryVolumePreview', null, wrapVolumePreviewReturn);
  this._addMethodWithPromise('getVertices', null, wrapVerticesOrNormalsReturn);
  this._addMethodWithPromise('getNormals', null, wrapVerticesOrNormalsReturn);
  this._addMethodWithPromise('isReconstructionEnabled');
  this._addMethodWithPromise('getVoxelResolution');
  this._addMethodWithPromise('getVoxelSize');
  this._addMethodWithPromise('getMeshingThresholds');
  this._addMethodWithPromise('getMeshingResolution');
  this._addMethodWithPromise('getMeshData', null, wrapMeshDataReturn);
  this._addMethodWithPromise('getSurfaceVoxels', null, wrapVoxelsReturn);

  this._addMethodWithPromise('saveMesh', null, wrapMeshFileReturn);
  this._addMethodWithPromise('clearMeshingRegion');

  this._addEvent('error');
  this._addEvent('checking');
  this._addEvent('sampleprocessed');
  this._addEvent('meshupdated');
};

ScenePerception.prototype = new common.EventTargetPrototype();
ScenePerception.prototype.constructor = ScenePerception;

exports = new ScenePerception();
