// Copyright 2016 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_
#define REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_

#include <string>

#include "base/message_loop/message_loop_proxy.h"
#include "base/threading/thread.h"
#include "third_party/libpxc/include/pxchandconfiguration.h"
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
    : public xwalk::common::EventTarget {
 public:
  HandModuleObject();
  ~HandModuleObject() override;

  // EventTarget implementation.
  void StartEvent(const std::string& type) override;
  void StopEvent(const std::string& type) override;

 private:
  // Message handlers.
  void OnInit(
     scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnStart(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnStop(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnRelease(
    scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnGetLatestSample(
      scoped_ptr<XWalkExtensionFunctionInfo> info);
  void OnGetLatestHandData(
      scoped_ptr<XWalkExtensionFunctionInfo> info);

  // Execute the pipeline loop.
  void RunPipeline();

  // Helpers.
  void ReleaseResources();
  void DispatchErrorEvent(const ErrorCode& error, const std::string& message);

 private:
  // UNINITIALIZED --- init() ---> INITIALIZED
  // INITIALIZED   -- start() ---> STREAMING
  // STREAMING     --- stop() ---> UNINITIALIZED
  // STREAMING     -- release() -> UNINITIALIZED
  // INITIALIZED   -- release() -> UNINITIALIZED
  //
  // new HandModuleObject with UNINITIALIZED state.
  // delete HandModuleObject will release.
  enum State {
    UNINITIALIZED,
    INITIALIZED,
    STREAMING,
  };
  State state_;

  // To indicate whether the event is being listened.
  bool on_sampleprocessed_event_;
  bool on_error_event_;

  base::Thread pipeline_thread_;
  scoped_refptr<base::MessageLoopProxy> message_loop_;

  PXCSession* pxc_session_;
  PXCSenseManager* pxc_sense_manager_;
  PXCHandModule* pxc_hand_module_;
  PXCHandData* pxc_hand_data_;
  PXCHandConfiguration* pxc_hand_config_;
  PXCImage* pxc_depth_image_;

  double sample_processed_time_stamp_;

  scoped_ptr<uint8[]> binary_message_;
  size_t binary_message_size_;
};

}  // namespace hand
}  // namespace realsense

#endif  // REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_
