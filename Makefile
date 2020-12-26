TYPEDOC:= ./node_modules/.bin/typedoc
TSC:= ./node_modules/.bin/tsc

# Clean compiled resources and dependencies
clean:
	rm -rf ./node_modules
	rm -f package-lock.json

# Compile and build resources
build:
	$(TSC)

# Generate TypeScript docs
docs:
	rm -rf ./docs/assets
	rm -rf ./docs/classes
	rm -rf ./docs/interfaces
	rm -rf ./docs/modules
	$(TYPEDOC) --disableOutputCheck
	cp ./CNAME ./docs/CNAME

# Update dependencies
update:
	-ncu -u
	npm install

# Publish to NPM
publish:
	npm publish

.PHONY: docs
