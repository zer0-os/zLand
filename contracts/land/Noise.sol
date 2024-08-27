// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;


library Noise{
    int64 constant max = 256;
    function integer_noise(int64 n) public pure returns(int64) {
        n = (n >> 13) ^ n;
        int64 nn = (n * (n * n * 60493 + 19990303) + 1376312589) & 0x7fffffff;
        return ((((nn * 100000)) / (1073741824)))%max;
    }

    function local_average_noise(int64 x, int64 y) public pure returns(int64) {
        int64 xq = x + ((y-x)/3);
        int64 yq = y - ((x+y)/3);

        int64 result =
        ((integer_noise(xq) + integer_noise(yq-1))) //uc
        +   ((integer_noise(xq-1) + integer_noise(yq))) //cl
        +   ((integer_noise(xq+1) + integer_noise(yq))) //cr
        +   ((integer_noise(xq) + integer_noise(yq+1))); //lc

        return result*1000/8;
    }

    int64 constant iterations = 5;

    function stacked_squares(int64 x, int64 y) public pure returns(int64) {

        int64 accumulator;
        for(int64 iteration_idx = 0; iteration_idx < iterations; iteration_idx++){
            accumulator +=  integer_noise((x * iteration_idx) + accumulator + y) +
            integer_noise((y * iteration_idx) + accumulator - x);
        }

        return accumulator*1000/(iterations*2);
    }

	function get_tile(int64 x, int64 y) public pure returns (int64) {
        return (local_average_noise(x/4,y/7) + stacked_squares(x/25,y/42))/2000;
    }
}