all: check
check: check-http

check-http:
	@@echo 'RUNNING HTTP (makeCouch.js)'
	@@for file in *-test.js; do \
		echo "Running: $$file"; \
		MAKE_COUCH=./makeCouch.js ../node_modules/mocha/bin/mocha $$file; \
		echo "--------------------------"; \
	done

.PHONY: check check-http
