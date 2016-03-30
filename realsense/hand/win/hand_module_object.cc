// Copyright (c) 2016 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "realsense/hand/win/hand_module_object.h"

// This file is auto-generated by hand_module.idl
#include "hand_module.h" // NOLINT

#include "base/bind.h"
#include "base/logging.h"
#include "base/strings/sys_string_conversions.h"
#include "base/time/time.h"
#include "realsense/common/win/common_utils.h"

namespace realsense {
namespace hand {

#define PXC_SUCCEEDED(status) (((pxcStatus)(status)) >= PXC_STATUS_NO_ERROR)
#define PXC_FAILED(status) (((pxcStatus)(status)) < PXC_STATUS_NO_ERROR)

#define MESSAGE_TO_METHOD(message, method) \
  handler_.Register( \
      message, base::Bind(&method, base::Unretained(this)));

using namespace realsense::common;  // NOLINT
using namespace realsense::jsapi::hand_module; // NOLINT
using namespace xwalk::common; // NOLINT

HandModuleObject::HandModuleObject()
    : state_(UNINITIALIZED),
      on_sampleprocessed_event_(false),
      on_error_event_(false),
      pipeline_thread_("HandModuleObjectThread"),
      message_loop_(base::MessageLoopProxy::current()),
      pxc_sense_manager_(NULL),
      pxc_hand_data_(NULL),
      pxc_depth_image_(NULL),
      binary_message_size_(0) {
  MESSAGE_TO_METHOD("init", HandModuleObject::OnInit);
  MESSAGE_TO_METHOD("start", HandModuleObject::OnStart);
  MESSAGE_TO_METHOD("stop", HandModuleObject::OnStop);
  MESSAGE_TO_METHOD("getSample", HandModuleObject::OnGetSample);
  MESSAGE_TO_METHOD("getHandData",
                    HandModuleObject::OnGetHandData);
}

HandModuleObject::~HandModuleObject() {
  ReleaseResources();
}

void HandModuleObject::StartEvent(const std::string& type) {
  if (type == std::string("sampleprocessed")) {
    on_sampleprocessed_event_ = true;
  } else if (type == std::string("error")) {
    on_error_event_ = true;
  } else {
    NOTREACHED();
  }
}

void HandModuleObject::StopEvent(const std::string& type) {
  if (type == std::string("sampleprocessed")) {
    on_sampleprocessed_event_ = false;
  } else if (type == std::string("error")) {
    on_error_event_ = false;
  } else {
    NOTREACHED();
  }
}

void HandModuleObject::OnInit(
     scoped_ptr<XWalkExtensionFunctionInfo> info) {
  if (state_ != UNINITIALIZED) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Already initialized."));
    return;
  }

  pxc_sense_manager_ = PXCSenseManager::CreateInstance();
  if (!pxc_sense_manager_) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to create sense manager."));
    ReleaseResources();
    return;
  }

  if (PXC_FAILED(pxc_sense_manager_->EnableHand())) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to enable hand."));
    ReleaseResources();
    return;
  }

  if (!pxc_sense_manager_->QueryHand()) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to query hand."));
    ReleaseResources();
    return;
  }

  state_ = INITIALIZED;
  DLOG(INFO) << "State: UNINITIALIZED to INITIALIZED";

  info->PostResult(CreateSuccessResult());
}

void HandModuleObject::OnStart(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  if (state_ != INITIALIZED) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          state_ == UNINITIALIZED ?
                              "Not initialized." :
                              "Already streaming."));
    return;
  }

  if (PXC_FAILED(pxc_sense_manager_->Init())) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Failed to init sense manager"));
    return;
  }

  CHECK(!pxc_hand_data_);
  pxc_hand_data_ = pxc_sense_manager_->QueryHand()->CreateOutput();
  if (!pxc_hand_data_) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to create hand data."));
    return;
  }

  if (!pxc_sense_manager_->QueryCaptureManager()->QueryDevice()) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to query capture device."));
    return;
  }

  PXCCapture::Device::StreamProfileSet profiles = {};
  if (PXC_FAILED(pxc_sense_manager_->QueryCaptureManager()->QueryDevice()
      ->QueryStreamProfileSet(&profiles))) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to query working profile."));
    return;
  }

  CHECK(profiles.depth.imageInfo.format == PXCImage::PIXEL_FORMAT_DEPTH);
  pxc_depth_image_ = pxc_sense_manager_->QuerySession()->CreateImage(
      &profiles.depth.imageInfo);

  state_ = STREAMING;
  DLOG(INFO) << "State: from INITIALIZED to STREAMING.";

  message_loop_->PostTask(
      FROM_HERE,
      base::Bind(&HandModuleObject::RunPipeline,
                 base::Unretained(this)));

  info->PostResult(CreateSuccessResult());
}

void HandModuleObject::OnStop(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  if (state_ != STREAMING) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Not streaming."));
    return;
  }

  pxc_sense_manager_->Close();

  binary_message_.reset();
  binary_message_size_ = 0;

  if (pxc_depth_image_) {
    pxc_depth_image_->Release();
    pxc_depth_image_ = NULL;
  }
  if (pxc_hand_data_) {
    pxc_hand_data_->Release();
    pxc_hand_data_ = NULL;
  }

  if (PXC_FAILED(pxc_sense_manager_->EnableHand())) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to enable hand."));
    return;
  }

  if (!pxc_sense_manager_->QueryHand()) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Failed to query hand."));
    return;
  }

  state_ = INITIALIZED;
  DLOG(INFO) << "State: from STREAMING to INITIALIZED.";

  info->PostResult(CreateSuccessResult());
}

void HandModuleObject::OnGetSample(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  if (!pxc_depth_image_) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "No sample data."));
    return;
  }

  const int call_id_size = sizeof(int);
  const int padding_size = sizeof(int); // use to keep double 8-bytes aligend.
  const int time_stamp_size = sizeof(double);
  const int image_header_size = 3 * sizeof(int); // format, width, height
  
  CHECK(pxc_depth_image_);
  PXCImage::ImageInfo depth_info = pxc_depth_image_->QueryInfo();
  int depth_image_size =
      depth_info.width * depth_info.height * sizeof(uint16);
  
  size_t binary_message_size = call_id_size + padding_size + time_stamp_size +
      image_header_size + depth_image_size;

  if (binary_message_size_ < binary_message_size) {
    binary_message_.reset(new uint8[binary_message_size]);
    binary_message_size_ = binary_message_size;
  }

  int offset = call_id_size + padding_size;

  double* double_view =
      reinterpret_cast<double*>(binary_message_.get() + offset);
  double_view[0] = sample_processed_time_stamp_;

  offset += time_stamp_size;
  int* int_view = reinterpret_cast<int*>(binary_message_.get() + offset);
  int_view[0] = 2;  // 2 for PixelFormat::PIXEL_FORMAT_DEPTH
  int_view[1] = depth_info.width;
  int_view[2] = depth_info.height;

  PXCImage::ImageData image_data;
  if (PXC_FAILED(pxc_depth_image_->AcquireAccess(
        PXCImage::ACCESS_READ, PXCImage::PIXEL_FORMAT_DEPTH, &image_data))) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Failed to access depth image data."));
    return;
  }

  offset += image_header_size;
  uint16_t* uint16_view =
      reinterpret_cast<uint16_t*>(binary_message_.get() + offset);
  int k = 0;
  for (int y = 0; y < depth_info.height; ++y) {
    for (int x = 0; x < depth_info.width; ++x) {
      uint16_t* depth16 =
          reinterpret_cast<uint16_t*>(
                  image_data.planes[0] + image_data.pitches[0] * y);
          uint16_view[k++] = depth16[x];
    }
  }

  pxc_depth_image_->ReleaseAccess(&image_data);
 
  scoped_ptr<base::ListValue> result(new base::ListValue());
  result->Append(base::BinaryValue::CreateWithCopiedBuffer(
      reinterpret_cast<const char*>(binary_message_.get()),
      binary_message_size_));
  info->PostResult(result.Pass());
}

void HandModuleObject::OnGetHandData(
  scoped_ptr<XWalkExtensionFunctionInfo> info) {
  NOTIMPLEMENTED();
}

void HandModuleObject::RunPipeline() {
  if (state_ != STREAMING) return;

  if (PXC_FAILED(pxc_sense_manager_->AcquireFrame(true))) {
    if (on_error_event_) {
      DispatchErrorEvent(ERROR_CODE_EXEC_FAILED,
                         "Fail to AcquireFrame.");
    }
  }

  if (on_sampleprocessed_event_) {
    PXCCapture::Sample *processed_sample =
        pxc_sense_manager_->QueryHandSample();
    if (processed_sample) {
      if (processed_sample->depth) {
        pxc_depth_image_->CopyImage(processed_sample->depth);
      }
      pxc_hand_data_->Update();
      sample_processed_time_stamp_ = base::Time::Now().ToJsTime();
      SampleProcessedEvent eventData;
      eventData.time_stamp = sample_processed_time_stamp_;
      scoped_ptr<base::ListValue> data(new base::ListValue);
      data->Append(eventData.ToValue().release());
      DispatchEvent("sampleprocessed", data.Pass());
    }
  }

  pxc_sense_manager_->ReleaseFrame();

  message_loop_->PostTask(
      FROM_HERE,
      base::Bind(&HandModuleObject::RunPipeline,
                 base::Unretained(this)));
}

void HandModuleObject::ReleaseResources() {
  binary_message_.reset();
  binary_message_size_ = 0;

  if (pxc_depth_image_) {
    pxc_depth_image_->Release();
    pxc_depth_image_ = NULL;
  }
  if (pxc_hand_data_) {
    pxc_hand_data_->Release();
    pxc_hand_data_ = NULL;
  }
  if (pxc_sense_manager_) {
    pxc_sense_manager_->Close();
    pxc_sense_manager_->Release();
    pxc_sense_manager_ = NULL;
  }
}

void HandModuleObject::DispatchErrorEvent(
    const ErrorCode& error, const std::string& message) {
  RSError rsError;
  rsError.error = error;
  rsError.message = message;
  scoped_ptr<base::ListValue> data(new base::ListValue);
  data->Append(rsError.ToValue().release());
  DispatchEvent("error", data.Pass());
}

}  // namespace hand
}  // namespace realsense
