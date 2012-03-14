# Binaries
NODE := node
UGLIFY := uglifyjs
GPG := gpg
SHA1SUM := sha1sum
MD5SUM := md5sum

# Version we're building
VERSION := 0.1.0

# Primary locations
BUILD_DIR := ./build
SRC_DIR := ./src
TESTS_DIR := ./tests

# Source files in concat order
SRC_FILES := ${SRC_DIR}/core.header.js\
              ${SRC_DIR}/server.private.js\
              ${SRC_DIR}/server.public.js\
              ${SRC_DIR}/core.footer.js

# Dist locations
DIST_DIR := sag-js-${VERSION}
DIST_FILE := ${DIST_DIR}.tar.gz
DIST_FILE_SIG := ${DIST_FILE}.sig
DIST_FILE_SHA1 := ${DIST_FILE}.sha
DIST_FILE_MD5 := ${DIST_FILE}.md5
DIST_FILES := sag.js LICENSE NOTICE README CHANGELOG

# jshint
JSHINT_FILE := ${BUILD_DIR}/jshint.js
JSHINT_TARGETS := ./sag.js

# post processing file
POSTPROC := ${BUILD_DIR}/postproc.js

# unit test files for node
NODE_TESTS_DIR := ${TESTS_DIR}/node

# uglify
UGLIFY_OPTS := --unsafe

all: sag.js

sag.js:
	cat ${SRC_FILES} > sag.js

submodules:
	git submodule update --init

hint: sag.js
	@@for file in ${JSHINT_TARGETS}; do \
		echo "Hinting: $$file"; \
		${NODE} ${JSHINT_FILE} $$file; \
		echo "--------------------------"; \
	done

check: submodules sag.js
	@@cd ${NODE_TESTS_DIR} && \
		${NODE} ./run.js && \
		cd - > /dev/null

dist: sag.js
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

	${SHA1SUM} ${DIST_FILE} > ${DIST_FILE_SHA1}
	${MD5SUM} ${DIST_FILE} > ${DIST_FILE_MD5}

sign: dist
	${GPG} --output ${DIST_FILE_SIG} --detach-sig ${DIST_FILE}

clean:
	rm -rf ${DIST_DIR} ${DIST_FILE} ${DIST_FILE_SIG} \
		${DIST_FILE_MD5} ${DIST_FILE_SHA1}
