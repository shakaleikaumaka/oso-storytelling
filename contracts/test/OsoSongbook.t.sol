// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OsoSongbook} from "../src/OsoSongbook.sol";

/// Full test matrix from the OSO Web3 Songbook spec (§29) plus the §30
/// acceptance flow and the three §35 invariants A/B/C.
contract OsoSongbookTest is Test {
    OsoSongbook sb;

    address owner = makeAddr("platformOwner");
    address shaka = makeAddr("shaka");
    address matteo = makeAddr("matteo");
    address fan1 = makeAddr("fan1");
    address fan4 = makeAddr("fan4");
    address fan12 = makeAddr("fan12");
    address fan13 = makeAddr("fan13");
    address fan20 = makeAddr("fan20");
    address stranger = makeAddr("stranger");

    bytes32 artistId; // shaka
    bytes32 constant ITEM_SONGBOOK = keccak256("song:todo-es-posible:songbook");
    bytes32 constant ITEM_BIO = keccak256("bio");

    bytes32 constant HASH_A = keccak256("content A");
    bytes32 constant HASH_B = keccak256("content B");
    bytes32 constant HASH_C = keccak256("content C");

    function setUp() public {
        vm.prank(owner);
        sb = new OsoSongbook();
        vm.prank(owner);
        artistId = sb.registerArtist("shaka", shaka);
    }

    // -- helpers ----------------------------------------------------------

    function _assignFans() internal {
        vm.startPrank(shaka);
        sb.assignFan(artistId, 1, fan1);
        sb.assignFan(artistId, 4, fan4);
        sb.assignFan(artistId, 12, fan12);
        sb.assignFan(artistId, 13, fan13);
        sb.assignFan(artistId, 20, fan20);
        vm.stopPrank();
    }

    function _submit(address who, bytes32 hash_) internal returns (uint64) {
        vm.prank(who);
        return sb.submitContribution(artistId, ITEM_SONGBOOK, hash_, "local-dev://x", 0);
    }

    // =====================================================================
    // Artist registration
    // =====================================================================

    function test_ownerCanRegisterArtist() public {
        vm.prank(owner);
        bytes32 id = sb.registerArtist("matteo-tambussi", matteo);
        assertEq(id, keccak256("matteo-tambussi"));
        assertEq(sb.artistOwnerOf(id), matteo);
        assertEq(sb.getArtist(id).slug, "matteo-tambussi");
    }

    function test_nonOwnerCannotRegisterArtist() public {
        vm.prank(stranger);
        vm.expectRevert(OsoSongbook.NotContractOwner.selector);
        sb.registerArtist("x", stranger);
    }

    function test_zeroAddressArtistRejected() public {
        vm.prank(owner);
        vm.expectRevert(OsoSongbook.ZeroAddress.selector);
        sb.registerArtist("x", address(0));
    }

    function test_emptySlugRejected() public {
        vm.prank(owner);
        vm.expectRevert(OsoSongbook.EmptySlug.selector);
        sb.registerArtist("", stranger);
    }

    function test_duplicateSlugRejected() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.ArtistAlreadyRegistered.selector, artistId));
        sb.registerArtist("shaka", matteo);
    }

    // =====================================================================
    // Fan hierarchy
    // =====================================================================

    function test_artistCanAssignRanks1To96() public {
        vm.startPrank(shaka);
        for (uint8 r = 1; r <= 96; r++) {
            address f = address(uint160(0xF000 + r));
            sb.assignFan(artistId, r, f);
            assertEq(sb.fanAtRank(artistId, r), f);
            assertEq(sb.rankOf(artistId, f), r);
        }
        vm.stopPrank();
    }

    function test_nonArtistCannotAssignFan() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.assignFan(artistId, 1, fan1);
        // the PLATFORM OWNER cannot either — no backdoor (§28.5)
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.assignFan(artistId, 1, fan1);
    }

    function test_duplicateRankRejected() public {
        _assignFans();
        vm.prank(shaka);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.RankOccupied.selector, artistId, 1));
        sb.assignFan(artistId, 1, stranger);
    }

    function test_duplicateAddressRejected() public {
        _assignFans();
        vm.prank(shaka);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.AlreadyRanked.selector, artistId, fan1));
        sb.assignFan(artistId, 2, fan1);
    }

    function test_invalidRankRejected() public {
        vm.startPrank(shaka);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.InvalidRank.selector, 0));
        sb.assignFan(artistId, 0, fan1);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.InvalidRank.selector, 97));
        sb.assignFan(artistId, 97, fan1);
        vm.stopPrank();
    }

    function test_artistCannotOccupyFanSlot() public {
        vm.prank(shaka);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.ArtistCannotBeFan.selector, artistId));
        sb.assignFan(artistId, 1, shaka);
    }

    function test_fanTransferWorks() public {
        _assignFans();
        vm.prank(fan1);
        sb.transferFanRank(artistId, stranger);
        assertEq(sb.fanAtRank(artistId, 1), stranger);
        assertEq(sb.rankOf(artistId, stranger), 1);
        assertEq(sb.rankOf(artistId, fan1), 0);
    }

    function test_fanTransferUniquenessRules() public {
        _assignFans();
        vm.prank(fan1);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.AlreadyRanked.selector, artistId, fan4));
        sb.transferFanRank(artistId, fan4); // recipient already seated
        vm.prank(fan1);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.ArtistCannotBeFan.selector, artistId));
        sb.transferFanRank(artistId, shaka); // artist can't take a seat
        vm.prank(fan1);
        vm.expectRevert(OsoSongbook.ZeroAddress.selector);
        sb.transferFanRank(artistId, address(0));
    }

    function test_unauthorizedTransferFails() public {
        _assignFans();
        vm.prank(stranger); // holds no rank
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NoRankHeld.selector, artistId, stranger));
        sb.transferFanRank(artistId, makeAddr("other"));
    }

    function test_artistRemovalWorks() public {
        _assignFans();
        vm.prank(shaka);
        sb.removeFan(artistId, 4);
        assertEq(sb.fanAtRank(artistId, 4), address(0));
        assertEq(sb.rankOf(artistId, fan4), 0);
        // non-artist cannot remove
        vm.prank(fan1);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.removeFan(artistId, 1);
    }

    // =====================================================================
    // Artist sovereignty
    // =====================================================================

    function test_platformOwnerCannotEditContent() public {
        // owner is neither artist nor fan => cannot submit, publish, approve, or reassign
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotAnEditor.selector, artistId, owner));
        sb.submitContribution(artistId, ITEM_BIO, HASH_A, "", 0);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.artistPublish(artistId, ITEM_BIO, HASH_A, "", 0);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.transferArtistRole(artistId, owner);
        vm.stopPrank();
    }

    function test_fanCannotRemoveArtist() public {
        _assignFans();
        vm.prank(fan1);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.transferArtistRole(artistId, fan1);
    }

    function test_onlyArtistTransfersArtistRole_andNewArtistHasRootAuthority() public {
        vm.prank(shaka);
        sb.transferArtistRole(artistId, matteo);
        assertEq(sb.artistOwnerOf(artistId), matteo);
        // previous artist lost root authority
        vm.prank(shaka);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.artistPublish(artistId, ITEM_BIO, HASH_A, "", 0);
        // new artist can immediately publish canonical content
        vm.prank(matteo);
        uint64 id = sb.artistPublish(artistId, ITEM_BIO, HASH_A, "local-dev://bio", 0);
        (uint64 canonical, bool approved) = sb.canonicalOf(artistId, ITEM_BIO);
        assertEq(canonical, id);
        assertTrue(approved);
    }

    function test_artistTransferToSeatedFanRejected() public {
        _assignFans();
        vm.prank(shaka);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.AlreadyRanked.selector, artistId, fan1));
        sb.transferArtistRole(artistId, fan1);
    }

    // =====================================================================
    // Phi values (1e36 fixed point)
    // =====================================================================

    function test_phiFirstValuesMatchGoldenSequence() public view {
        // expected values (1e36 scale), phi = (1+sqrt(5))/2, weight = 100/phi^(rank+1)
        // tolerance 1e-12 relative — iterated fixed-point multiplication drift
        assertApproxEqRel(sb.phiWeightX36(0), 61803398874989484820458683436563811772, 1e6); // 61.8033... (artist)
        assertApproxEqRel(sb.phiWeightX36(1), 38196601125010515179541316563436188227, 1e6); // fan 1
        assertApproxEqRel(sb.phiWeightX36(2), 23606797749978969640917366873127623544, 1e6); // fan 2
        assertApproxEqRel(sb.phiWeightX36(3), 14589803375031545538623949690308564683, 1e6); // fan 3
        assertApproxEqRel(sb.phiWeightX36(4), 9016994374947424102293417182819058860, 1e6); // fan 4
        assertApproxEqRel(sb.phiWeightX36(5), 5572809000084121436330532507489505823, 1e6); // fan 5
    }

    function test_phiMonotonicDecline() public view {
        uint256 prev = type(uint256).max;
        for (uint8 r = 0; r <= 96; r++) {
            uint256 w = sb.phiWeightX36(r);
            assertLt(w, prev, "phi must strictly decline");
            prev = w;
        }
    }

    function test_phiFan96NonZeroHighPrecision() public view {
        uint256 w96 = sb.phiWeightX36(96);
        // ~5.2e-19 at 1e36 scale => ~5.2e17 — must be far above zero
        assertGt(w96, 1e17, "rank 96 must keep meaningful precision");
        // and it would have been ZERO in 1e18 WAD (value < 1e-18? no: 5.2e-19 < 1e-18 => 0 in WAD)
        assertLt(w96 / 1e18, 1, "demonstrates 1e18 WAD would floor rank 96 to zero");
    }

    function test_phiInvalidRankReverts() public {
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.InvalidRank.selector, 97));
        sb.phiWeightX36(97);
    }

    // =====================================================================
    // Contributions
    // =====================================================================

    function test_editorCanSubmit_snapshotsStored() public {
        _assignFans();
        vm.prank(fan12);
        uint64 id = sb.submitContribution(artistId, ITEM_SONGBOOK, HASH_A, "local-dev://a", 0);
        OsoSongbook.Contribution memory c = sb.getContribution(id);
        assertEq(c.contributor, fan12);
        assertEq(c.roleRank, 12);
        assertEq(c.phiWeightX36, sb.phiWeightX36(12));
        assertEq(c.contentHash, HASH_A);
        assertEq(c.contentURI, "local-dev://a");
        assertEq(uint8(c.status), uint8(OsoSongbook.Status.PENDING));
        assertFalse(c.artistApproved);
    }

    function test_unauthorizedCannotSubmit() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotAnEditor.selector, artistId, stranger));
        sb.submitContribution(artistId, ITEM_SONGBOOK, HASH_A, "", 0);
    }

    function test_contributionIdsIncrement() public {
        _assignFans();
        uint64 a = _submit(fan12, HASH_A);
        vm.prank(fan1);
        uint64 b = sb.submitContribution(artistId, ITEM_BIO, HASH_B, "", 0);
        assertEq(a, 1);
        assertEq(b, 2);
        assertEq(sb.contributionCount(), 2);
    }

    function test_emptyHashRejected() public {
        _assignFans();
        vm.prank(fan1);
        vm.expectRevert(OsoSongbook.EmptyContentHash.selector);
        sb.submitContribution(artistId, ITEM_SONGBOOK, bytes32(0), "", 0);
    }

    function test_snapshotImmutableAfterRankChanges() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        // remove the fan afterwards — history must not rewrite
        vm.prank(shaka);
        sb.removeFan(artistId, 12);
        OsoSongbook.Contribution memory c = sb.getContribution(id);
        assertEq(c.contributor, fan12);
        assertEq(c.roleRank, 12);
        assertEq(c.phiWeightX36, sb.phiWeightX36(12));
    }

    // =====================================================================
    // Priority rules (invariant C + A)
    // =====================================================================

    function test_weakerBlockedByStrongerPending() public {
        _assignFans();
        _submit(fan12, HASH_A); // fan 12 active
        // fan 20 (weaker) blocked
        vm.prank(fan20);
        vm.expectRevert(
            abi.encodeWithSelector(OsoSongbook.StrongerProposalActive.selector, artistId, ITEM_SONGBOOK, 12)
        );
        sb.submitContribution(artistId, ITEM_SONGBOOK, HASH_B, "", 0);
        // fan 13 (weaker) blocked
        vm.prank(fan13);
        vm.expectRevert(
            abi.encodeWithSelector(OsoSongbook.StrongerProposalActive.selector, artistId, ITEM_SONGBOOK, 12)
        );
        sb.submitContribution(artistId, ITEM_SONGBOOK, HASH_B, "", 0);
    }

    function test_strongerCanSupersedeWeaker() public {
        _assignFans();
        uint64 weak = _submit(fan12, HASH_A);
        uint64 strong = _submit(fan4, HASH_B); // fan 4 supersedes fan 12
        assertEq(uint8(sb.getContribution(weak).status), uint8(OsoSongbook.Status.SUPERSEDED));
        assertEq(sb.strongestPendingOf(artistId, ITEM_SONGBOOK), strong);
    }

    function test_contributorCanReviseOwnPending() public {
        _assignFans();
        uint64 v1 = _submit(fan12, HASH_A);
        uint64 v2 = _submit(fan12, HASH_B); // same fan revises own draft
        assertEq(uint8(sb.getContribution(v1).status), uint8(OsoSongbook.Status.SUPERSEDED));
        assertEq(sb.strongestPendingOf(artistId, ITEM_SONGBOOK), v2);
    }

    function test_artistCanAlwaysSubmit() public {
        _assignFans();
        _submit(fan1, HASH_A); // strongest fan pending
        uint64 id = _submit(shaka, HASH_B); // artist bypasses hierarchy
        assertEq(sb.getContribution(id).roleRank, 0);
        assertEq(sb.strongestPendingOf(artistId, ITEM_SONGBOOK), id);
    }

    function test_artistCanAlwaysDirectPublish() public {
        _assignFans();
        _submit(fan1, HASH_A); // strongest fan pending — irrelevant
        vm.prank(shaka);
        uint64 pub = sb.artistPublish(artistId, ITEM_SONGBOOK, HASH_B, "local-dev://b", 0);
        (uint64 canonical, bool approved) = sb.canonicalOf(artistId, ITEM_SONGBOOK);
        assertEq(canonical, pub);
        assertTrue(approved);
        assertTrue(sb.getContribution(pub).artistApproved);
    }

    function test_approvedRemainsCanonicalDespiteNewFanProposals() public {
        _assignFans();
        uint64 first = _submit(fan12, HASH_A);
        vm.prank(shaka);
        sb.approveContribution(artistId, first);
        // new stronger fan proposal arrives — must NOT displace the approved version
        uint64 newer = _submit(fan1, HASH_B);
        (uint64 canonical, bool approved) = sb.canonicalOf(artistId, ITEM_SONGBOOK);
        assertEq(canonical, first, "invariant B: approval beats phiWeight");
        assertTrue(approved);
        assertEq(sb.strongestPendingOf(artistId, ITEM_SONGBOOK), newer, "proposal stays as future correction");
    }

    function test_artistCanApproveWeakerWhileStrongerPendingExists() public {
        _assignFans();
        // fan20 submits on BIO, fan1 submits on SONGBOOK — then artist approves fan20's
        vm.prank(fan20);
        uint64 weakId = sb.submitContribution(artistId, ITEM_BIO, HASH_A, "", 0);
        _submit(fan1, HASH_B);
        vm.prank(shaka);
        sb.approveContribution(artistId, weakId);
        (uint64 canonical,) = sb.canonicalOf(artistId, ITEM_BIO);
        assertEq(canonical, weakId);
    }

    function test_latestArtistApprovalBecomesCanonical() public {
        _assignFans();
        uint64 a = _submit(fan12, HASH_A);
        vm.prank(shaka);
        sb.approveContribution(artistId, a);
        uint64 b = _submit(fan4, HASH_B);
        vm.prank(shaka);
        sb.approveContribution(artistId, b);
        (uint64 canonical,) = sb.canonicalOf(artistId, ITEM_SONGBOOK);
        assertEq(canonical, b);
        // the earlier approved version is preserved in history, still marked artist-approved
        OsoSongbook.Contribution memory old = sb.getContribution(a);
        assertEq(uint8(old.status), uint8(OsoSongbook.Status.SUPERSEDED));
        assertTrue(old.artistApproved, "historical approval stays verifiable");
    }

    function test_onlyArtistApprovesRejects() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        vm.prank(fan1);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.approveContribution(artistId, id);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotArtist.selector, artistId));
        sb.rejectContribution(artistId, id);
    }

    function test_rejectClearsPending() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        vm.prank(shaka);
        sb.rejectContribution(artistId, id);
        assertEq(uint8(sb.getContribution(id).status), uint8(OsoSongbook.Status.REJECTED));
        assertEq(sb.strongestPendingOf(artistId, ITEM_SONGBOOK), 0);
        // a previously-blocked weaker fan may now submit
        uint64 again = _submit(fan20, HASH_B);
        assertEq(sb.strongestPendingOf(artistId, ITEM_SONGBOOK), again);
    }

    // =====================================================================
    // Reputation
    // =====================================================================

    function test_approvalGrantsPlusOne() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        vm.prank(shaka);
        sb.approveContribution(artistId, id);
        assertEq(sb.approvedContributionCount(artistId, fan12), 1);
    }

    function test_rejectionGrantsNothing() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        vm.prank(shaka);
        sb.rejectContribution(artistId, id);
        assertEq(sb.approvedContributionCount(artistId, fan12), 0);
    }

    function test_approvalCannotDoubleCount() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        vm.startPrank(shaka);
        sb.approveContribution(artistId, id);
        vm.expectRevert(abi.encodeWithSelector(OsoSongbook.NotPendingContribution.selector, id));
        sb.approveContribution(artistId, id); // second approval of same contribution reverts
        vm.stopPrank();
        assertEq(sb.approvedContributionCount(artistId, fan12), 1);
    }

    function test_reputationSurvivesRankTransferAndIsNotTransferred() public {
        _assignFans();
        uint64 id = _submit(fan12, HASH_A);
        vm.prank(shaka);
        sb.approveContribution(artistId, id);
        // fan12 hands the seat to a friend
        vm.prank(fan12);
        sb.transferFanRank(artistId, stranger);
        assertEq(sb.approvedContributionCount(artistId, fan12), 1, "reputation stays with the earner");
        assertEq(sb.approvedContributionCount(artistId, stranger), 0, "reputation does not transfer");
        // and survives outright removal too
        vm.prank(shaka);
        sb.removeFan(artistId, 12);
        assertEq(sb.approvedContributionCount(artistId, fan12), 1);
    }

    // =====================================================================
    // Platform ownership (two-step)
    // =====================================================================

    function test_twoStepOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        sb.transferContractOwnership(newOwner);
        assertEq(sb.contractOwner(), owner, "no change until accepted");
        vm.prank(stranger);
        vm.expectRevert(OsoSongbook.NotPendingOwner.selector);
        sb.acceptContractOwnership();
        vm.prank(newOwner);
        sb.acceptContractOwnership();
        assertEq(sb.contractOwner(), newOwner);
    }

    // =====================================================================
    // §30 acceptance flow, end-to-end (contract side)
    // =====================================================================

    function test_acceptanceFlow_endToEnd() public {
        // 5. roles resolve
        (bool isArtist, uint8 rank) = sb.roleOf(artistId, shaka);
        assertTrue(isArtist);
        assertEq(rank, 0);
        // 6. artist assigns fan rank #1
        vm.prank(shaka);
        sb.assignFan(artistId, 1, fan1);
        // 8. fan sees rank 1 and correct phiWeight (~38.1966e36)
        (, uint8 fRank) = sb.roleOf(artistId, fan1);
        assertEq(fRank, 1);
        assertApproxEqRel(sb.phiWeightX36(1), 38196601125010515179541316563436188228, 1e6);
        // 9-13. fan edits songbook, hash computed off-chain, submits, sequential id
        vm.prank(fan1);
        uint64 c1 = sb.submitContribution(artistId, ITEM_SONGBOOK, HASH_A, "local-dev://a", 0);
        assertEq(c1, 1);
        // 14. pending status + contributor + phiWeight displayable
        OsoSongbook.Contribution memory c = sb.getContribution(c1);
        assertEq(uint8(c.status), uint8(OsoSongbook.Status.PENDING));
        // 15. weaker fan is blocked
        vm.prank(shaka);
        sb.assignFan(artistId, 20, fan20);
        vm.prank(fan20);
        vm.expectRevert(
            abi.encodeWithSelector(OsoSongbook.StrongerProposalActive.selector, artistId, ITEM_SONGBOOK, 1)
        );
        sb.submitContribution(artistId, ITEM_SONGBOOK, HASH_B, "", 0);
        // 16. a stronger editor could supersede a weaker proposal — see
        //     test_strongerCanSupersedeWeaker; here rank 1 is already strongest.
        // 17-21. artist approves; canonical; +1 reputation
        vm.prank(shaka);
        sb.approveContribution(artistId, c1);
        (uint64 canonical, bool approved) = sb.canonicalOf(artistId, ITEM_SONGBOOK);
        assertEq(canonical, c1);
        assertTrue(approved);
        assertEq(sb.approvedContributionCount(artistId, fan1), 1);
        // 22. hash verifiable
        assertEq(sb.getContribution(c1).contentHash, HASH_A);
        // 23-25. artist direct edit + publish becomes canonical regardless of phi
        vm.prank(shaka);
        uint64 pub = sb.artistPublish(artistId, ITEM_SONGBOOK, HASH_C, "local-dev://c", c1);
        (canonical, approved) = sb.canonicalOf(artistId, ITEM_SONGBOOK);
        assertEq(canonical, pub, "invariant A: the artist always prevails");
        assertTrue(approved);
    }
}
