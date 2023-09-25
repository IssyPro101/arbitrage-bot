import { ReactElement } from 'react';
import styled from 'styled-components';
import { ActivateDeactivate } from './components/ActivateDeactivate';
import { ArbitrageBot } from './components/ArbitrageBot';
import { SectionDivider } from './components/SectionDivider';
import { WithdrawProfit } from './components/WithdrawProfit';
import { WalletStatus } from './components/WalletStatus';

const StyledAppDiv = styled.div`
  display: grid;
  grid-gap: 20px;
`;

export function App(): ReactElement {
  return (
    <StyledAppDiv>
      <ActivateDeactivate />
      <SectionDivider />
      <WalletStatus />
      <SectionDivider />
      <WithdrawProfit />
      <SectionDivider />
      <ArbitrageBot />
    </StyledAppDiv>
  );
}
