// Standard ICRC-2 Token Interface
// This is a minimal, standard-compliant ICRC-2 IDL that should work with any ICRC-2 token
import type { IDL } from '@dfinity/candid'

export const icrc2IdlFactory = ({ IDL }: any) => {
  const Subaccount = IDL.Vec(IDL.Nat8)
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(Subaccount),
  })
  const Tokens = IDL.Nat
  const Memo = IDL.Vec(IDL.Nat8)
  const Timestamp = IDL.Nat64
  const TxIndex = IDL.Nat

  const ApproveError = IDL.Variant({
    GenericError: IDL.Record({
      message: IDL.Text,
      error_code: IDL.Nat,
    }),
    TemporarilyUnavailable: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: TxIndex }),
    BadFee: IDL.Record({ expected_fee: Tokens }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    CreatedInFuture: IDL.Record({ ledger_time: Timestamp }),
    TooOld: IDL.Null,
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    InsufficientFunds: IDL.Record({ balance: Tokens }),
  })

  const ApproveResult = IDL.Variant({ Ok: TxIndex, Err: ApproveError })

  return IDL.Service({
    icrc2_approve: IDL.Func(
      [
        IDL.Record({
          fee: IDL.Opt(Tokens),
          memo: IDL.Opt(Memo),
          from_subaccount: IDL.Opt(Subaccount),
          created_at_time: IDL.Opt(Timestamp),
          amount: IDL.Nat,
          expected_allowance: IDL.Opt(IDL.Nat),
          expires_at: IDL.Opt(IDL.Nat64),
          spender: Account,
        }),
      ],
      [ApproveResult],
      []
    ),
  })
}
