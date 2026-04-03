#![cfg(test)]

//! Unit Tests for Cross-Asset Payment Escrow Logic
//! 
//! Tests escrow functionality for SEP-31 cross-asset payments including:
//! - Fund locking during payment processing
//! - Release mechanisms for completed payments
//! - Refund mechanisms for failed payments
//! - Security and edge cases

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String as SorobanString, token};

// ══════════════════════════════════════════════════════════════════════════════
// ── TEST HELPERS ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

fn setup_payment_escrow() -> (
    Env,
    Address,                            // admin
    Address,                            // sender
    Address,                            // token_contract
    token::Client<'static>,             // token_client
    token::StellarAssetClient<'static>, // token_admin_client
    CrossAssetPaymentContractClient<'static>, // payment_client
    Address,                            // contract_address
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    
    let contract_id = env.register(CrossAssetPaymentContract, ());
    let client = CrossAssetPaymentContractClient::new(&env, &contract_id);
    let contract_address = contract_id.clone();

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    let token_client = token::Client::new(&env, &token_contract);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_contract);

    // Initialize contract
    client.init(&admin);

    // Mint tokens to sender
    token_admin_client.mint(&sender, &1_000_000);

    (env, admin, sender, token_contract, token_client, token_admin_client, client, contract_address)
}


// ══════════════════════════════════════════════════════════════════════════════
// ── ESCROW FUND LOCKING TESTS ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_payment_escrow_locks_funds() {
    let (env, _, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    let initial_balance = token_client.balance(&sender);
    let payment_amount = 10_000;
    
    let payment_id = client.initiate_payment(
        &sender,
        &payment_amount,
        &token_contract,
        &SorobanString::from_str(&env, "receiver-123"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anchor-1"),
    );
    
    // Funds transferred to escrow
    assert_eq!(token_client.balance(&sender), initial_balance - payment_amount);
    assert_eq!(token_client.balance(&contract_address), payment_amount);
    assert_eq!(payment_id, 1);
}

#[test]
fn test_multiple_payments_accumulate_in_escrow() {
    let (env, _, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    env.ledger().set_sequence_number(10);
    client.initiate_payment(
        &sender, &5_000, &token_contract,
        &SorobanString::from_str(&env, "rec-1"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anc-1"),
    );
    
    env.ledger().set_sequence_number(11);
    client.initiate_payment(
        &sender, &3_000, &token_contract,
        &SorobanString::from_str(&env, "rec-2"),
        &SorobanString::from_str(&env, "EUR"),
        &SorobanString::from_str(&env, "anc-1"),
    );
    
    // Total escrowed
    assert_eq!(token_client.balance(&contract_address), 8_000);
}

#[test]
fn test_escrow_holds_funds_until_completion() {
    let (env, _, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    let payment_id = client.initiate_payment(
        &sender, &15_000, &token_contract,
        &SorobanString::from_str(&env, "receiver"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anchor"),
    );
    
    // Funds locked in escrow
    assert_eq!(token_client.balance(&contract_address), 15_000);
    
    // Check payment status
    let payment = client.get_payment(&payment_id);
    assert_eq!(payment.status, symbol_short!("pending"));
    assert_eq!(payment.amount, 15_000);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── PAYMENT COMPLETION AND RELEASE TESTS ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_complete_payment_releases_funds() {
    let (env, admin, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    let recipient = Address::generate(&env);
    let payment_amount = 20_000;
    
    let payment_id = client.initiate_payment(
        &sender, &payment_amount, &token_contract,
        &SorobanString::from_str(&env, "receiver"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anchor"),
    );
    
    // Complete payment
    env.ledger().set_sequence_number(20);
    client.complete_payment(&admin, &payment_id, &recipient);
    
    // Funds released to recipient
    assert_eq!(token_client.balance(&recipient), payment_amount);
    assert_eq!(token_client.balance(&contract_address), 0);
    
    // Status updated
    let payment = client.get_payment(&payment_id);
    assert_eq!(payment.status, symbol_short!("complete"));
}

#[test]
fn test_multiple_payments_released_independently() {
    let (env, admin, sender, token_contract, token_client, _, client, _) = setup_payment_escrow();
    
    let recipient_1 = Address::generate(&env);
    let recipient_2 = Address::generate(&env);
    
    env.ledger().set_sequence_number(10);
    let payment_id_1 = client.initiate_payment(
        &sender, &10_000, &token_contract,
        &SorobanString::from_str(&env, "rec-1"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    env.ledger().set_sequence_number(11);
    let payment_id_2 = client.initiate_payment(
        &sender, &15_000, &token_contract,
        &SorobanString::from_str(&env, "rec-2"),
        &SorobanString::from_str(&env, "EUR"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    // Complete first payment
    env.ledger().set_sequence_number(20);
    client.complete_payment(&admin, &payment_id_1, &recipient_1);
    assert_eq!(token_client.balance(&recipient_1), 10_000);
    
    // Complete second payment
    env.ledger().set_sequence_number(21);
    client.complete_payment(&admin, &payment_id_2, &recipient_2);
    assert_eq!(token_client.balance(&recipient_2), 15_000);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── PAYMENT FAILURE AND REFUND TESTS ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_fail_payment_refunds_sender() {
    let (env, admin, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    let initial_balance = token_client.balance(&sender);
    let payment_amount = 12_000;
    
    let payment_id = client.initiate_payment(
        &sender, &payment_amount, &token_contract,
        &SorobanString::from_str(&env, "receiver"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anchor"),
    );
    
    // Fail payment
    env.ledger().set_sequence_number(20);
    client.fail_payment(&admin, &payment_id);
    
    // Funds refunded to sender
    assert_eq!(token_client.balance(&sender), initial_balance);
    assert_eq!(token_client.balance(&contract_address), 0);
    
    // Status updated
    let payment = client.get_payment(&payment_id);
    assert_eq!(payment.status, symbol_short!("failed"));
}

#[test]
fn test_partial_refund_scenario() {
    let (env, admin, sender, token_contract, token_client, _, client, _) = setup_payment_escrow();
    
    let recipient = Address::generate(&env);
    
    // Create two payments
    env.ledger().set_sequence_number(10);
    let payment_id_1 = client.initiate_payment(
        &sender, &8_000, &token_contract,
        &SorobanString::from_str(&env, "rec-1"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    env.ledger().set_sequence_number(11);
    let payment_id_2 = client.initiate_payment(
        &sender, &6_000, &token_contract,
        &SorobanString::from_str(&env, "rec-2"),
        &SorobanString::from_str(&env, "EUR"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    let balance_after_escrow = token_client.balance(&sender);
    
    // Complete one, fail the other
    env.ledger().set_sequence_number(20);
    client.complete_payment(&admin, &payment_id_1, &recipient);
    
    env.ledger().set_sequence_number(21);
    client.fail_payment(&admin, &payment_id_2);
    
    // Sender gets refund for failed payment only
    assert_eq!(token_client.balance(&sender), balance_after_escrow + 6_000);
    assert_eq!(token_client.balance(&recipient), 8_000);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SECURITY AND AUTHORIZATION TESTS ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

#[test]
#[should_panic(expected = "Operation already processed in this ledger sequence")]
fn test_duplicate_payment_same_ledger_panics() {
    let (env, _, sender, token_contract, _, _, client, _) = setup_payment_escrow();
    
    env.ledger().set_sequence_number(10);
    
    client.initiate_payment(
        &sender, &5_000, &token_contract,
        &SorobanString::from_str(&env, "rec"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    // Second payment in same ledger should panic
    client.initiate_payment(
        &sender, &3_000, &token_contract,
        &SorobanString::from_str(&env, "rec2"),
        &SorobanString::from_str(&env, "EUR"),
        &SorobanString::from_str(&env, "anc"),
    );
}

#[test]
fn test_payments_allowed_different_ledgers() {
    let (env, _, sender, token_contract, _, _, client, _) = setup_payment_escrow();
    
    env.ledger().set_sequence_number(10);
    let id1 = client.initiate_payment(
        &sender, &5_000, &token_contract,
        &SorobanString::from_str(&env, "rec1"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    env.ledger().set_sequence_number(11);
    let id2 = client.initiate_payment(
        &sender, &3_000, &token_contract,
        &SorobanString::from_str(&env, "rec2"),
        &SorobanString::from_str(&env, "EUR"),
        &SorobanString::from_str(&env, "anc"),
    );
    
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── EDGE CASES AND INVARIANT TESTS ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_escrow_balance_invariant() {
    let (env, admin, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    let recipient = Address::generate(&env);
    
    // Create multiple payments
    env.ledger().set_sequence_number(10);
    let id1 = client.initiate_payment(&sender, &10_000, &token_contract,
        &SorobanString::from_str(&env, "r1"), &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "a"));
    
    env.ledger().set_sequence_number(11);
    let id2 = client.initiate_payment(&sender, &15_000, &token_contract,
        &SorobanString::from_str(&env, "r2"), &SorobanString::from_str(&env, "EUR"),
        &SorobanString::from_str(&env, "a"));
    
    env.ledger().set_sequence_number(12);
    let id3 = client.initiate_payment(&sender, &8_000, &token_contract,
        &SorobanString::from_str(&env, "r3"), &SorobanString::from_str(&env, "GBP"),
        &SorobanString::from_str(&env, "a"));
    
    // Total escrowed
    assert_eq!(token_client.balance(&contract_address), 33_000);
    
    // Complete one
    env.ledger().set_sequence_number(20);
    client.complete_payment(&admin, &id1, &recipient);
    assert_eq!(token_client.balance(&contract_address), 23_000);
    
    // Fail one
    env.ledger().set_sequence_number(21);
    client.fail_payment(&admin, &id2);
    assert_eq!(token_client.balance(&contract_address), 8_000);
    
    // Complete last
    env.ledger().set_sequence_number(22);
    client.complete_payment(&admin, &id3, &recipient);
    assert_eq!(token_client.balance(&contract_address), 0);
}

#[test]
fn test_large_payment_amount() {
    let (env, _, sender, token_contract, token_client, token_admin_client, client, _) = setup_payment_escrow();
    
    let large_amount = 500_000_000;
    token_admin_client.mint(&sender, &large_amount);
    
    let payment_id = client.initiate_payment(
        &sender, &large_amount, &token_contract,
        &SorobanString::from_str(&env, "receiver"),
        &SorobanString::from_str(&env, "USD"),
        &SorobanString::from_str(&env, "anchor"),
    );
    
    let payment = client.get_payment(&payment_id);
    assert_eq!(payment.amount, large_amount);
}

#[test]
fn test_payment_count_accuracy() {
    let (env, _, sender, token_contract, _, _, client, _) = setup_payment_escrow();
    
    assert_eq!(client.get_payment_count(), 0);
    
    for i in 1..=5 {
        env.ledger().set_sequence_number(i * 10);
        client.initiate_payment(
            &sender, &1_000, &token_contract,
            &SorobanString::from_str(&env, &format!("rec-{}", i)),
            &SorobanString::from_str(&env, "USD"),
            &SorobanString::from_str(&env, "anc"),
        );
    }
    
    assert_eq!(client.get_payment_count(), 5);
}

#[test]
fn test_zero_balance_after_all_payments_processed() {
    let (env, admin, sender, token_contract, token_client, _, client, contract_address) = setup_payment_escrow();
    
    let recipient = Address::generate(&env);
    
    // Create and process multiple payments
    let mut payment_ids = vec![];
    for i in 1..=10 {
        env.ledger().set_sequence_number(i * 10);
        let id = client.initiate_payment(
            &sender, &1_000, &token_contract,
            &SorobanString::from_str(&env, &format!("rec-{}", i)),
            &SorobanString::from_str(&env, "USD"),
            &SorobanString::from_str(&env, "anc"),
        );
        payment_ids.push(id);
    }
    
    // Complete all payments
    for (idx, id) in payment_ids.iter().enumerate() {
        env.ledger().set_sequence_number(100 + idx as u32);
        client.complete_payment(&admin, id, &recipient);
    }
    
    // Contract should be empty
    assert_eq!(token_client.balance(&contract_address), 0);
    assert_eq!(token_client.balance(&recipient), 10_000);
}
