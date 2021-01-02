// #include <emscripten/emscripten.h>
#include <iostream>
#include <iomanip>
#include <string>
#include <fstream>
#include <sstream>
#include <cmath>

#define RISE_FALL_TIME 1e-2
#define LOW 0.0
#define HIGH 3.3

#define MAX(x, y) ((x) > (y) ? (x) : (y))

const unsigned int BITS_MAX_VAL[] = {0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536};

using namespace std;


double produce_pwl_single(const double period, const int resolution, const unsigned int value, ostream &out, const float low, const float high, const double offset = 0.0, const float rise_time_micros = RISE_FALL_TIME, const float fall_time_micros = RISE_FALL_TIME){
	// Writes a single 'pulse' to the output stream
	// returns the end time of the pulse
	double now = offset;

	out << setprecision(10) << now << "\t" << setprecision(5) <<  low << endl;
	
	if(value > 0){
		
		double duration_of_on_pulse = ((double) value / BITS_MAX_VAL[resolution]) * period;

		if(duration_of_on_pulse > (rise_time_micros * 10e-6 + fall_time_micros * 10e-6)){
			now += rise_time_micros * 10e-6;
			out << setprecision(10) << now << "\t" << setprecision(5) << high  << endl;

			now += duration_of_on_pulse;
			out << setprecision(10) << now << "\t" << setprecision(5) << high  << endl;
			
			// low
			now += fall_time_micros * 10e-6;
			out << setprecision(10) << now << "\t" << setprecision(5) << low  << endl;
		}
	}
	return MAX(now, (offset + period));
}

double single_pwl_line(string &out, const double period, const int resolution, const unsigned int value, const float low, const float high, const double offset, const float rise_time_micros, const float fall_time_micros){
	ostringstream line_stream;
	double new_offset = produce_pwl_single(
		period,
		resolution,
		value,
		line_stream,
		low,
		high,
		offset,
		rise_time_micros,
		fall_time_micros
	);
	out = line_stream.str();
	return new_offset;
}

char* pwl_from_lut(
	const int resolution, 
	const double frequency,
	const float rise_time_micros,
	const float fall_time_micros,
	const int update_period,
	const unsigned int* lut,
	const float low = 0.0,
	const float high = 3.3f)
	{
	
	stringstream output_ss;
	int lut_length = BITS_MAX_VAL[resolution];
	
	double period = 1.0 / frequency;

	double pulse_start_time = 0.0;
	for(const unsigned int* val_ptr = lut; val_ptr < (lut + lut_length); val_ptr++){
		for(int i = 0; i < update_period; i++){
			string line_str;
			double offset = single_pwl_line(line_str, period, resolution, *val_ptr, low, high, pulse_start_time, rise_time_micros, fall_time_micros);
			output_ss << line_str;
			pulse_start_time = offset;
		}
	}

	char* ptr = new char[output_ss.str().size() + 1];
	strcpy(ptr, output_ss.str().c_str());
	// Eep...
	return ptr;
}


extern "C" {
	extern void show_string(char*, int);

	unsigned int LUT_3_BIT[8];
	unsigned int LUT_4_BIT[16];
	unsigned int LUT_5_BIT[32];
	unsigned int LUT_6_BIT[64];
	unsigned int LUT_7_BIT[128];
	unsigned int LUT_8_BIT[256];
	unsigned int LUT_9_BIT[512];
	unsigned int LUT_10_BIT[1024];
	unsigned int LUT_11_BIT[2048];
	unsigned int LUT_12_BIT[4096];

	unsigned int* LUT_ADDR[13] = {
		0,
		0,
		0, 
		LUT_3_BIT, 
		LUT_4_BIT,
		LUT_5_BIT,
		LUT_6_BIT,
		LUT_7_BIT,
		LUT_8_BIT,
		LUT_9_BIT,
		LUT_10_BIT,
		LUT_11_BIT,
		LUT_12_BIT,
	};

	unsigned int* get_lut_ptr(unsigned int bits){
		return LUT_ADDR[bits];
	}

	unsigned int show_number(unsigned int bits, unsigned int index){
		return LUT_ADDR[bits][index];
	}

	void message(){
		char *str = getenv("HELLO");
		int len = strlen(str);
		show_string(str,len);
	}

	void from_lut(
		const int resolution, 
		const double frequency,
		const float rise_time_micros,
		const float fall_time_micros,
		const int update_period,
		const float low_voltage,
		const float high_voltage
	)
	{
		char *val = pwl_from_lut(
			resolution,
			frequency,
			rise_time_micros,
			fall_time_micros,
			update_period,
			LUT_ADDR[resolution],
			low_voltage,
			high_voltage
		);
		int length = strlen(val);
		// show_string will copy it into the DOM - so we can destroy it after this call.
		show_string(val, length);
		free(val);
	}
}

