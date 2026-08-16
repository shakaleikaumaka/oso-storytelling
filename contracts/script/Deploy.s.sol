// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OsoSongbook} from "../src/OsoSongbook.sol";

/// Deploys the OsoSongbook registry and (optionally) registers the first artist.
///
/// Local (anvil):
///   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 \
///     --private-key $DEPLOYER_KEY --broadcast
///
/// Sepolia:
///   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $DEPLOYER_KEY --broadcast --verify
///
/// Env (see ../.env.example — never commit real values):
///   DEPLOYER_KEY        deployer/private key (becomes contractOwner)
///   FIRST_ARTIST_SLUG   optional, e.g. "shaka"
///   FIRST_ARTIST_ADDR   optional, the artist's wallet address
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        OsoSongbook sb = new OsoSongbook();
        console.log("OsoSongbook deployed:", address(sb));

        string memory slug = vm.envOr("FIRST_ARTIST_SLUG", string(""));
        address artist = vm.envOr("FIRST_ARTIST_ADDR", address(0));
        if (bytes(slug).length > 0 && artist != address(0)) {
            bytes32 id = sb.registerArtist(slug, artist);
            console.log("Registered artist slug:", slug);
            console.logBytes32(id);
        }
        vm.stopBroadcast();
    }
}
