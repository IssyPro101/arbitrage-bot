import { useWeb3React } from '@web3-react/core';
import { ethers, Signer } from 'ethers';
import {
  ReactElement,
  useEffect,
  useState
} from 'react';
import styled from 'styled-components';
import IERC20Artifact from "../artifacts/@balancer-labs/v2-interfaces/contracts/solidity-utils/openzeppelin/IERC20.sol/IERC20.json";
import { Provider } from '../utils/provider';

const StyledArbitrageBotDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-columns: 135px 2.7fr 1fr;
  grid-gap: 10px;
  place-self: center;
  align-items: center;
`;

const StyledLabel = styled.label`
  font-weight: bold;
`;

export function ArbitrageBot(): ReactElement {
  const context = useWeb3React<Provider>();
  const { library } = context;

  const [signer, setSigner] = useState<Signer>();
  const [arbitrageBotContractAddr, setArbitrageBotContractAddr] = useState<string>('');
  const [profit, setProfit] = useState<string>("");

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }

    setSigner(library.getSigner());
  }, [library]);

  useEffect((): void => {
    const loadArbitrageBotContract = async () => {
      if (signer) {
        console.log(signer)
        const usdcContract = new ethers.Contract("0x07865c6e87b9f70255377e024ace6630c1eaa37f", IERC20Artifact.abi, signer);

        console.log(usdcContract)
  
        const profit = await usdcContract.balanceOf("0xA35a4E0Ac9E9a0ba89a29696AEe96fd343C2e2Be");
        console.log(profit)
  
        setArbitrageBotContractAddr("0xA35a4E0Ac9E9a0ba89a29696AEe96fd343C2e2Be")
        console.log(profit.toString())
  
        setProfit(profit.toString());
      }


    }

    loadArbitrageBotContract()

  }, [signer]);

  return (
    <>
      <StyledArbitrageBotDiv>
        <StyledLabel>Contract addr</StyledLabel>
        <div>
          {arbitrageBotContractAddr ? (
            arbitrageBotContractAddr
          ) : (
            <em>{`<Contract not yet deployed>`}</em>
          )}
        </div>
        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
        <div></div>
        <StyledLabel>Current Profit in Contract (USDC): </StyledLabel>
        <div>
          {profit ? `${parseInt(profit)/10**6} USDC` : <em>{`<Contract not yet deployed>`}</em>}
        </div>
      </StyledArbitrageBotDiv>
    </>
  );
}
