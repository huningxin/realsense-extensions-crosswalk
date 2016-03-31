// Copyright 2016 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_
#define REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_

#include <string>

#include "base/message_loop/message_loop_proxy.h"
#include "base/threading/thread.h"
#include "third_party/libpxc/include/pxchanddata.h"
#include "third_party/libpxc/include/pxchandmodule.h"
#include "third_party/libpxc/include/pxcimage.h"
#include "third_party/libpxc/include/pxcsensemanager.h"
#include "xwalk/common/event_target.h"
#include "../../common/common.h"

namespace realsense {
namespace hand {

using realsense::jsapi::common::ErrorCode;
using xwalk::common::XWalkExtensionFunctionInfo;

class HandModuleObject
    : public xwalk::common::BindingObject {
 public:
  HandModuleObject();
  ~HandModuleObject() override;

 private:
  // Message handlers.
  void OnInit(
     scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnOpen(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnClose(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnProcess(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnGetSample(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnGetHandData(
      scoped_ptr<XWalkExtensionFunctionInfo> info);

  // Helpers.
  void ReleaseResources();

 private:
  // UNINITIALIZED --- init() ---> INITIALIZED
  // INITIALIZED   -- open() ---> STREAMING
  // STREAMING     --- close() ---> INITIALIZED
  //
  // new HandModuleObject with UNINITIALIZED state.
  // delete HandModuleObject will release.
  enum State {
    UNINITIALIZED,
    INITIALIZED,
    STREAMING,
  };
  State state_;

  scoped_refptr<base::MessageLoopProxy> message_loop_;

  PXCSenseManager* pxc_sense_manager_;
  PXCHandData* pxc_hand_data_;
  PXCImage* pxc_depth_image_;

  double sample_processed_time_stamp_;

  scoped_ptr<uint8[]> binary_message_;
  size_t binary_message_size_;
};

}  // namespace hand
}  // namespace realsense

#endif  // REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_
