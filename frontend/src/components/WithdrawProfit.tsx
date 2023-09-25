import { useWeb3React } from '@web3-react/core';
import { MouseEvent, ReactElement, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Provider } from '../utils/provider';
import ArbitrageBotArtifact from '../artifacts/contracts/ArbitrageBot.sol/ArbitrageBot.json';
import { ethers, Signer } from 'ethers';

const StyledButton = styled.button`
  width: 150px;
  height: 2rem;
  border-radius: 1rem;
  border-color: blue;
  cursor: pointer;
  place-self: center;
`;

export function WithdrawProfit(): ReactElement {
  const context = useWeb3React<Provider>();
  const { account, active, library } = context;

  const [signer, setSigner] = useState<Signer>();

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }

    setSigner(library.getSigner());
  }, [library]);

  async function handleWithdrawProfit(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault();

    if (!library || !account) {
      window.alert('Wallet not connected');
      return;
    }

    const arbitrageBot = new ethers.Contract("0xA35a4E0Ac9E9a0ba89a29696AEe96fd343C2e2Be", ArbitrageBotArtifact.abi, signer);
    
    const tx = await arbitrageBot.withdrawProfit("0x07865c6e87b9f70255377e024ace6630c1eaa37f");
    console.log(tx)

  }

  return (
    <StyledButton
      disabled={!active ? true : false}
      style={{
        cursor: !active ? 'not-allowed' : 'pointer',
        borderColor: !active ? 'unset' : 'blue'
      }}
      onClick={handleWithdrawProfit}
    >
      Withdraw Profits
    </StyledButton>
  );
}
