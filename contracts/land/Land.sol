pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

contract Land is ERC721{
    uint256 land_wei_price = 1000000000000;
    uint256 unit_wei_price = 10000000000;
    uint256 unit_gold_price = 100000;
	uint256 blocks_per_round = 4000;
	uint256 deployed_at_block;
	uint256 public ending_balance;
	uint256 public pool_nom = 9;
	uint256 public pool_div = 10;

    uint8 max_upgrades = 3;
	uint256 public passable_threshold = 121;
	uint256 public ground_threshold = 0;
	uint8 victory_threshold = 169;
	uint256 threshold_increment = 6;
	uint8 max_units = 99;
	uint32 total_victory_tiles_owned;
    uint32 treatyID;
	bool firstWithdraw = true;
    IERC4626 resourceToken;
    
    mapping(int64 => mapping(int64 => address payable)) public tile_owner;
    mapping(address => uint256) public resource_per_second;
	mapping(address => uint256) last_claim_time;
	mapping(address => uint32) public victory_tiles_owned;
	mapping(address => bool) public withdrew;
	mapping(int64 => mapping(int64 => uint256)) market_price;

	constructor (IERC4626 resource_token, string memory name, string memory symbol) ERC721(name, symbol){
		deployed_at_block = block.number;
		resourceToken = resource_token;
	}

	function dep() public view returns (uint256){
		return deployed_at_block;
	}

	function get_passable_threshold() public view returns(uint256){
		if((block.number - deployed_at_block)/blocks_per_round > 8){return victory_threshold;}
		return (passable_threshold + (block.number - deployed_at_block)/blocks_per_round * threshold_increment);
	}

	function resource_accrual(address a) public view returns(uint){
		return resource_per_second[a]*(block.timestamp - last_claim_time[a]);
	}

	//noise
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
        return (local_average_noise(x/4,y/7) + stacked_squares(x/9,y/4))/2000;
    }

	event Land_Bought(uint8 indexed x, uint8 indexed y, address indexed new_owner, uint16 new_population, uint8 development_level);
    event Land_Transferred(uint8 indexed x, uint8 indexed y, address indexed new_owner);
	event Gold_Transferred(address from, address to, uint gold);
    event New_Population(uint8 indexed x, uint8 indexed y, uint16 new_population);	
	event Market_Posted(uint8 indexed x, uint8 indexed y, address indexed poster, uint256 price);
	event Market_Bought(uint8 indexed x, uint8 indexed y, address indexed buyer);
}