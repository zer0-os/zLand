import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Signer } from 'ethers';
import hre from "hardhat";
import fs from "fs";
import { BondingTokenLinear, BondingTokenQuadratic } from "../typechain-types/contracts/resources/fees";
import { ERC20Token } from "../typechain-types/contracts/mock";
const { ethers } = hre;

type BondingTokenType = BondingTokenLinear | BondingTokenQuadratic;

const contractNames = [
  { name: "BondingToken", tokenName: "UNREFINED COAL", tokenSymbol: "GOLD" }
];

describe("BondingToken Tests", function () {
  for (const contract of contractNames) {
    describe(`${contract.name} simulation tests`, function () {
      async function deploy() {
        const [deployer, user, user1, user2, user3, strategicUser] = await hre.ethers.getSigners();
        
        const userAddress = await user.getAddress();
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();
        const user3Address = await user3.getAddress();
        const strategicUserAddress = await strategicUser.getAddress();

        const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
        const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
        const reserveTokenAddress = await reserveToken.getAddress();

        const bondingTokenFactory = await hre.ethers.getContractFactory(contract.name);
        const bondingToken = await bondingTokenFactory.deploy(contract.tokenName, contract.tokenSymbol, reserveTokenAddress, 0, 0) as BondingTokenType;
        const bondingTokenAddress = await bondingToken.getAddress();

        return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address , strategicUser, strategicUserAddress};
      }

      function getRandomAmount(min: bigint, max: bigint): bigint {
        const range = max - min + 1n;
        const rand = BigInt(Math.floor(Math.random() * Number(range))) + min;
        return rand;
      }

      const basis = 100000;
      //const entryFees = [0, 100, 1000, 10000, basis/2, basis]; // 0%, .1%, 1%, 10%, 50%, 100% (expect fail)
      //const exitFees = [0, 100, 1000, 10000, basis/2, basis]; // 0%, .1%, 1%, 10%, 50%, 100% (expect fail)

      //const entryFees = [basis/2 + 1, basis/2, 10000, 1000, 100, 0]; // 0%, .1%, 1%, 10%, 50%, >50% (expect fail)
      //const exitFees = [basis/2 + 1, basis/2, 10000, 1000, 100, 0]; // 0%, .1%, 1%, 10%, 50%, >50% (expect fail)

      //const entryFees = [0, 0, 0, 0, 0, 0, 0]
      //const exitFees = [0, 0, 0, 0, 0, 0, 0]
      
      const exitFees = [0, basis/100000, basis/10000, basis/1000, basis/100, basis/10, basis/2, basis/2 + 1]; // 0%, .1%, 1%, 10%, 50%, >50% (expect fail)
      const entryFees = [basis/2 + 1, basis/2, basis/10, basis/100, basis/1000, basis/10000, basis/100000, 0]; // 0%, .1%, 1%, 10%, 50%, >50% (expect fail)

      const numUsers = [1, 2, 3, 4];

      async function getExpectedShares(bondingToken: BondingTokenType, assets: bigint) {
        return await bondingToken.previewDeposit(assets);
      }

      async function getExpectedAssets(bondingToken: BondingTokenType, shares: bigint) {
        return await bondingToken.previewRedeem(shares);
      }

      const allData: {
        users: { assets: string[], shares: string[] }[],
        totalSupply: string[],
        totalAssets: string[],
        tokenPrices: string[]
      } = {
        users: [],
        totalSupply: [],
        totalAssets: [],
        tokenPrices: []
      };

      describe('Simulate economy with random deposits and redeems', function () {
        let bondingToken: BondingTokenType;
        let bondingTokenAddress: string;
        let reserveToken: ERC20Token;
        let reserveTokenAddress: string;
        let users: Signer[];
        let userAddresses: string[];
        let strategicUser: Signer;
        let strategicUserAddress: string;

        const initialMintAmount = 500n * 10n ** 18n; // Mint 500 ether in wei

        before(async function () {
          const deployment = await loadFixture(deploy);
          bondingToken = deployment.bondingToken;
          bondingTokenAddress = deployment.bondingTokenAddress;
          reserveToken = deployment.reserveToken;
          reserveTokenAddress = deployment.reserveTokenAddress;
          users = [deployment.user, deployment.user1, deployment.user2, deployment.user3];
          userAddresses = [deployment.userAddress, deployment.user1Address, deployment.user2Address, deployment.user3Address];
          strategicUser = deployment.strategicUser;
          strategicUserAddress = deployment.strategicUserAddress;

          // Mint and approve initial amounts for each user
          for (const user of users) {
            const userAddress = await user.getAddress();
            await reserveToken.mint(userAddress, initialMintAmount);
            await reserveToken.connect(user).approve(bondingTokenAddress, initialMintAmount);
          }

          // Initialize allData.users array with correct length
          users.forEach((_, index) => {
            allData.users[index] = { assets: [], shares: [] };
          });

          // Initial token donation to set price
          //const initialDonationAmount = 5n * 10n ** 18n; // 5 ether in wei

          //await reserveToken.mint(users[0].getAddress(), initialDonationAmount);
          //await reserveToken.connect(users[0]).transfer(bondingTokenAddress, initialDonationAmount);
          //allData.totalSupply.push((await bondingToken.totalSupply()).toString());
          //allData.totalAssets.push((await bondingToken.totalAssets()).toString());
          //allData.tokenPrices.push((await bondingToken.convertToAssets(10n ** 18n)).toString());
        });
        it(`should deposit for strategic user`, async function () {
          await expect(bondingToken.connect(strategicUser).deposit(ethers.parseEther("1"), strategicUserAddress));
        });
        entryFees.forEach(entryFee => {
          exitFees.forEach(exitFee => {
            it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
              if (basis >= entryFee * 2) {
                await bondingToken.setEntryFee(entryFee);
              } else {
                await expect(bondingToken.setEntryFee(entryFee)).to.be.revertedWith("Fee exceeds 50 percent");
              }
          
              if (basis >= exitFee * 2) {
                  await bondingToken.setExitFee(exitFee);
              } else {
                await expect(bondingToken.setExitFee(exitFee)).to.be.revertedWith("Fee exceeds 50 percent");
              }
            });

            numUsers.forEach(userCount => {
              for (let i = 0; i < 3; i++) {
                const rand = getRandomAmount(0n, 100n);
                const depositOrRedeem = rand < 50;
            
                if (depositOrRedeem) {
                  it(`should deposit for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                    const selectedUsers = users.slice(0, userCount);
            
                    for (const user of selectedUsers) {

                      const userAddress = await user.getAddress();
                      const balance = await reserveToken.balanceOf(userAddress);
                      const previousBTBalance = await bondingToken.balanceOf(userAddress);
                      //console.log("before: ", userAddress, " bt: ", previousBTBalance, " rt: ", balance);

                      const max = await bondingToken.maxDeposit(userAddress);
                      const amount = balance < max ? getRandomAmount(1n, balance - 1n) : getRandomAmount(1n, max - 1n);
                      //console.log("deposit: ", amount);
                      await reserveToken.connect(user).approve(bondingTokenAddress, amount);
                      const expectedShares = await getExpectedShares(bondingToken, amount);
            
                      await expect(bondingToken.connect(user).deposit(amount, userAddress))
                        .to.emit(bondingToken, 'Deposit')
                        .withArgs(userAddress, userAddress, amount, expectedShares);
            
                      const actualShares = await bondingToken.balanceOf(userAddress) - previousBTBalance;
                      expect(actualShares).to.equal(expectedShares);
            
                      const userIndex = users.indexOf(user);
                      const btBalance = await bondingToken.balanceOf(userAddress);
                      allData.users[userIndex].shares.push(btBalance.toString());
            
                      const rtBalance = await reserveToken.balanceOf(userAddress);
                      allData.users[userIndex].assets.push(rtBalance.toString());

                      //console.log(userAddress, " bt: ", btBalance, " rt: ", rtBalance);
                    }
            
                    await recordTokenData();
                  });
                } else {
                  it(`should redeem for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                    const selectedUsers = users.slice(0, userCount);
            
                    for (const user of selectedUsers) {
                      const userAddress = await user.getAddress();
                      const balance = await bondingToken.balanceOf(userAddress);
                      const sharesToRedeem = getRandomAmount(1n, balance - 1n);
                      const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem);
                      const previousRTBalance = await reserveToken.balanceOf(userAddress);
                      
                      const contractBalance = await bondingToken.totalAssets();
                      if(expectedAssets > contractBalance){
                        console.log("exp ", expectedAssets, "bal ", contractBalance);
                      }
            
                      await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                        .to.emit(bondingToken, 'Withdraw')
                        .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);
            
                      const actualAssets = await reserveToken.balanceOf(userAddress) - previousRTBalance;
                      expect(actualAssets).to.equal(expectedAssets);
            
                      const userIndex = users.indexOf(user);
                      await recordUserData(userIndex);
                      await recordTokenData();
                    }
                  });
                }
            
                async function recordUserData(userIndex : number) {
                  const userAddress = users[userIndex];
            
                  const btBalance = await bondingToken.balanceOf(userAddress);
                  allData.users[userIndex].shares.push(btBalance.toString());
            
                  const rtBalance = await reserveToken.balanceOf(userAddress);
                  allData.users[userIndex].assets.push(rtBalance.toString());
                }
            
                async function recordTokenData() {
                  // Calculate and record token data
                  const totalSupply = await bondingToken.totalSupply();
                  const totalAssets = await bondingToken.totalAssets();
                  const checkAmt = 10n ** 18n;
                  const tokenPrice = checkAmt / (await bondingToken.convertToShares(checkAmt) + 1n);
                  allData.tokenPrices.push(tokenPrice.toString());
                  allData.totalSupply.push(totalSupply.toString());
                  allData.totalAssets.push(totalAssets.toString());
                }
              }
            });
          });
        });
        it(`should redeem for strategic user`, async function () {
          let amt = await bondingToken.balanceOf(strategicUserAddress);
          await expect(bondingToken.connect(strategicUser).deposit(amt, strategicUserAddress));
        });
      });

      after(() => {
        // Generate the HTML file for the plots
        generateHTML(allData, `${contract.name}_sim`);
      });
    });

    describe(`${contract.name} unit tests`, function () {
      async function deploy() {
        const [deployer, user, user1, user2, user3] = await hre.ethers.getSigners();
        const userAddress = await user.getAddress();
        const user1Address = await user1.getAddress();
        const user2Address = await user2.getAddress();
        const user3Address = await user3.getAddress();

        const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
        const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
        const reserveTokenAddress = await reserveToken.getAddress();

        const bondingTokenFactory = await hre.ethers.getContractFactory(contract.name);
        const bondingToken = await bondingTokenFactory.deploy(contract.tokenName, contract.tokenSymbol, reserveTokenAddress, 0, 0) as BondingTokenType;
        const bondingTokenAddress = await bondingToken.getAddress();

        return { bondingToken, bondingTokenAddress, reserveToken, reserveTokenAddress, deployer, user, userAddress, user1, user1Address, user2, user2Address, user3, user3Address };
      }

      const entryFees = [0, 100]; // 0%, 1%
      const exitFees = [0, 100]; // 0%, 1%
      const numUsers = [1, 2];

      async function getExpectedShares(bondingToken: BondingTokenType, assets: bigint) {
        return await bondingToken.previewDeposit(assets);
      }

      async function getExpectedAssets(bondingToken: BondingTokenType, shares: bigint) {
        return await bondingToken.previewRedeem(shares);
      }

      const allData: {
        users: { assets: string[], shares: string[] }[],
        totalSupply: string[],
        totalAssets: string[],
        tokenPrices: string[]
      } = {
        users: [],
        totalSupply: [],
        totalAssets: [],
        tokenPrices: []
      };

      describe('Verify edge cases', function () {
        let bondingToken: BondingTokenType;
        let bondingTokenAddress: string;
        let reserveToken: ERC20Token;
        let reserveTokenAddress: string;
        let users: Signer[];
        let userAddresses: string[];
        const initialMintAmount = 1000n * 10n ** 18n; // Mint 1000 ether in wei

        before(async function () {
          const deployment = await loadFixture(deploy);
          bondingToken = deployment.bondingToken;
          bondingTokenAddress = deployment.bondingTokenAddress;
          reserveToken = deployment.reserveToken;
          reserveTokenAddress = deployment.reserveTokenAddress;
          users = [deployment.user, deployment.user1, deployment.user2, deployment.user3];
          userAddresses = [deployment.userAddress, deployment.user1Address, deployment.user2Address, deployment.user3Address];

          // Mint and approve initial amounts for each user
          for (const user of users) {
            const userAddress = await user.getAddress();
            await reserveToken.mint(userAddress, initialMintAmount);
            await reserveToken.connect(user).approve(bondingTokenAddress, initialMintAmount);
          }

          // Initialize allData.users array with correct length
          users.forEach((_, index) => {
            allData.users[index] = { assets: [], shares: [] };
          });

          // Initial token donation to set price
          //const initialDonationAmount = 500n * 10n ** 18n; // 500 ether in wei
          //await reserveToken.mint(users[0].getAddress(), initialDonationAmount);
          //await reserveToken.connect(users[0]).transfer(bondingTokenAddress, initialDonationAmount);
          //allData.totalSupply.push((await bondingToken.totalSupply()).toString());
          //allData.totalAssets.push((await bondingToken.totalAssets()).toString());
          //allData.tokenPrices.push((await bondingToken.convertToAssets(10n ** 18n)).toString());
        });

        entryFees.forEach(entryFee => {
          exitFees.forEach(exitFee => {
            it(`should set entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
              await bondingToken.setEntryFee(entryFee);
              await bondingToken.setExitFee(exitFee);
            });

            numUsers.forEach(userCount => {
              for (let power = 1n; power <= 77n; power++) {
                it(`should deposit 10^${power} for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                  const selectedUsers = users.slice(0, userCount);
                  const deposit = 1n ** power;

                  for (const user of selectedUsers) {
                    const userAddress = await user.getAddress();
                    const previousBTBalance = await bondingToken.balanceOf(userAddress);

                    await reserveToken.mint(userAddress, deposit);
                    await reserveToken.connect(user).approve(bondingTokenAddress, deposit);

                    const max = await bondingToken.maxDeposit(userAddress);
                    let expectedShares: bigint;

                    if (deposit > max) {
                      await expect(bondingToken.connect(user).deposit(deposit, userAddress)).to.be.revertedWithCustomError(bondingToken, "ERC4626ExceededMaxDeposit");
                      continue;
                    } else {
                      expectedShares = await getExpectedShares(bondingToken, deposit);
                    }

                    await expect(bondingToken.connect(user).deposit(deposit, userAddress))
                      .to.emit(bondingToken, 'Deposit')
                      .withArgs(userAddress, userAddress, deposit, expectedShares);

                    const btBalance = await bondingToken.balanceOf(userAddress);
                    const actualShares = btBalance - previousBTBalance;

                    expect(actualShares).to.equal(expectedShares);
                    const userIndex = users.indexOf(user);

                    allData.users[userIndex].shares.push(btBalance.toString());
                  }
                });

                it(`should redeem balance for ${userCount} users with entry fee ${entryFee} bps and exit fee ${exitFee} bps`, async function () {
                  const selectedUsers = users.slice(0, userCount);

                  for (const user of selectedUsers) {
                    const userAddress = await user.getAddress();
                    const sharesToRedeem = await bondingToken.balanceOf(userAddress);
                    const expectedAssets = await getExpectedAssets(bondingToken, sharesToRedeem);
                    const previousRTBalance = await reserveToken.balanceOf(userAddress);
                    
                    await expect(bondingToken.connect(user).redeem(sharesToRedeem, userAddress, userAddress))
                      .to.emit(bondingToken, 'Withdraw')
                      .withArgs(userAddress, userAddress, userAddress, expectedAssets, sharesToRedeem);
                    
                    const actualAssets = await reserveToken.balanceOf(userAddress) - previousRTBalance;

                    expect(actualAssets).to.equal(expectedAssets);
                  }
                });
              }
            });
          });
        });
      });
    });

    function generateHTML(allData: any, contractName: string) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${contractName} Test Results</title>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          ${allData.users.map((userData: any, index: number) => `
            <h2>User ${index + 1} Assets Over Time</h2>
            <canvas id="user${index + 1}AssetsChartLinear"></canvas>
            <canvas id="user${index + 1}AssetsChartLog"></canvas>
            <h2>User ${index + 1} Shares Over Time</h2>
            <canvas id="user${index + 1}SharesChartLinear"></canvas>
            <canvas id="user${index + 1}SharesChartLog"></canvas>
          `).join('')}
          <h2>Total Supply Over Time</h2>
          <canvas id="totalSupplyChartLinear"></canvas>
          <canvas id="totalSupplyChartLog"></canvas>
          <h2>Total Assets Over Time</h2>
          <canvas id="totalAssetsChartLinear"></canvas>
          <canvas id="totalAssetsChartLog"></canvas>
          <h2>Token Price Over Time</h2>
          <canvas id="tokenPriceChartLinear"></canvas>
          <canvas id="tokenPriceChartLog"></canvas>
          <script>
            function createChart(ctx, data, label, yScaleType) {
              new Chart(ctx, {
                type: 'line',
                data: {
                  labels: data.labels,
                  datasets: [{
                    label: label,
                    data: data.values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false
                  }]
                },
                options: {
                  scales: {
                    x: { beginAtZero: true },
                    y: {
                      type: yScaleType,
                      beginAtZero: true,
                      ticks: {
                        callback: function (value) {
                          return Number(value.toString()); // Pass tick values as a string to Number function
                        }
                      }
                    }
                  }
                }
              });
            }
    
            ${allData.users.map((userData: any, index: number) => `
              const user${index + 1}AssetsData = {
                labels: ${JSON.stringify(Array.from({ length: userData.assets.length }, (_, i) => i + 1))},
                values: ${JSON.stringify(userData.assets)}
              };
    
              const user${index + 1}SharesData = {
                labels: ${JSON.stringify(Array.from({ length: userData.shares.length }, (_, i) => i + 1))},
                values: ${JSON.stringify(userData.shares)}
              };
    
              createChart(document.getElementById('user${index + 1}AssetsChartLinear').getContext('2d'), user${index + 1}AssetsData, 'User ${index + 1} Assets (Linear)', 'linear');
              createChart(document.getElementById('user${index + 1}AssetsChartLog').getContext('2d'), user${index + 1}AssetsData, 'User ${index + 1} Assets (Log)', 'logarithmic');
    
              createChart(document.getElementById('user${index + 1}SharesChartLinear').getContext('2d'), user${index + 1}SharesData, 'User ${index + 1} Shares (Linear)', 'linear');
              createChart(document.getElementById('user${index + 1}SharesChartLog').getContext('2d'), user${index + 1}SharesData, 'User ${index + 1} Shares (Log)', 'logarithmic');
            `).join('')}
    
            const totalSupplyData = {
              labels: ${JSON.stringify(Array.from({ length: allData.totalSupply.length }, (_, i) => i + 1))},
              values: ${JSON.stringify(allData.totalSupply)}
            };
    
            const totalAssetsData = {
              labels: ${JSON.stringify(Array.from({ length: allData.totalAssets.length }, (_, i) => i + 1))},
              values: ${JSON.stringify(allData.totalAssets)}
            };
    
            const tokenPriceData = {
              labels: ${JSON.stringify(Array.from({ length: allData.tokenPrices.length }, (_, i) => i + 1))},
              values: ${JSON.stringify(allData.tokenPrices)}
            };
    
            createChart(document.getElementById('totalSupplyChartLinear').getContext('2d'), totalSupplyData, 'Total Supply (Linear)', 'linear');
            createChart(document.getElementById('totalSupplyChartLog').getContext('2d'), totalSupplyData, 'Total Supply (Log)', 'logarithmic');
    
            createChart(document.getElementById('totalAssetsChartLinear').getContext('2d'), totalAssetsData, 'Total Assets (Linear)', 'linear');
            createChart(document.getElementById('totalAssetsChartLog').getContext('2d'), totalAssetsData, 'Total Assets (Log)', 'logarithmic');
    
            createChart(document.getElementById('tokenPriceChartLinear').getContext('2d'), tokenPriceData, 'Token Price (Linear)', 'linear');
            createChart(document.getElementById('tokenPriceChartLog').getContext('2d'), tokenPriceData, 'Token Price (Log)', 'logarithmic');
          </script>
        </body>
        </html>
      `;
    
      fs.writeFileSync(`test_results_${contractName}.html`, html);
    }
  }
});
