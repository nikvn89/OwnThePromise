export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc"
) as `0x${string}`;

export const RPC_PATH = import.meta.env.VITE_RPC_PATH || "/api/rpc";
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xf22f";
export const STUDIO_WALLET_RPC = "https://studio.genlayer.com/api";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";
export const EXPLORER_URL = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`;

export const MAX_NAME_LENGTH = 80;
export const MAX_ROLE_LABEL_LENGTH = 60;
export const MAX_STATEMENT_LENGTH = 800;
export const MAX_REQUIRED_COMMITMENTS = 10;
export const MAX_PAGE_SIZE = 50;
