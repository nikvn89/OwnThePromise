export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0xD73E8602FD5467577e8441Cdb25F5521B4A61530"
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
