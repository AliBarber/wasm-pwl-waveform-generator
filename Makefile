EMPP=em++
SRC_FILES=calc.cpp
EXPORTED_FUNCTIONS=-s EXPORTED_FUNCTIONS="['_get_lut_ptr','_message','_from_lut']"
EMFLAGS=-s INITIAL_MEMORY=5120KB -s MAXIMUM_MEMORY=10240KB -s ALLOW_MEMORY_GROWTH=1 -s TOTAL_STACK=56kb -s STANDALONE_WASM -s ERROR_ON_UNDEFINED_SYMBOLS=0 -Wl,--import-memory -Wl, --no-entry
SRC_DIR=.
BUILD_DIR=.
WASM = $(patsubst %.cpp,$(BUILD_DIR)/%.wasm,$(SRC_FILES))

$(BUILD_DIR)/%.wasm: $(SRC_DIR)/%.cpp
	mkdir -p $(BUILD_DIR)
	$(EMPP) -o $@ $< $(EMFLAGS) $(EXPORTED_FUNCTIONS)

all: $(WASM)

clean:
	rm -rf $(WASM)
