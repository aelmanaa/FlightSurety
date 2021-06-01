// SPDX-License-Identifier: MIYA
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => bool) private airlines; // Set of registred airlines
    uint256 private registredAirlines; // number of registred airlines

    address private linkedFlightSuretyApp; // only this Flight surely app can call

    mapping(address => mapping(bytes32 => uint256)) private passengersDeposits; // passenger registers deposit for each flight
    mapping(address => uint256) private passengersBalances;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireLinkedSuretyApp() {
        require(
            msg.sender == linkedFlightSuretyApp,
            "Caller must be a linked Flight surety app"
        );
        _;
    }

    modifier requireKnownAirline(address _airline) {
        require(isRegistredAirline(_airline), "Airline not registred");
        _;
    }

    modifier requireValidFlightNumber(string memory _flight) {
        require(bytes(_flight).length > 0, "Flight number not valid");
        _;
    }

    modifier requireValidTimestamp(uint256 _timestamp) {
        require(block.timestamp < _timestamp, "Flight cannot be in the past");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */

    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */

    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function registerLinkedSuretyApp(address linkedContractApp)
        public
        requireContractOwner()
    {
        linkedFlightSuretyApp = linkedContractApp;
    }

    function getLinkedSuretyApp() public view returns (address) {
        return linkedFlightSuretyApp;
    }

    function isLinkedSuretyApp(address _contract) public view returns (bool) {
        return (linkedFlightSuretyApp == _contract);
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */

    function registerAirline(address _airline)
        public
        payable
        requireLinkedSuretyApp()
    {
        airlines[_airline] = true;
        registredAirlines = registredAirlines.add(1); // increment number of registred airlines
    }

    function isRegistredAirline(address _airline) public view returns (bool) {
        return airlines[_airline];
    }

    function numberOfRegistredAirlines() public view returns (uint256) {
        return registredAirlines;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */

    function buy(address _passenger, bytes32 _key)
        public
        payable
        requireLinkedSuretyApp()
    {
        passengersDeposits[_passenger][_key].add(msg.value); // credit deposit
    }

    function getDeposit(address _passenger, bytes32 _key)
        public
        view
        returns (uint256)
    {
        return passengersDeposits[_passenger][_key];
    }

    function getBalance(address _passenger) public view returns (uint256) {
        return passengersBalances[_passenger];
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(
        address _passenger,
        bytes32 _key,
        uint256 _amount
    ) public requireLinkedSuretyApp() {
        require(
            passengersDeposits[_passenger][_key] > 0,
            "Passenger doesn't have any deposit for this flight"
        ); // be sure that passenger has deposit
        delete passengersDeposits[_passenger][_key]; // clear deposit
        passengersBalances[_passenger].add(_amount);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() public {
        uint256 balance = passengersBalances[msg.sender];
        delete passengersBalances[msg.sender]; //reset balance
        require(balance > 0, "Passenger doesn't have enough balance");
        payable(msg.sender).transfer(balance);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */

    function fund() public payable {}

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        fund();
    }

    receive() external payable {
        revert("Not managed");
    }
}
