// Copyright 2015 Intel Corporation. All rights reserved.
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

class HandModuleObject
    : public xwalk::common::EventTarget {
 public:
  HandModuleObject();
  ~HandModuleObject() override;

  // EventTarget implementation.
  void StartEvent(const std::string& type) override;
  void StopEvent(const std::string& type) override;

 private:
  void OnStart(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);
  void OnStop(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);
  void OnGetSample(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);
  void OnGetOutput(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);

  // Run on hand_module_thread_
  void OnStartPipeline(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);
  void OnRunPipeline();
  void OnStopPipeline(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);
  void OnGetSampleOnPipeline(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);
  void OnGetOutputOnPipeline(
      scoped_ptr<xwalk::common::XWalkExtensionFunctionInfo> info);

  // Run on hand extension thread
  bool Init();
  void Destroy();

  // Run on hand_module_thread_
  void CreateSampleImages();
  void ReleasePipelineResources();

  // Run on hand_module_thread_
  void StopHandModuleThread();
  // Run on hand extension thread
  void OnStopHandModuleThread();

  size_t CalculateBinaryMessageSize();
  void DispatchErrorEvent(const ErrorCode& error, const std::string& message);

  enum State {
    NOT_READY,
    IDLE,
    TRACKING,
  };
  State state_;

  bool on_sampleprocessed_;
  bool on_error_;
  bool on_alert_;

  base::Thread hand_module_thread_;
  scoped_refptr<base::MessageLoopProxy> message_loop_;

  PXCSession* session_;
  PXCSenseManager* sense_manager_;
  PXCHandModule* hand_module_;
  PXCHandData* hand_output_;
  PXCHandConfiguration* hand_config_;
  PXCImage* depth_image_;

  scoped_ptr<uint8[]> binary_message_;
  size_t binary_message_size_;
};

}  // namespace hand
}  // namespace realsense

#endif  // REALSENSE_HAND_WIN_HAND_MODULE_OBJECT_H_
