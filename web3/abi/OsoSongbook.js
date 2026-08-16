// Auto-generated from contracts: forge inspect OsoSongbook abi --json  (commit: web3-songbook MVP)
export const OSO_SONGBOOK_ABI =
[
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ARTIST_RANK",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "INV_PHI_X36",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FAN_RANK",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PHI_SCALE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptContractOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "activePendingId",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approveContribution",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approvedContributionCount",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "editor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "artistIdFromSlug",
    "inputs": [
      {
        "name": "slug",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "artistOwnerOf",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "artistPublish",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentURI",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "parentId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "assignFan",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "fan",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "canonicalApprovedId",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "canonicalOf",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "artistApproved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contractOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contributionCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fanAtRank",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "fan",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getArtist",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "a",
        "type": "tuple",
        "internalType": "struct OsoSongbook.Artist",
        "components": [
          {
            "name": "artistOwner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "registeredAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "slug",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getContribution",
    "inputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct OsoSongbook.Contribution",
        "components": [
          {
            "name": "artistId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "contentItemId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "contributor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "roleRank",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "phiWeightX36",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "contentHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "parentId",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "timestamp",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum OsoSongbook.Status"
          },
          {
            "name": "artistApproved",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "contentURI",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingContractOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "phiWeightX36",
    "inputs": [
      {
        "name": "roleRank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "weight",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "rankOf",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "fan",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "rank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerArtist",
    "inputs": [
      {
        "name": "slug",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "artistOwner_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rejectContribution",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeFan",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "roleOf",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "isArtist",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "fanRank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "strongestPendingOf",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "submitContribution",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentURI",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "parentId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferArtistRole",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "newArtist",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferContractOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFanRank",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ArtistApproved",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "contributor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ArtistPublished",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ArtistRegistered",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "artistOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "slug",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ArtistTransferred",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousArtist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newArtist",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ContributionRejected",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ContributionSubmitted",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "contributor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "roleRank",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "phiWeightX36",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "contentHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "contentURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "parentId",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ContributionSuperseded",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "contributionId",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "byContributionId",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FanAssigned",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "fan",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FanRankTransferred",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FanRemoved",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "fan",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyRanked",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ArtistAlreadyRegistered",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ArtistCannotBeFan",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "EmptyContentHash",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptySlug",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRank",
    "inputs": [
      {
        "name": "rank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "NoRankHeld",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotAnEditor",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotArtist",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotContractOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotPendingContribution",
    "inputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotPendingOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RankOccupied",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "rank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "StrongerProposalActive",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "contentItemId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "strongerRank",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownArtist",
    "inputs": [
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnknownContribution",
    "inputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "WrongArtist",
    "inputs": [
      {
        "name": "contributionId",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "artistId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
]
;
