NODE := "node"
UGLIFY := "uglifyjs"

VERSION := "0.1.0"

BUILD_DIR := "./build"
SRC_DIR := "./src"
TESTS_DIR := "./tests"
DIST_NODE_DIR := "./dist-node"
DIST_BROWSER_DIR := "./dist-browser"

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

min:
	@@${UGLIFY}

dist-node:
	@@mkdir ${DIST_NODE_DIR}
	@@cp ${DIST_FILES} ${DIST_NODE_DIR}
	@@mv ${DIST_NODE_DIR}/sag.js ${DIST_NODE_DIR}/sag-${VERSION}.js
	@@echo "Post Processing ${DIST_NODE_DIR}/sag-${VERSION}.js"
	@@${NODE} ${POSTPROC} ${DIST_NODE_DIR}/sag-${VERSION}.js ${VERSION}
	@@cp package.json ${DIST_NODE_DIR}
	@@sed -i -e '/"main":/s/sag\.js/sag-0.1.0.js/' -e '/"version":/s/UNRELEASED/0.1.0/' ${DIST_NODE_DIR}/package.json

dist-browser:
	@@mkdir ${DIST_BROWSER_DIR}
	@@cp ${DIST_FILES} ${DIST_BROWSER_DIR}
	@@mv ${DIST_BROWSER_DIR}/sag.js ${DIST_BROWSER_DIR}/sag-${VERSION}.js
	@@for file in `ls ${DIST_BROWSER_DIR}/*.js`; do \
		fileMin=`echo $$file | sed -e 's/\.js/.min.js/'` ; \
		echo "Minifying $$file => $$fileMin" ; \
		${UGLIFY} ${UGLIFY_OPTS} $$file > $$fileMin ; \
		echo "Post Processing $$file" ; \
		${NODE} ${POSTPROC} $$file ${VERSION} ; \
		echo "Post Processing $$fileMin" ; \
		${NODE} ${POSTPROC} $$fileMin ${VERSION} ; \
	done

dist: dist-node dist-browser

clean:
	@@rm -rf ${DIST_NODE_DIR} ${DIST_BROWSER_DIR}
