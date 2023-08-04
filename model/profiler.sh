export PROFILER_TOOL_DIR="mmdeploy/tools/profiler.py"
export ONNX_MODEL="onnx/end2end.onnx"

python3.8 ${PROFILER_TOOL_DIR} \
    ${DEPLOY_CFG_PATH} \
    ${MODEL_CFG_PATH} \
    ${INPUT_IMG} \
    --model ${ONNX_MODEL}
