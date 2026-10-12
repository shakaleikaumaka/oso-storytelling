// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title  OSO Songbook Registry
/// @notice On-chain provenance layer for the Open Source Orchestra web3 songbook:
///         AI seed -> ranked human corrections -> artist approval -> cryptographic provenance.
///
///         The contract stores the *verifiable* layer only (hashes, contributors,
///         authority snapshots, URIs, approvals, history). Content itself lives
///         off-chain in content-addressed storage.
///
///         Authority model ("phi hierarchy") — editorial authority, NOT ownership,
///         NOT equity, NOT tokens:
///           - Each artist page has exactly one root authority: the artist (rank 0).
///           - The artist may seat up to 96 ranked superfans/editors (ranks 1..96).
///           - phiWeight(roleRank) = 100 / phi^(roleRank + 1), phi = (1+sqrt(5))/2,
///             held in 1e36 fixed point so rank 96 stays a meaningful non-zero value.
///           - The rank itself (lower = stronger) is the definitive ordering; the
///             phiWeight is a deterministic snapshot stored on each contribution.
///
///         Three invariants this contract guarantees:
///           A. The artist can always prevail (artistPublish ignores all proposals).
///           B. Artist-approved content always prevails over phiWeight.
///           C. Without artist approval, stronger phi authority prevails over weaker.
contract OsoSongbook {
    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    /// @notice Fixed-point scale for phi weights (36 decimals — 1e18 would
    ///         collapse the lowest ranks toward zero).
    uint256 public constant PHI_SCALE = 1e36;

    /// @notice 1/phi at 36-decimal precision: 0.618033988749894848204586834365638118
    uint256 public constant INV_PHI_X36 = 618033988749894848204586834365638118;

    /// @notice Maximum number of ranked superfan/editor seats per artist.
    uint8 public constant MAX_FAN_RANK = 96;

    /// @notice Role rank of the artist (root authority).
    uint8 public constant ARTIST_RANK = 0;

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum Status {
        NONE, // sentinel — never stored
        PENDING, // submitted, awaiting artist judgment
        APPROVED, // artist-approved (canonical at the time of approval)
        REJECTED, // artist-rejected
        SUPERSEDED // replaced by a stronger pending proposal or a newer approved version
    }

    struct Artist {
        address artistOwner; // root authority for this page
        uint64 registeredAt;
        string slug; // canonical artist slug ("shaka", "matteo-tambussi", ...)
    }

    struct Contribution {
        bytes32 artistId; // keccak256(slug)
        bytes32 contentItemId; // stable id of the edited item (bio, songbook, audio, ...)
        address contributor; // immutable historical attribution
        uint8 roleRank; // 0 = artist, 1..96 = fan rank AT SUBMISSION TIME
        uint256 phiWeightX36; // authority snapshot at submission time (1e36 fixed point)
        bytes32 contentHash; // keccak256 of the exact stored bytes
        uint64 parentId; // contribution this one is based on (0 = none / legacy seed)
        uint64 timestamp; // block timestamp at submission
        Status status;
        bool artistApproved; // true for APPROVED via approve or artistPublish
        string contentURI; // content-addressed pointer (bzz://, local-dev://, ...)
    }

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotContractOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error EmptySlug();
    error ArtistAlreadyRegistered(bytes32 artistId);
    error UnknownArtist(bytes32 artistId);
    error NotArtist(bytes32 artistId);
    error InvalidRank(uint8 rank);
    error RankOccupied(bytes32 artistId, uint8 rank);
    error AlreadyRanked(bytes32 artistId, address account);
    error ArtistCannotBeFan(bytes32 artistId);
    error NoRankHeld(bytes32 artistId, address account);
    error NotAnEditor(bytes32 artistId, address account);
    error StrongerProposalActive(bytes32 artistId, bytes32 contentItemId, uint8 strongerRank);
    error UnknownContribution(uint64 contributionId);
    error NotPendingContribution(uint64 contributionId);
    error WrongArtist(uint64 contributionId, bytes32 artistId);
    error EmptyContentHash();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event ArtistRegistered(bytes32 indexed artistId, address indexed artistOwner, string slug);
    event ArtistTransferred(bytes32 indexed artistId, address indexed previousArtist, address indexed newArtist);

    event FanAssigned(bytes32 indexed artistId, uint8 indexed rank, address indexed fan);
    event FanRemoved(bytes32 indexed artistId, uint8 indexed rank, address indexed fan);
    event FanRankTransferred(bytes32 indexed artistId, uint8 indexed rank, address indexed from, address to);

    event ContributionSubmitted(
        bytes32 indexed artistId,
        bytes32 indexed contentItemId,
        uint64 indexed contributionId,
        address contributor,
        uint8 roleRank,
        uint256 phiWeightX36,
        bytes32 contentHash,
        string contentURI,
        uint64 parentId
    );
    event ContributionSuperseded(
        bytes32 indexed artistId, bytes32 indexed contentItemId, uint64 indexed contributionId, uint64 byContributionId
    );
    event ContributionRejected(bytes32 indexed artistId, bytes32 indexed contentItemId, uint64 indexed contributionId);
    event ArtistApproved(
        bytes32 indexed artistId, bytes32 indexed contentItemId, uint64 indexed contributionId, address contributor
    );
    event ArtistPublished(
        bytes32 indexed artistId, bytes32 indexed contentItemId, uint64 indexed contributionId, bytes32 contentHash
    );

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice Platform steward. Can ONLY register artists — no content backdoor.
    address public contractOwner;
    address public pendingContractOwner;

    mapping(bytes32 artistId => Artist) private _artists;

    /// @notice artistId => rank (1..96) => fan address (0 = empty seat)
    mapping(bytes32 artistId => mapping(uint8 rank => address fan)) public fanAtRank;
    /// @notice artistId => address => rank (0 = no seat held)
    mapping(bytes32 artistId => mapping(address fan => uint8 rank)) public rankOf;

    /// @dev contributions[0] is a zero-value sentinel so ids start at 1.
    Contribution[] private _contributions;

    /// @notice The single active PENDING proposal per content item (0 = none).
    ///         By construction it is always the strongest eligible pending proposal.
    mapping(bytes32 artistId => mapping(bytes32 contentItemId => uint64)) public activePendingId;

    /// @notice Latest artist-approved contribution per content item (0 = none — legacy seed applies).
    mapping(bytes32 artistId => mapping(bytes32 contentItemId => uint64)) public canonicalApprovedId;

    /// @notice Earned reputation: artist-approved contribution count per editor address.
    ///         Belongs to the address forever — never transfers with a rank.
    mapping(bytes32 artistId => mapping(address editor => uint256)) public approvedContributionCount;

    // ---------------------------------------------------------------------
    // Construction / platform ownership (two-step, Ownable2Step-equivalent)
    // ---------------------------------------------------------------------

    constructor() {
        contractOwner = msg.sender;
        _contributions.push(); // sentinel id 0
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyContractOwner() {
        if (msg.sender != contractOwner) revert NotContractOwner();
        _;
    }

    modifier onlyArtist(bytes32 artistId) {
        if (_artists[artistId].artistOwner == address(0)) revert UnknownArtist(artistId);
        if (msg.sender != _artists[artistId].artistOwner) revert NotArtist(artistId);
        _;
    }

    /// @notice Two-step transfer of the platform-steward role.
    function transferContractOwnership(address newOwner) external onlyContractOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingContractOwner = newOwner;
        emit OwnershipTransferStarted(contractOwner, newOwner);
    }

    function acceptContractOwnership() external {
        if (msg.sender != pendingContractOwner) revert NotPendingOwner();
        emit OwnershipTransferred(contractOwner, msg.sender);
        contractOwner = msg.sender;
        pendingContractOwner = address(0);
    }

    // ---------------------------------------------------------------------
    // Artist administration
    // ---------------------------------------------------------------------

    /// @notice Derive the stable artist id from the canonical slug.
    function artistIdFromSlug(string calldata slug) public pure returns (bytes32) {
        return keccak256(bytes(slug));
    }

    /// @notice Register a new artist page. Contract-owner only (its sole power).
    function registerArtist(string calldata slug, address artistOwner_) external onlyContractOwner returns (bytes32 artistId) {
        if (artistOwner_ == address(0)) revert ZeroAddress();
        if (bytes(slug).length == 0) revert EmptySlug();
        artistId = keccak256(bytes(slug));
        if (_artists[artistId].artistOwner != address(0)) revert ArtistAlreadyRegistered(artistId);
        _artists[artistId] = Artist({artistOwner: artistOwner_, registeredAt: uint64(block.timestamp), slug: slug});
        emit ArtistRegistered(artistId, artistOwner_, slug);
    }

    function getArtist(bytes32 artistId) external view returns (Artist memory a) {
        a = _artists[artistId];
        if (a.artistOwner == address(0)) revert UnknownArtist(artistId);
    }

    function artistOwnerOf(bytes32 artistId) public view returns (address) {
        return _artists[artistId].artistOwner;
    }

    /// @notice Voluntary artist role transfer. ONLY the current artist can do this —
    ///         not the contract owner, not anyone else (artist sovereignty).
    ///         History (contributions, approvals, reputation) is untouched.
    function transferArtistRole(bytes32 artistId, address newArtist) external onlyArtist(artistId) {
        if (newArtist == address(0)) revert ZeroAddress();
        // the artist must not simultaneously hold a fan seat on their own page
        if (rankOf[artistId][newArtist] != 0) revert AlreadyRanked(artistId, newArtist);
        address previous = _artists[artistId].artistOwner;
        _artists[artistId].artistOwner = newArtist;
        emit ArtistTransferred(artistId, previous, newArtist);
    }

    // ---------------------------------------------------------------------
    // Phi authority math
    // ---------------------------------------------------------------------

    /// @notice phiWeight(roleRank) = 100 / phi^(roleRank + 1), in 1e36 fixed point.
    ///         roleRank 0 = artist (~61.803e36), 1..96 = fan seats.
    ///         Deterministic iterated multiplication — the rank itself remains the
    ///         definitive ordering; this value is a display/snapshot score.
    function phiWeightX36(uint8 roleRank) public pure returns (uint256 weight) {
        if (roleRank > MAX_FAN_RANK) revert InvalidRank(roleRank);
        weight = 100 * PHI_SCALE;
        for (uint256 i = 0; i <= roleRank; ++i) {
            weight = (weight * INV_PHI_X36) / PHI_SCALE;
        }
    }

    // ---------------------------------------------------------------------
    // Fan hierarchy (ranks 1..96, lower = stronger)
    // ---------------------------------------------------------------------

    /// @notice Artist seats a fan at an empty rank.
    function assignFan(bytes32 artistId, uint8 rank, address fan) external onlyArtist(artistId) {
        if (fan == address(0)) revert ZeroAddress();
        if (rank == 0 || rank > MAX_FAN_RANK) revert InvalidRank(rank);
        if (fanAtRank[artistId][rank] != address(0)) revert RankOccupied(artistId, rank);
        if (fan == _artists[artistId].artistOwner) revert ArtistCannotBeFan(artistId);
        if (rankOf[artistId][fan] != 0) revert AlreadyRanked(artistId, fan);
        fanAtRank[artistId][rank] = fan;
        rankOf[artistId][fan] = rank;
        emit FanAssigned(artistId, rank, fan);
    }

    /// @notice Artist removes/revokes the fan seated at `rank`.
    ///         Historical contributions and earned reputation are untouched.
    function removeFan(bytes32 artistId, uint8 rank) external onlyArtist(artistId) {
        if (rank == 0 || rank > MAX_FAN_RANK) revert InvalidRank(rank);
        address fan = fanAtRank[artistId][rank];
        if (fan == address(0)) revert NoRankHeld(artistId, fan);
        delete fanAtRank[artistId][rank];
        delete rankOf[artistId][fan];
        emit FanRemoved(artistId, rank, fan);
    }

    /// @notice A fan transfers their own seat (rank + phiWeight move; earned
    ///         reputation and historical attribution do NOT move).
    function transferFanRank(bytes32 artistId, address to) external {
        uint8 rank = rankOf[artistId][msg.sender];
        if (rank == 0) revert NoRankHeld(artistId, msg.sender);
        if (to == address(0)) revert ZeroAddress();
        if (to == _artists[artistId].artistOwner) revert ArtistCannotBeFan(artistId);
        if (rankOf[artistId][to] != 0) revert AlreadyRanked(artistId, to);
        fanAtRank[artistId][rank] = to;
        delete rankOf[artistId][msg.sender];
        rankOf[artistId][to] = rank;
        emit FanRankTransferred(artistId, rank, msg.sender, to);
    }

    // ---------------------------------------------------------------------
    // Contributions
    // ---------------------------------------------------------------------

    /// @dev Resolve the caller's role rank on this artist page, or revert.
    function _editorRank(bytes32 artistId, address account) internal view returns (uint8) {
        if (account == _artists[artistId].artistOwner) return ARTIST_RANK;
        uint8 rank = rankOf[artistId][account];
        if (rank == 0) revert NotAnEditor(artistId, account);
        return rank;
    }

    /// @notice Submit a versioned contribution (proposal) for a content item.
    ///         Callable by the artist or any seated fan of this page.
    ///
    ///         Supersede rule (invariant C), enforced on-chain:
    ///         a fan may replace the active pending proposal only when they are
    ///         the same contributor (revising their own draft) or hold a strictly
    ///         stronger (lower) rank than the pending proposal's snapshot rank.
    ///         The artist bypasses the rule entirely (invariant A).
    function submitContribution(
        bytes32 artistId,
        bytes32 contentItemId,
        bytes32 contentHash,
        string calldata contentURI,
        uint64 parentId
    ) external returns (uint64 contributionId) {
        if (_artists[artistId].artistOwner == address(0)) revert UnknownArtist(artistId);
        if (contentHash == bytes32(0)) revert EmptyContentHash();
        uint8 rank = _editorRank(artistId, msg.sender);

        uint64 activeId = activePendingId[artistId][contentItemId];
        if (activeId != 0) {
            Contribution storage active = _contributions[activeId];
            bool mayReplace =
                rank == ARTIST_RANK || active.contributor == msg.sender || rank < active.roleRank;
            if (!mayReplace) revert StrongerProposalActive(artistId, contentItemId, active.roleRank);
            active.status = Status.SUPERSEDED;
        }

        contributionId = _pushContribution(
            artistId, contentItemId, msg.sender, rank, contentHash, contentURI, parentId, Status.PENDING, false
        );
        activePendingId[artistId][contentItemId] = contributionId;
        if (activeId != 0) emit ContributionSuperseded(artistId, contentItemId, activeId, contributionId);
    }

    /// @notice Artist publishes a new canonical, artist-approved version in one step,
    ///         regardless of any pending proposals or phi weights (invariant A).
    ///         Pending fan proposals remain pending as proposed future corrections.
    function artistPublish(
        bytes32 artistId,
        bytes32 contentItemId,
        bytes32 contentHash,
        string calldata contentURI,
        uint64 parentId
    ) external onlyArtist(artistId) returns (uint64 contributionId) {
        if (contentHash == bytes32(0)) revert EmptyContentHash();
        contributionId = _pushContribution(
            artistId, contentItemId, msg.sender, ARTIST_RANK, contentHash, contentURI, parentId, Status.APPROVED, true
        );
        _makeCanonical(artistId, contentItemId, contributionId);
        emit ArtistPublished(artistId, contentItemId, contributionId, contentHash);
    }

    /// @notice Artist approves any pending contribution — including a weaker-ranked
    ///         one while a stronger pending proposal exists. Artist judgment is final.
    ///         Grants the contributor +1 reputation, exactly once per approval.
    function approveContribution(bytes32 artistId, uint64 contributionId) external onlyArtist(artistId) {
        Contribution storage c = _contribution(contributionId);
        if (c.artistId != artistId) revert WrongArtist(contributionId, artistId);
        if (c.status != Status.PENDING) revert NotPendingContribution(contributionId);

        c.status = Status.APPROVED;
        c.artistApproved = true;
        _makeCanonical(artistId, c.contentItemId, contributionId);
        if (activePendingId[artistId][c.contentItemId] == contributionId) {
            activePendingId[artistId][c.contentItemId] = 0;
        }
        // +1 reputation, exactly once — the PENDING gate above makes re-approving
        // (and thus double-counting) the same contribution impossible
        approvedContributionCount[artistId][c.contributor] += 1;
        emit ArtistApproved(artistId, c.contentItemId, contributionId, c.contributor);
    }

    /// @notice Artist rejects a pending contribution. No reputation is granted.
    function rejectContribution(bytes32 artistId, uint64 contributionId) external onlyArtist(artistId) {
        Contribution storage c = _contribution(contributionId);
        if (c.artistId != artistId) revert WrongArtist(contributionId, artistId);
        if (c.status != Status.PENDING) revert NotPendingContribution(contributionId);
        c.status = Status.REJECTED;
        if (activePendingId[artistId][c.contentItemId] == contributionId) {
            activePendingId[artistId][c.contentItemId] = 0;
        }
        emit ContributionRejected(artistId, c.contentItemId, contributionId);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function contributionCount() external view returns (uint256) {
        return _contributions.length - 1; // minus sentinel
    }

    function getContribution(uint64 contributionId) external view returns (Contribution memory) {
        return _contribution(contributionId);
    }

    /// @notice Canonical resolution for a content item (invariant B):
    ///         1. latest artist-approved version;
    ///         2. else the strongest eligible pending proposal;
    ///         3. else 0 — render the legacy/AI seed content.
    /// @return contributionId 0 when the legacy seed applies
    /// @return artistApproved whether the returned version is artist-approved
    function canonicalOf(bytes32 artistId, bytes32 contentItemId)
        external
        view
        returns (uint64 contributionId, bool artistApproved)
    {
        uint64 approvedId = canonicalApprovedId[artistId][contentItemId];
        if (approvedId != 0) return (approvedId, true);
        return (activePendingId[artistId][contentItemId], false);
    }

    /// @notice The strongest (and only) active pending proposal for an item, 0 if none.
    function strongestPendingOf(bytes32 artistId, bytes32 contentItemId) external view returns (uint64) {
        return activePendingId[artistId][contentItemId];
    }

    /// @notice Role of an account on an artist page, for the frontend role gate.
    /// @return isArtist  account is the artist root authority
    /// @return fanRank   1..96 when the account holds a seat, else 0
    function roleOf(bytes32 artistId, address account) external view returns (bool isArtist, uint8 fanRank) {
        isArtist = account == _artists[artistId].artistOwner && account != address(0);
        fanRank = rankOf[artistId][account];
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _contribution(uint64 contributionId) internal view returns (Contribution storage) {
        if (contributionId == 0 || contributionId >= _contributions.length) {
            revert UnknownContribution(contributionId);
        }
        return _contributions[contributionId];
    }

    function _pushContribution(
        bytes32 artistId,
        bytes32 contentItemId,
        address contributor,
        uint8 roleRank,
        bytes32 contentHash,
        string calldata contentURI,
        uint64 parentId,
        Status status,
        bool artistApproved
    ) internal returns (uint64 contributionId) {
        if (parentId != 0 && parentId >= _contributions.length) revert UnknownContribution(parentId);
        contributionId = uint64(_contributions.length);
        _contributions.push(
            Contribution({
                artistId: artistId,
                contentItemId: contentItemId,
                contributor: contributor,
                roleRank: roleRank,
                phiWeightX36: phiWeightX36(roleRank),
                contentHash: contentHash,
                parentId: parentId,
                timestamp: uint64(block.timestamp),
                status: status,
                artistApproved: artistApproved,
                contentURI: contentURI
            })
        );
        emit ContributionSubmitted(
            artistId,
            contentItemId,
            contributionId,
            contributor,
            roleRank,
            phiWeightX36(roleRank),
            contentHash,
            contentURI,
            parentId
        );
    }

    /// @dev Latest artist approval supersedes the previous approved version (kept in history).
    function _makeCanonical(bytes32 artistId, bytes32 contentItemId, uint64 contributionId) internal {
        uint64 previous = canonicalApprovedId[artistId][contentItemId];
        if (previous != 0) {
            _contributions[previous].status = Status.SUPERSEDED;
            // artistApproved flag stays true on the superseded record — the historical
            // approval remains verifiable; only canonical pointer moves.
            emit ContributionSuperseded(artistId, contentItemId, previous, contributionId);
        }
        canonicalApprovedId[artistId][contentItemId] = contributionId;
    }
}
