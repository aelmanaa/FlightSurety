// SPDX-License-Identifier: MIYA
pragma solidity ^0.8.0;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    bool private operational = true; // Blocks all state changes throughout the contract if false
    bool private isSetUp;

    FlightSuretyData flightSuretyData;

    // Arline queue
    struct AirlineRegistration {
        bool isInTheQueue;
        bool isReadyForVote;
        uint256 votesInFavor; // number of votes Yes
        uint256 votesAgainst; // number of votes No
        mapping(address => bool) voters; //  check who has voted. a voter cannot vote twice
    }

    mapping(address => AirlineRegistration) private airlineRegistrationQueue;
    uint8 private constant AIRLINE_QUEUE_ACTIVATION = 5;
    uint256 public constant AIRLINE_FEE = 10 ether;
    uint256 public constant PASSENGER_INSURANCE_LIMIT = 1 ether;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        address[] passengerList;
    }
    mapping(bytes32 => Flight) private flights;

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

    modifier calledOnlyOnce() {
        require(!isSetUp, "Contract already setup");
        _;
    }

    modifier nonExistingAirline(address _airline) {
        require(
            !flightSuretyData.isRegistredAirline(_airline),
            "Airline already registred"
        );

        require(
            !airlineRegistrationQueue[_airline].isInTheQueue,
            "Airline already in the queue for registration"
        );
        _;
    }

    modifier mustBeQueued(address _airline) {
        require(
            !flightSuretyData.isRegistredAirline(_airline),
            "Airline already registred"
        );

        require(
            airlineRegistrationQueue[_airline].isInTheQueue,
            "Airline must be queued for registration"
        );
        _;
    }

    modifier cannotBeInQueueVote(address _airline) {
        require(
            !airlineRegistrationQueue[_airline].isReadyForVote,
            "The airline is in the queue for vote"
        );
        _;
    }

    modifier mustBeInQueueVote(address _airline) {
        require(
            airlineRegistrationQueue[_airline].isReadyForVote,
            "The airline must be the queue for vote"
        );
        _;
    }

    modifier checkRegistrerAirline(address _airline) {
        require(
            flightSuretyData.isRegistredAirline(msg.sender),
            "Only a registred airline may register or vote"
        );

        require(
            !airlineRegistrationQueue[_airline].voters[msg.sender],
            "You cannot vote for an airline twice"
        );
        _;
    }

    modifier requireKnownAirline(address _airline) {
        require(
            flightSuretyData.isRegistredAirline(_airline),
            "Airline not registred"
        );
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

    modifier requireRightStatusCode(bytes32 _key) {
        require(
            flights[_key].statusCode == STATUS_CODE_LATE_AIRLINE,
            "Cannot release insurance. status code not correct"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       EVENTS                                        */
    /********************************************************************************************/

    event AIRLINE_REGISTRED(
        address indexed _airline,
        uint256 _votesInFavor,
        uint256 _votesAgainst,
        uint256 _numberAirlines
    );

    event AIRLINE_REFUSED(
        address indexed _airline,
        uint256 _votesInFavor,
        uint256 _votesAgainst,
        uint256 _numberAirlines
    );

    event AIRLINE_QUEUED(address indexed _airline);

    event AIRLINE_READY_FOR_VOTE(address indexed _airline);

    event AIRLINE_VOTED_YES(address indexed _airline, address indexed _voter);

    event AIRLINE_VOTED_NO(address indexed _airline, address indexed _voter);

    event FLIGHT_REGISTERED(
        address indexed _airline,
        bytes32 indexed _key,
        string _flight,
        uint256 _timestamp,
        uint8 _status
    );

    event INSURANCE_DEPOSITED(
        address indexed _passenger,
        bytes32 indexed _key,
        uint256 _depositedAmount,
        uint256 _totalDeposit
    );

    event INSURANCE_RELEASED(
        address indexed _passenger,
        bytes32 indexed _key,
        uint256 _totalDeposit,
        uint256 _totalReleased,
        uint256 _totalBalance
    );

    event FLIGHT_INSURANCE_TOBE_RELEASED(
        address indexed _airline,
        string _flight,
        uint256 _timestamp,
        bytes32 indexed _key,
        uint256 _passengersNumber
    );

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor() {
        contractOwner = msg.sender;
        isSetUp = false;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public pure returns (bool) {
        return true; // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function setOperatingStatus(bool mode) external requireContractOwner() {
        operational = mode;
    }

    // setup of contract (called just after contructing)

    function setUp(FlightSuretyData _flightSuretyData, address _airline)
        public
        payable
        requireIsOperational()
        requireContractOwner()
        calledOnlyOnce()
    {
        require(
            msg.value >= AIRLINE_FEE,
            "Airline registration fee is required"
        );
        isSetUp = true;
        flightSuretyData = FlightSuretyData(_flightSuretyData);
        flightSuretyData.registerAirline{value: AIRLINE_FEE}(_airline);
        // return back the change. registration only of 10 ether
        if (msg.value > AIRLINE_FEE) {
            payable(msg.sender).transfer(msg.value.sub(AIRLINE_FEE));
        }
        emit AIRLINE_REGISTRED(
            _airline,
            0,
            0,
            flightSuretyData.numberOfRegistredAirlines()
        );
    }

    // Airline stakes 10 ether before registrating
    function stakeAirline()
        public
        payable
        requireIsOperational()
        nonExistingAirline(msg.sender)
    {
        // Require registration fee
        require(
            msg.value >= AIRLINE_FEE,
            "Airline registration fee is required"
        );

        // queue arline
        AirlineRegistration storage airlineRegistration =
            airlineRegistrationQueue[msg.sender];
        airlineRegistration.isInTheQueue = true;
        airlineRegistration.votesInFavor = 0;
        airlineRegistration.votesAgainst = 0;
        emit AIRLINE_QUEUED(msg.sender);

        // return back the change. registration only of 10 ether
        if (msg.value > AIRLINE_FEE) {
            payable(msg.sender).transfer(msg.value.sub(AIRLINE_FEE));
        }
    }

    function airlineQueueState(address _airline)
        public
        view
        returns (
            bool isInTheQueue,
            bool isReadyForVote,
            uint256 votesInFavor,
            uint256 votesAgainst
        )
    {
        AirlineRegistration storage airlineRegistration =
            airlineRegistrationQueue[_airline];
        isInTheQueue = airlineRegistration.isInTheQueue;
        isReadyForVote = airlineRegistration.isReadyForVote;
        votesInFavor = airlineRegistration.votesInFavor;
        votesAgainst = airlineRegistration.votesAgainst;
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */

    function registerAirline(address _airline)
        public
        requireIsOperational()
        mustBeQueued(_airline)
        cannotBeInQueueVote(_airline)
        checkRegistrerAirline(_airline)
        returns (bool success)
    {
        if (
            flightSuretyData.numberOfRegistredAirlines().add(1) <
            AIRLINE_QUEUE_ACTIVATION
        ) {
            delete airlineRegistrationQueue[_airline];
            success = true;
            flightSuretyData.registerAirline{value: AIRLINE_FEE}(_airline);
            emit AIRLINE_REGISTRED(
                _airline,
                1,
                0,
                flightSuretyData.numberOfRegistredAirlines()
            );
        } else {
            AirlineRegistration storage airlineRegistration =
                airlineRegistrationQueue[_airline];
            airlineRegistration.votesInFavor = 1;
            airlineRegistration.votesAgainst = 0;
            airlineRegistration.voters[msg.sender] = true;
            airlineRegistration.isReadyForVote = true;
            success = false;
            emit AIRLINE_READY_FOR_VOTE(_airline);
        }
        emit AIRLINE_VOTED_YES(_airline, msg.sender);
        return success;
    }

    function voteAirline(address _airline, bool _inFavor)
        public
        requireIsOperational()
        mustBeInQueueVote(_airline)
        checkRegistrerAirline(_airline)
    {
        _airlineRegistrator(_airline, _inFavor);
    }

    function _airlineRegistrator(address _airline, bool _inFavor) private {
        uint256 threshold =
            flightSuretyData.numberOfRegistredAirlines().div(2).add(1); // >50%

        AirlineRegistration storage airlineRegistration =
            airlineRegistrationQueue[_airline];
        airlineRegistration.voters[msg.sender] = true;
        if (_inFavor) {
            airlineRegistration.votesInFavor = airlineRegistration
                .votesInFavor
                .add(1);
            emit AIRLINE_VOTED_YES(_airline, msg.sender);
        } else {
            airlineRegistration.votesAgainst = airlineRegistration
                .votesAgainst
                .add(1);
            emit AIRLINE_VOTED_NO(_airline, msg.sender);
        }

        uint256 votesInFavor = airlineRegistration.votesInFavor;
        uint256 votesAgainst = airlineRegistration.votesAgainst;

        if (airlineRegistration.votesInFavor >= threshold) {
            delete airlineRegistrationQueue[_airline];
            flightSuretyData.registerAirline{value: AIRLINE_FEE}(_airline);
            emit AIRLINE_REGISTRED(
                _airline,
                votesInFavor,
                votesAgainst,
                flightSuretyData.numberOfRegistredAirlines()
            );
        } else if (airlineRegistration.votesAgainst >= threshold) {
            delete airlineRegistrationQueue[_airline];
            emit AIRLINE_REFUSED(
                _airline,
                votesInFavor,
                votesAgainst,
                flightSuretyData.numberOfRegistredAirlines()
            );
        }
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */

    function registerFlight(
        address _airline,
        string memory _flight,
        uint256 _timestamp
    )
        public
        requireIsOperational()
        requireKnownAirline(_airline)
        requireValidFlightNumber(_flight)
        requireValidTimestamp(_timestamp)
    {
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        Flight storage flight = flights[key];
        require(!flight.isRegistered, "Cannot register an existing flight");
        flight.isRegistered = true;
        flight.statusCode = STATUS_CODE_UNKNOWN;
        flight.updatedTimestamp = _timestamp;
        flight.airline = _airline;
        emit FLIGHT_REGISTERED(_airline, key, _flight, _timestamp , STATUS_CODE_UNKNOWN);
    }

    function buy(
        address _airline,
        string memory _flight,
        uint256 _timestamp
    )
        public
        payable
        requireIsOperational()
        requireKnownAirline(_airline)
        requireValidFlightNumber(_flight)
        requireValidTimestamp(_timestamp)
    {
        bytes32 _key = getFlightKey(_airline, _flight, _timestamp);
        Flight storage flight = flights[_key];
        require(flight.isRegistered, "Flight must be registered");
        uint256 _deposit = flightSuretyData.getDeposit(msg.sender, _key);
        require(
            _deposit < PASSENGER_INSURANCE_LIMIT,
            "Insurance limit amount exceeded"
        );
        if (_deposit == 0) {
            flight.passengerList.push(msg.sender); // first time passenger
        }
        uint256 _remaining = PASSENGER_INSURANCE_LIMIT.sub(_deposit); // allow user to increase his insurance deposit for a given flight
        uint256 _newDeposit;
        if (msg.value > _remaining) {
            _newDeposit = _remaining;
            flightSuretyData.buy{value: _newDeposit}(msg.sender, _key);
            payable(msg.sender).transfer(msg.value.sub(_newDeposit));
        } else {
            _newDeposit = msg.value;
            flightSuretyData.buy{value: _newDeposit}(msg.sender, _key);
        }
        emit INSURANCE_DEPOSITED(
            msg.sender,
            _key,
            _newDeposit,
            flightSuretyData.getDeposit(msg.sender, _key)
        );
    }

    function getFlightPassengersNumber(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public view returns (uint256) {
        bytes32 _key = getFlightKey(airline, flight, timestamp);
        return getFlightPassengersNumber(_key);
    }

    function getFlightPassengersNumber(bytes32 key)
        public
        view
        returns (uint256)
    {
        return flights[key].passengerList.length;
    }

    function getFlightPassengersList(bytes32 key)
        public
        view
        returns (address[] memory)
    {
        return flights[key].passengerList;
    }

    // loop over this function from dapp to release money. Anyone can trigger money release. this avoids to loop inside the smartcontract
    function releaseInsurance(bytes32 key)
        public
        requireIsOperational()
        requireRightStatusCode(key)
    {
        uint256 length = flights[key].passengerList.length;
        if (length == 0) return;
        address _passenger = flights[key].passengerList[length - 1];
        flights[key].passengerList.pop();
        uint256 _totalDeposit = flightSuretyData.getDeposit(_passenger, key);
        require(_totalDeposit > 0, "Passenger does not have enough deposit"); // sanity check, fail fast. passenger shouldn't be in the list without having deposited somehting
        uint256 _totalReleased = _totalDeposit.mul(3).div(2);
        flightSuretyData.creditInsurees(_passenger, key, _totalReleased);
        emit INSURANCE_RELEASED(
            _passenger,
            key,
            _totalDeposit,
            _totalReleased,
            flightSuretyData.getBalance(_passenger)
        );
    }

    function releaseInsurance(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public requireIsOperational() {
        bytes32 _key = getFlightKey(airline, flight, timestamp);
        releaseInsurance(_key);
    }

    function getFlightStatusCode(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public view returns (uint8) {
        return getFlightStatusCode(getFlightKey(airline, flight, timestamp));
    }

    function getFlightStatusCode(bytes32 key) public view returns (uint8) {
        require(flights[key].isRegistered, "Flight must be registered");
        return flights[key].statusCode;
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */

    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) private {
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            bytes32 _key = getFlightKey(airline, flight, timestamp);
            emit FLIGHT_INSURANCE_TOBE_RELEASED(
                airline,
                flight,
                timestamp,
                _key,
                flights[_key].passengerList.length
            );
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public requireIsOperational() {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key =
            keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(
            flights[getFlightKey(airline, flight, timestamp)].isRegistered,
            "Flight must be registered"
        );
        ResponseInfo storage responseInfo = oracleResponses[key];
        responseInfo.requester = msg.sender;
        responseInfo.isOpen = true;

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address _airline,
        string _flight,
        uint256 _timestamp,
        uint8 _status
    );

    event OracleRegistered(
        address indexed _oracle,
        uint256 _registrationFee,
        bool _isRegistered,
        uint8[3] _indexes
    );

    event OracleReport(
        address _airline,
        string _flight,
        uint256 _timestamp,
        uint8 _status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 _index,
        address _airline,
        string _flight,
        uint256 _timestamp
    );

    // Register an oracle with the contract
    function registerOracle() public payable requireIsOperational() {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});

        emit OracleRegistered(msg.sender, msg.value, oracles[msg.sender].isRegistered, oracles[msg.sender].indexes);
    }

    function getMyIndexes() public view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) public requireIsOperational() {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        require(
            statusCode == STATUS_CODE_UNKNOWN ||
                statusCode == STATUS_CODE_ON_TIME ||
                statusCode == STATUS_CODE_LATE_AIRLINE ||
                statusCode == STATUS_CODE_LATE_WEATHER ||
                statusCode == STATUS_CODE_LATE_TECHNICAL ||
                statusCode == STATUS_CODE_LATE_OTHER,
            "Status code not known"
        );

        require(
            flights[getFlightKey(airline, flight, timestamp)].isRegistered,
            "Flight must be registered"
        );

        bytes32 key =
            keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp or index do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            flights[getFlightKey(airline, flight, timestamp)]
                .statusCode = statusCode;
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account)
        private
        returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) private returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random =
            uint8(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            blockhash(block.number - nonce++),
                            account
                        )
                    )
                ) % maxValue
            );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
