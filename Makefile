NODE := "node"
UGLIFY := "uglifyjs"

VERSION := "0.1.0"

BUILD_DIR := "./build"
SRC_DIR := "./src"
TESTS_DIR := "./tests"
DIST_DIR := "./sag-js-${VERSION}"

JSHINT_FILE := "${BUILD_DIR}/jshint.js"
POSTPROC := "${BUILD_DIR}/postproc.js"

NODE_TESTS_DIR := "${TESTS_DIR}/node"

DIST_FILES := ./src/sag.js LICENSE NOTICE README CHANGELOG

UGLIFY_OPTS := "--unsafe"

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

dist:
	@@mkdir ${DIST_DIR}
	@@cp ${DIST_FILES} ${DIST_DIR}
	@@mv ${DIST_DIR}/sag.js ${DIST_DIR}/sag-${VERSION}.js
	@@cp package.json ${DIST_DIR}
	@@sed -i -e '/"main":/s/sag\.js/sag-0.1.0.js/' -e '/"version":/s/UNRELEASED/0.1.0/' ${DIST_DIR}/package.json
	@@for file in `ls ${DIST_DIR}/*.js`; do \
		fileMin=`echo $$file | sed -e 's/\.js/.min.js/'` ; \
		echo "Minifying $$file => $$fileMin" ; \
		${UGLIFY} ${UGLIFY_OPTS} $$file > $$fileMin ; \
		echo "Post Processing $$file" ; \
		${NODE} ${POSTPROC} $$file ${VERSION} ; \
		echo "Post Processing $$fileMin" ; \
		${NODE} ${POSTPROC} $$fileMin ${VERSION} ; \
	done
	@@tar -zcvvf ${DIST_DIR}.tar ${DIST_DIR}

clean:
	@@rm -rf ${DIST_DIR}*
