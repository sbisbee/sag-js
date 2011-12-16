NODE := "node"

BUILD_DIR := "./build"
SRC_DIR := "./src"
TESTS_DIR := "./tests"

JSHINT_FILE := "${BUILD_DIR}/jshint.js"

hint:
	@@for file in `ls ${SRC_DIR}/*.js ${TESTS_DIR}/*.js`; do \
		echo "Hinting: $$file"; \
		${NODE} ${JSHINT_FILE} $$file; \
		echo "--------------------------"; \
	done
