# MAKE HELPERS

clean:
	rm -rf ./node_modules
	rm -rf ./logs/*.log

update:
	-ncu -u
	npm install

