ifeq ($(OS),Windows_NT)
	DOCCO:= node_modules/.bin/betterdocco.cmd
else
	DOCCO:= ./node_modules/.bin/betterdocco
endif

docs:
	$(DOCCO) -o docs README.MD index.coffee
clean:
	rm -rf ./node_modules
	rm -rf ./logs/*.log

.PHONY: test
.PHONY: docs
