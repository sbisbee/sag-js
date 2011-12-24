# Binaries
NODE := node
UGLIFY := uglifyjs
GPG := gpg

# Version we're building
VERSION := "0.1.0"

# Primary locations
BUILD_DIR := ./build
SRC_DIR := ./src
TESTS_DIR := ./tests

# Dist locations
DIST_DIR := ./sag-js-${VERSION}
DIST_FILE := ${DIST_DIR}.tar.gz
DIST_FILE_SIG := ${DIST_FILE}.sig
DIST_FILE_SHA1 := ${DIST_FILE}.sha
DIST_FILE_MD5 := ${DIST_FILE}.md5
DIST_FILES := ./src/sag.js LICENSE NOTICE README CHANGELOG

# jshint
JSHINT_FILE := ${BUILD_DIR}/jshint.js

# post processing file
POSTPROC := ${BUILD_DIR}/postproc.js

# unit test files for node
NODE_TESTS_DIR := ${TESTS_DIR}/node

# uglify
UGLIFY_OPTS := --unsafe

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
	mkdir ${DIST_DIR}
	cp ${DIST_FILES} ${DIST_DIR}

	mv ${DIST_DIR}/sag.js ${DIST_DIR}/sag-${VERSION}.js
	cp package.json ${DIST_DIR}
	sed -i -e '/"main":/s/sag\.js/sag-0.1.0.js/' -e '/"version":/s/UNRELEASED/0.1.0/' ${DIST_DIR}/package.json

	for file in `ls ${DIST_DIR}/*.js`; do \
		fileMin=`echo $$file | sed -e 's/\.js/.min.js/'` ; \
		echo "Minifying $$file => $$fileMin" ; \
		${UGLIFY} ${UGLIFY_OPTS} $$file > $$fileMin ; \
		echo "Post Processing $$file" ; \
		${NODE} ${POSTPROC} $$file ${VERSION} ; \
		echo "Post Processing $$fileMin" ; \
		${NODE} ${POSTPROC} $$fileMin ${VERSION} ; \
	done

	tar -zcvvf ${DIST_FILE} ${DIST_DIR}
	rm -rf ${DIST_DIR}

sign: dist
	${GPG} --output ${DIST_FILE_SIG} --detach-sig ${DIST_FILE}

clean:
	rm -rf ${DIST_DIR} ${DIST_FILE} ${DIST_FILE_SIG} \
		${DIST_FILE_MD5} ${DIST_FILE_SHA1}
