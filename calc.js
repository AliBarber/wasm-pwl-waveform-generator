const memory = new WebAssembly.Memory({ initial: 80, maximum: 160 });

var my_envs = {
  HELLO: "Hello, World!",
  LANG: "C.UTF-8",
};

function _envs_as_strings(envs) {
  // Converts the my_envs object to an array of key=value
  // strings
  strings = [];
  for (var key in envs) {
    strings.push(key + "=" + envs[key]);
  }

  return strings;
}

function get_env_data(envs) {
  var total_size = 0;
  var env_as_strings = _envs_as_strings(envs);
  env_as_strings.forEach((str, index) => {
    total_size += str.length;
  });
  total_size += env_as_strings.length; // Null termination
  return {
    n_vars: env_as_strings.length,
    as_strings: env_as_strings,
    total_size: total_size,
  };
}

const env_data = get_env_data(my_envs);

var wasm_imports = {
  wasi_snapshot_preview1: {
    environ_sizes_get: (environ_c, environ_s) => {
      var buffer = new Uint32Array(memory.buffer);
      buffer[environ_c] = env_data.as_strings.length;
      buffer[environ_s] = env_data.total_size;

      return 0;
    },
    environ_get: (environ_ptrs, environ_data_ptr) => {
      var ptr_buffer = new Uint32Array(
        memory.buffer,
        environ_ptrs,
        env_data.n_vars
      );
      var data_buffer = new Uint8Array(
        memory.buffer,
        environ_data_ptr,
        env_data.total_size
      );

      var offset = 0;
      env_data.as_strings.forEach((str, index) => {
        ptr_buffer[index] = offset + environ_data_ptr;

        for (var i = 0; i < str.length; i++) {
          data_buffer[offset + i] = str.charCodeAt(i);
        }
        data_buffer[offset + str.length] = 0;
        offset += str.length + 1;
      });
      return 0;
    },
    proc_exit: (code) => {
      console.log("Exited with: " + code);
    },
  },
  env: {
    memory: memory,
    show_string: (str_ptr, length) => {
      var str_buff = new Uint8Array(memory.buffer, str_ptr, length);
      var str = "";
      for (var i = 0; i < length; i++) {
        str += String.fromCharCode(str_buff[i]);
      }

      $("#output").val(str);
    },
    emscripten_notify_memory_growth: () => {
      console.log("Memory has grown");
    },
  },
};

function validate_input() {
  var form_data = {};

  // Clear any invalid classes
  $("input").removeClass("is-invalid");

  console.log("Button pressed.");
  form_data.resolution = Number.parseInt(
    $("#resolution-button-group").find("button.active").prop("value")
  );
  console.log("Resolution: " + form_data.resolution);

  form_data.frequency = Number.parseFloat($("#frequency-text-input").val());
  if (!Number.isFinite(form_data.frequency)) {
    $("#frequency-text-input").addClass("is-invalid");
    $("#output").val("Frequency value is invalid");
    return { is_ok: false };
  }

  var rise_time_number = Number.parseFloat($("#rise-time-text").val());
  if (!Number.isFinite(rise_time_number) || rise_time_number < 0) {
    $("#rise-time-text").addClass("is-invalid");
    $("#output").val("Rise time value is invalid");
    return { is_ok: false };
  }

  var fall_time_number = Number.parseFloat($("#fall-time-text").val());
  if (!Number.isFinite(rise_time_number) || rise_time_number < 0) {
    $("#fall-time-text").addClass("is-invalid");
    $("#output").val("Fall time value is invalid");
    return { is_ok: false };
  }

  var multipliers = { uS: 1, pS: 0.000001, nS: 0.001 };

  form_data.rise_time_micros =
    rise_time_number *
    multipliers[$("#rise-dropdown-btn:first-child").text().trim()];
  form_data.fall_time_micros =
    fall_time_number *
    multipliers[$("#fall-dropdown-btn:first-child").text().trim()];

  form_data.update_pulses = Number.parseInt($("#update-text").val());
  if (
    !Number.isInteger(form_data.update_pulses) ||
    form_data.update_pulses < 0
  ) {
    $("#update-text").addClass("is-invalid");
    $("#output").val("The update rate is invalid (must be an integer)");
    return { is_ok: false };
  }

  form_data.low_voltage = Number.parseFloat($("#low-text-input").val());
  if (!Number.isFinite(form_data.low_voltage)) {
    $("#low-text-input").addClass("is-invalid");
    $("#output").val("The low voltage is invalid");
    return { is_ok: false };
  }

  form_data.high_voltage = Number.parseFloat($("#high-text-input").val());
  if (!Number.isFinite(form_data.high_voltage)) {
    $("#high-text-input").addClass("is-invalid");
    $("#output").val("The high voltage is invalid");
    return { is_ok: false };
  }
  form_data.is_ok = true;
  console.log(form_data);
  return form_data;
}

function initailise_ui(run_calc_function) {
  var dropdown_ids = ["rise-dropdown", "fall-dropdown"];

  dropdown_ids.forEach((dropdown_id, idx) => {
    console.log(dropdown_id);
    $("#" + dropdown_id + " a").click(function () {
      // console.log($(this).text());
      $("#" + dropdown_id + "-btn:first-child").text($(this).text());
      $("#" + dropdown_id + "-btn:first-child").val($(this).text());
    });
  });

  if (
    typeof $("#resolution-button-group").find("button.active").prop("value") ==
    "undefined"
  ) {
    $("#resolution-8-button").addClass("active");
  }

  $("#run-calc").on("click", (button_action) => {
    form_data = validate_input();
    if (form_data.is_ok) {
      console.log(run_calc_function);
      run_calc_function(
        form_data.resolution,
        form_data.frequency,
        form_data.rise_time_micros,
        form_data.fall_time_micros,
        form_data.update_pulses,
        form_data.low_voltage,
        form_data.high_voltage
      );
    }
  });
}

WebAssembly.instantiateStreaming(
  fetch("./calc.wasm"),
  wasm_imports
)
  .then((wa_object) => {
    const wa_instance = wa_object.instance;
    const wa_exports = wa_instance.exports;

    wa_exports._initialize();

    var supported_resolutions_bits = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    supported_resolutions_bits.forEach((resolution, idx) => {
      const offset = wa_exports.get_lut_ptr(resolution);
      const max_val = Math.pow(2, resolution);
      const half_max_val = max_val / 2;
      console.log("M: " + max_val);
      var sin_lut = new Uint32Array(memory.buffer, offset, max_val);
      var degs_256 = Math.PI / half_max_val;
      for (var i = 0; i < max_val; i++) {
        var val = Math.floor(
          Math.sin(degs_256 * i) * half_max_val + half_max_val
        );
        sin_lut[i] = val;
      }
      console.log(sin_lut[10]);
    });
    initailise_ui(wa_exports.from_lut);
    console.log("Init");
  })
  .catch((error) => {
    console.log("Fail");
    console.log(error);
  });
