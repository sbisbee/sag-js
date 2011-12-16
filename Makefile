NODE := "node"

BUILD_DIR := "./build"
SRC_DIR := "./src"
TESTS_DIR := "./tests"

JSHINT_FILE := "${BUILD_DIR}/jshint.js"

NODE_TESTS_DIR := "${TESTS_DIR}/node"

hint:
	@@for file in `ls ${SRC_DIR}/*.js ${TESTS_DIR}/*.js`; do \
		echo "Hinting: $$file"; \
		${NODE} ${JSHINT_FILE} $$file; \
		echo "--------------------------"; \
	done

check:
	@@cd ${NODE_TESTS_DIR} && \
		${NODE} ./run.js && \
		cd - > /dev/null
