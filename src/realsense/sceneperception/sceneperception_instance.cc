// Copyright (c) 2015 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include <string>
#include <sstream>

#include "realsense/sceneperception/sceneperception_instance.h"

#include "base/json/json_string_value_serializer.h"
#include "base/values.h"
#include "realsense/sceneperception/sceneperception.h"
#include "realsense/sceneperception/sceneperception_object.h"

namespace realsense {
namespace sceneperception {

using namespace realsense::common; // NOLINT
using realsense::jsapi::sceneperception::ScenePerceptionConstructor::Params;

ScenePerceptionInstance::ScenePerceptionInstance()
    : handler_(this),
      store_(&handler_),
      sp_ext_thread_("SPExtensionThread") {
  sp_ext_thread_.Start();
  handler_.Register("scenePerceptionConstructor",
      base::Bind(&ScenePerceptionInstance::OnScenePerceptionConstructor,
                 base::Unretained(this)));
}

ScenePerceptionInstance::~ScenePerceptionInstance() {
  sp_ext_thread_.Stop();
}

void ScenePerceptionInstance::HandleSyncMessage(const char* msg) {
  NOTIMPLEMENTED();
}

void ScenePerceptionInstance::HandleMessage(const char* msg) {
  JSONStringValueDeserializer str_deserializer(msg);

  int error_code = 0;
  std::string error_message;
  scoped_ptr<base::Value> value(
      str_deserializer.Deserialize(&error_code, &error_message));
  CHECK(value.get());
  CHECK_EQ(0, error_code);
  CHECK(error_message.empty());

  sp_ext_thread_.message_loop()->PostTask(
      FROM_HERE,
      base::Bind(&ScenePerceptionInstance::OnHandleMessage,
                 base::Unretained(this),
                 base::Passed(&value)));
}

void ScenePerceptionInstance::OnHandleMessage(scoped_ptr<base::Value> msg) {
  DCHECK_EQ(sp_ext_thread_.message_loop(), base::MessageLoop::current());
  handler_.HandleMessage(msg.Pass());
}

void ScenePerceptionInstance::OnScenePerceptionConstructor(
    scoped_ptr<XWalkExtensionFunctionInfo> info) {
  DCHECK_EQ(sp_ext_thread_.message_loop(), base::MessageLoop::current());
  scoped_ptr<Params> params(Params::Create(*info->arguments()));

  scoped_ptr<BindingObject> obj(new ScenePerceptionObject());
  store_.AddBindingObject(params->object_id, obj.Pass());
}

}  // namespace sceneperception
}  // namespace realsense