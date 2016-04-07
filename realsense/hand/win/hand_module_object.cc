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

inline void PopulatePoint2D(Point2D& js_point_2d,
                            const PXCPointF32& pxc_point_2d) {
  js_point_2d.x = pxc_point_2d.x;
  js_point_2d.y = pxc_point_2d.y;
}

inline void PopulatePoint3D(Point3D& js_point_3d,
                            const PXCPoint3DF32& pxc_point_3d) {
  js_point_3d.x = pxc_point_3d.x;
  js_point_3d.y = pxc_point_3d.y;
  js_point_3d.z = pxc_point_3d.z;
}

inline void PopulatePoint4D(Point4D& js_point_4d,
                            const PXCPoint4DF32& pxc_point_4d) {
  js_point_4d.x = pxc_point_4d.x;
  js_point_4d.y = pxc_point_4d.y;
  js_point_4d.z = pxc_point_4d.z;
  js_point_4d.w = pxc_point_4d.w;
}

inline void PopulateJointData(JointData& js_joint_data,
                              const PXCHandData::JointData& pxc_joint_data) {
  js_joint_data.confidence = pxc_joint_data.confidence;
  PopulatePoint3D(js_joint_data.position_world, pxc_joint_data.positionWorld);
  PopulatePoint3D(js_joint_data.position_image, pxc_joint_data.positionImage);
  PopulatePoint4D(js_joint_data.local_rotation, pxc_joint_data.localRotation);
  PopulatePoint4D(js_joint_data.global_orientation,
                  pxc_joint_data.globalOrientation);
  PopulatePoint3D(js_joint_data.speed, pxc_joint_data.speed);
}

#define POPULATE_FINGER_JOINTS(Type, type, FINGER, finger) \
  pxc_hand->Query##Type##Joint(PXCHandData::JOINT_##FINGER##_BASE, \
                              pxc_joint_data); \
  PopulateJointData(js_hand_data.##type##_joints.##finger##.base, pxc_joint_data); \
  pxc_hand->Query##Type##Joint(PXCHandData::JOINT_##FINGER##_JT1, \
                              pxc_joint_data); \
  PopulateJointData(js_hand_data.##type##_joints.##finger##.joint1, \
                    pxc_joint_data); \
  pxc_hand->Query##Type##Joint(PXCHandData::JOINT_##FINGER##_JT2, \
                              pxc_joint_data); \
  PopulateJointData(js_hand_data.##type##_joints.##finger##.joint2, \
                    pxc_joint_data);\
  pxc_hand->Query##Type##Joint(PXCHandData::JOINT_##FINGER##_TIP, \
                              pxc_joint_data); \
  PopulateJointData(js_hand_data.##type##_joints.##finger##.tip, pxc_joint_data);

#define POPULATE_HAND_JOINTS(Type, type) { \
  PXCHandData::JointData pxc_joint_data; \
  pxc_hand->Query##Type##Joint(PXCHandData::JOINT_WRIST, pxc_joint_data); \
  PopulateJointData(js_hand_data.##type##_joints.wrist, pxc_joint_data); \
  pxc_hand->Query##Type##Joint(PXCHandData::JOINT_CENTER, pxc_joint_data); \
  PopulateJointData(js_hand_data.##type##_joints.center, pxc_joint_data); \
  POPULATE_FINGER_JOINTS(Type, type, THUMB, thumb); \
  POPULATE_FINGER_JOINTS(Type, type, INDEX, index); \
  POPULATE_FINGER_JOINTS(Type, type, MIDDLE, middle); \
  POPULATE_FINGER_JOINTS(Type, type, RING, ring); \
  POPULATE_FINGER_JOINTS(Type, type, PINKY, pinky); \
}

#define COVERT_ENUM(TYPE) \
  case PXCHandData::##TYPE : return TYPE;

inline BodySide ConvertBodySide(const PXCHandData::BodySideType pxc_body_side) {
  switch(pxc_body_side) {
    COVERT_ENUM(BODY_SIDE_UNKNOWN);
    COVERT_ENUM(BODY_SIDE_LEFT);
    COVERT_ENUM(BODY_SIDE_RIGHT);
    default: return BODY_SIDE_NONE;
  }
}

inline void PopulateRect(Rect& js_rect, const PXCRectI32& pxc_rect) {
  js_rect.x = pxc_rect.x;
  js_rect.y = pxc_rect.y;
  js_rect.w = pxc_rect.w;
  js_rect.h = pxc_rect.h;
}

inline void PopulateExtremityData(
    ExtremityData& js_extremity_data,
    const PXCHandData::ExtremityData& pxc_extremity_data) {
  PopulatePoint3D(js_extremity_data.point_image,
                  pxc_extremity_data.pointImage);
  PopulatePoint3D(js_extremity_data.point_world,
                  pxc_extremity_data.pointWorld);
}

#define POPULATE_EXTREMETY_DATA(TYPE, type) \
  pxc_hand->QueryExtremityPoint(PXCHandData::EXTREMITY_##TYPE, \
                                pxc_extremity_data); \
  PopulateExtremityData(js_hand_data.extremity_points.##type, \
                        pxc_extremity_data);

#define POPULATE_EXTREMITY_POINTS { \
  PXCHandData::ExtremityData pxc_extremity_data; \
  POPULATE_EXTREMETY_DATA(CLOSEST, closest); \
  POPULATE_EXTREMETY_DATA(LEFTMOST, leftmost); \
  POPULATE_EXTREMETY_DATA(RIGHTMOST, rightmost); \
  POPULATE_EXTREMETY_DATA(TOPMOST, topmost); \
  POPULATE_EXTREMETY_DATA(BOTTOMMOST, bottommost); \
  POPULATE_EXTREMETY_DATA(CENTER, center); \
}

inline void PopluateFingerData(FingerData& js_finger_data,
                        const PXCHandData::FingerData& pxc_finger_data) {
  js_finger_data.folderness = pxc_finger_data.foldedness;
  js_finger_data.radius = pxc_finger_data.radius;
}

#define POPULATE_FINGER_DATA(TYPE, type) \
  pxc_hand->QueryFingerData(PXCHandData::FINGER_##TYPE, \
                            pxc_finger_data); \
  PopluateFingerData(js_hand_data.finger_data.##type, pxc_finger_data);

#define POPULATE_FINGERS { \
  PXCHandData::FingerData pxc_finger_data; \
  POPULATE_FINGER_DATA(THUMB, thumb); \
  POPULATE_FINGER_DATA(INDEX, index); \
  POPULATE_FINGER_DATA(MIDDLE, middle); \
  POPULATE_FINGER_DATA(RING, ring); \
  POPULATE_FINGER_DATA(PINKY, pinky); \
}

inline TrackingStatus ConvertTrackingStatus(
    const pxcI32& pxc_tracking_status) {
  switch(pxc_tracking_status) {
    COVERT_ENUM(TRACKING_STATUS_GOOD);
    COVERT_ENUM(TRACKING_STATUS_OUT_OF_FOV);
    COVERT_ENUM(TRACKING_STATUS_OUT_OF_RANGE);
    COVERT_ENUM(TRACKING_STATUS_HIGH_SPEED);
    COVERT_ENUM(TRACKING_STATUS_POINTING_FINGERS);
    default: return TRACKING_STATUS_NONE;
  }
}

HandModuleObject::HandModuleObject()
    : state_(UNINITIALIZED),
      message_loop_(base::MessageLoopProxy::current()),
      pxc_sense_manager_(NULL),
      pxc_hand_data_(NULL),
      pxc_depth_image_(NULL),
      binary_message_size_(0) {
  MESSAGE_TO_METHOD("init", HandModuleObject::OnInit);
  MESSAGE_TO_METHOD("open", HandModuleObject::OnOpen);
  MESSAGE_TO_METHOD("close", HandModuleObject::OnClose);
  MESSAGE_TO_METHOD("process", HandModuleObject::OnProcess);
  MESSAGE_TO_METHOD("getSample", HandModuleObject::OnGetSample);
  MESSAGE_TO_METHOD("getHands", HandModuleObject::OnGetHands);
  MESSAGE_TO_METHOD("_getHandDataById",
                    HandModuleObject::OnGetHandDataById);
}

HandModuleObject::~HandModuleObject() {
  ReleaseResources();
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

void HandModuleObject::OnOpen(
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

  info->PostResult(CreateSuccessResult());
}

void HandModuleObject::OnClose(
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

void HandModuleObject::OnProcess(
  scoped_ptr<XWalkExtensionFunctionInfo> info) {
  if (state_ != STREAMING) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_INIT_FAILED,
                          "Not streaming."));
    return;
  }

  if (PXC_FAILED(pxc_sense_manager_->AcquireFrame(true))) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Fail to AcquireFrame."));
    return;
  }

  PXCCapture::Sample *processed_sample =
      pxc_sense_manager_->QueryHandSample();
  if (processed_sample) {
    if (processed_sample->depth) {
      pxc_depth_image_->CopyImage(processed_sample->depth);
    }
    sample_processed_time_stamp_ = base::Time::Now().ToJsTime();
  } else {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Fail to query hand sample."));
    return;
  }

  if (PXC_FAILED(pxc_hand_data_->Update())) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Fail to update hand data."));
    return;
  }

  pxc_sense_manager_->ReleaseFrame();

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

void HandModuleObject::OnGetHands(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  if (!pxc_hand_data_) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "No hand data."));
    return;
  }

  std::vector<linked_ptr<Hand> > js_hands;

  int number_of_hands = pxc_hand_data_->QueryNumberOfHands();
  for (int i = 0; i < number_of_hands; ++i) {
    PXCHandData::IHand* pxc_hand = NULL;
    if (PXC_FAILED(pxc_hand_data_->QueryHandData(
        PXCHandData::AccessOrderType::ACCESS_ORDER_BY_TIME,
        i, pxc_hand))) {
      continue;
    }
    linked_ptr<Hand> js_hand(new Hand);
    
    js_hand->unique_id = pxc_hand->QueryUniqueId();
    js_hand->time_stamp = pxc_hand->QueryTimeStamp();

    js_hands.push_back(js_hand);
  }

  info->PostResult(GetHands::Results::Create(js_hands));
}

void HandModuleObject::OnGetHandDataById(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  scoped_ptr<GetHandDataById::Params> params(
      GetHandDataById::Params::Create(*info->arguments()));
  if (!params) {
    info->PostResult(CreateErrorResult(ERROR_CODE_PARAM_UNSUPPORTED));
    return;
  }

  if (!pxc_hand_data_) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "No hand data."));
    return;
  }

  PXCHandData::IHand* pxc_hand = NULL;
  if (PXC_FAILED(pxc_hand_data_->QueryHandDataById(
      params->unique_id, pxc_hand))) {
    info->PostResult(
        CreateErrorResult(ERROR_CODE_EXEC_FAILED,
                          "Cannot get hand data by id."));
    return;
  }
 
  HandData js_hand_data;
    
  js_hand_data.calibrated = pxc_hand->IsCalibrated() ? true : false;
  js_hand_data.body_side = ConvertBodySide(pxc_hand->QueryBodySide());
  PopulateRect(js_hand_data.bounding_box_image,
                pxc_hand->QueryBoundingBoxImage());
  PopulatePoint2D(js_hand_data.mass_center_image,
                  pxc_hand->QueryMassCenterImage());
  PopulatePoint3D(js_hand_data.mass_center_world,
                  pxc_hand->QueryMassCenterWorld());
  PopulatePoint4D(js_hand_data.palm_orientation,
                  pxc_hand->QueryPalmOrientation());
  js_hand_data.palm_radius_image = pxc_hand->QueryPalmRadiusImage();
  js_hand_data.palm_radius_world = pxc_hand->QueryPalmRadiusWorld();
  POPULATE_EXTREMITY_POINTS;
  POPULATE_FINGERS;
  if (pxc_hand->HasTrackedJoints())
    POPULATE_HAND_JOINTS(Tracked, tracked);
  js_hand_data.tracking_status =
      ConvertTrackingStatus(pxc_hand->QueryTrackingStatus());
  js_hand_data.openness = pxc_hand->QueryOpenness();
  if (pxc_hand->HasNormalizedJoints())
    POPULATE_HAND_JOINTS(Normalized, normalized);
    

  info->PostResult(GetHandDataById::Results::Create(js_hand_data));
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

}  // namespace hand
}  // namespace realsense