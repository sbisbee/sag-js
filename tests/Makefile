check:
	@@for file in *-test.js; do \
		echo "Running: $$file"; \
		${NODE} ./run.js ./makeCouch.js $$file; \
		echo "--------------------------"; \
	done
