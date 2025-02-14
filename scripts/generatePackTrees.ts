import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

// Trinity addresses
const trinityHolders = [
  // store array of addresses that can presale
  ["0x1111111111111111111111111111111111111111"],
  ["0x2222222222222222222222222222222222222222"],
];

// Build the Merkle tree for addresses
const trinityTree = StandardMerkleTree.of(trinityHolders, ["address"]);
console.log("Trinity Root:", trinityTree.root);

// Print proofs for each
for (const [i, leaf] of trinityTree.entries()) {
  console.log("Leaf", i, leaf, trinityTree.getProof(i));
}

// ID->saleNumber pairs
// For sale #1: IDs 1..300
// For demonstration, let's just do a small example:
const idToSale = [
  [1, 1],
  [2, 1],
  [3, 1],
  [301, 2],
  [302, 2],
  [303, 2],
];
const idToSaleTree = StandardMerkleTree.of(idToSale, ["uint256", "uint256"]);
console.log("ID->saleNumber Root:", idToSaleTree.root);

for (const [i, leaf] of idToSaleTree.entries()) {
  console.log("Leaf", i, leaf, idToSaleTree.getProof(i));
}
