export type RegisterRecord = {
  register_id: string;
  creator: string;
  name: string;
  author_role_label: string;
  required_commitments: number;
  owned_count: number;
  recorded_count: number;
  frozen: boolean;
  state: "OPEN" | "QUOTA_MET" | "FROZEN" | string;
};

export type AttemptRecord = {
  attempt_number: number;
  statement_id: string;
  verdict: "AUTHOR_COMMITMENT" | "NOT_AUTHOR_COMMITMENT" | string;
  counted: boolean;
};

export type TxUiState = {
  kind: "idle" | "signing" | "submitted" | "success" | "error";
  message: string;
  hash?: string;
};
