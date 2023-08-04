pip install -U openmim
mim install mmengine
mim install "mmcv>=2.0.0"

mim install mmdet
mim install mmdeploy

export TOOL_DIR="mmdeploy/tools/deploy.py"
export DEPLOY_CFG_PATH="mmdeploy/configs/mmdet/detection/detection_onnxruntime_static.py"
export MODEL_CFG_PATH="config.py"
export MODEL_CHECKPOINT_PATH="model.pth"
export INPUT_IMG="demo.jpg"

mkdir -p onnx

export WORK_DIR=onnx

python3.8 ${TOOL_DIR} \
    ${DEPLOY_CFG_PATH} \
    ${MODEL_CFG_PATH} \
    ${MODEL_CHECKPOINT_PATH} \
    ${INPUT_IMG} \
    --work-dir ${WORK_DIR} \
    --log-level INFO \
    --show \
    --dump-info
