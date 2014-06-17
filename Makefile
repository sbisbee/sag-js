# Binaries
export NODE := node
GPG := gpg
SHA1SUM := sha1sum
MD5SUM := md5sum

# Version we're building
VERSION := $(shell cat "./VERSION")

# Primary locations
BUILD_DIR := ./build
SRC_DIR := ./src
TESTS_DIR := ./tests

# Source files in concat order
SRC_FILES := ${SRC_DIR}/core.header.js\
              ${SRC_DIR}/utils.js\
              ${SRC_DIR}/server.private.js\
              ${SRC_DIR}/server.public.js\
              ${SRC_DIR}/core.footer.js

TARGET_FILE := sag.js

# Dist locations
DIST_DIR := sag-js-${VERSION}
DIST_FILE := ${DIST_DIR}.tar.gz
DIST_FILE_SIG := ${DIST_FILE}.sig
DIST_FILE_SHA1 := ${DIST_FILE}.sha
DIST_FILE_MD5 := ${DIST_FILE}.md5
DIST_FILES := ${TARGET_FILE} LICENSE NOTICE README CHANGELOG

# jshint
JSHINT_FILE := ${BUILD_DIR}/jshint.js
JSHINT_TARGETS := ./${TARGET_FILE}

# post processing file
POSTPROC := ${BUILD_DIR}/postproc.js

# unit test files for node
NODE_TESTS_DIR := ${TESTS_DIR}/node

all: ${TARGET_FILE}

${SRC_FILES}:

${TARGET_FILE}: ${SRC_FILES}
	cat ${SRC_FILES} > ${TARGET_FILE}

node_modules:
	npm install .

hint: ${TARGET_FILE}
	@@for file in ${JSHINT_TARGETS}; do \
		echo "Hinting: $$file"; \
		${NODE} ${JSHINT_FILE} $$file; \
		echo "--------------------------"; \
	done

check: node_modules ${TARGET_FILE}
	make -C ${NODE_TESTS_DIR} check

dist: node_modules ${TARGET_FILE}
	mkdir ${DIST_DIR}
	cp ${DIST_FILES} ${DIST_DIR}

	mv ${DIST_DIR}/${TARGET_FILE} ${DIST_DIR}/sag-${VERSION}.js
	cp package.json ${DIST_DIR}
	sed -i -e '/"main":/s/sag\.js/sag-${VERSION}.js/' -e '/"version":/s/UNRELEASED/${VERSION}/' ${DIST_DIR}/package.json

	for file in `ls ${DIST_DIR}/*.js`; do \
		echo "Post Processing $$file" ; \
		${NODE} ${POSTPROC} $$file ${VERSION} ; \
		echo "Post Processing $$fileMin" ; \
		${NODE} ${POSTPROC} $$fileMin ${VERSION} ; \
	done

	tar -zcvvf ${DIST_FILE} ${DIST_DIR}
	rm -rf ${DIST_DIR}

	${SHA1SUM} ${DIST_FILE} > ${DIST_FILE_SHA1}
	${MD5SUM} ${DIST_FILE} > ${DIST_FILE_MD5}

sign: dist
	${GPG} --output ${DIST_FILE_SIG} --detach-sig ${DIST_FILE}

clean:
	rm -rf ${DIST_DIR} ${DIST_FILE} ${DIST_FILE_SIG} \
		${DIST_FILE_MD5} ${DIST_FILE_SHA1} ${TARGET_FILE}

.PHONY: clean install sign dist check hint node_modules
