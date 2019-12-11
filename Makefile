test:
	@node node_modules/.bin/lab
test-cov:
	@node node_modules/.bin/lab -t 66
test-cov-html:
	@node node_modules/.bin/lab -r html -o coverage.html

.PHONY: test test-cov test-cov-html
