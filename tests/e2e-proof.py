import base64, json, time
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jwcrypto import jwe, jwk

# === Setup ===
curve = ec.SECP256R1()
curve_order = int("ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551", 16)

# === Fixed Keys for Testing ===
sk0_int = int('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 16) % curve_order
t_int   = int('abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789', 16) % curve_order
cm = 42
r_int = (t_int + cm) % curve_order

# === ECC Key Derivation ===
sk0 = ec.derive_private_key(sk0_int, curve)  # Dictator
pk0 = sk0.public_key()
t_key = ec.derive_private_key(t_int, curve)  # Alice
r_key = ec.derive_private_key(r_int, curve)  # Ephemeral r = t + cm
rG = r_key.public_key()

# === ECDH & CEK Derivation ===
shared_secret = r_key.exchange(ec.ECDH(), pk0)
alg_id = b"A256GCM"
otherinfo = (
    (len(alg_id)).to_bytes(4, 'big') + alg_id +
    (0).to_bytes(4, 'big') + (0).to_bytes(4, 'big') +
    (256).to_bytes(4, 'big')
)
kdf_input = b'\x00\x00\x00\x01' + shared_secret + otherinfo
hkdf = hashes.Hash(hashes.SHA256())
hkdf.update(kdf_input)
CEK = hkdf.finalize()

# === Encrypt Payload ===
plaintext = b'{"sub": "alice", "iat": 1710000000, "role": "user"}'
iv = bytes.fromhex("cafebabefacedbaddecaf888")
aesgcm = AESGCM(CEK)
protected_header = {
    "alg": "ECDH-ES",
    "enc": "A256GCM",
    "epk": {
        "kty": "EC",
        "crv": "P-256",
        "x": base64.urlsafe_b64encode(rG.public_numbers().x.to_bytes(32, 'big')).decode().rstrip("="),
        "y": base64.urlsafe_b64encode(rG.public_numbers().y.to_bytes(32, 'big')).decode().rstrip("=")
    }
}
protected_b64 = base64.urlsafe_b64encode(json.dumps(protected_header).encode()).decode().rstrip("=")
ciphertext_with_tag = aesgcm.encrypt(iv, plaintext, protected_b64.encode())
ciphertext, tag = ciphertext_with_tag[:-16], ciphertext_with_tag[-16:]

# === Assemble Compact JWE ===
jwe_token = {
    "protected": protected_b64,
    "iv": base64.urlsafe_b64encode(iv).decode().rstrip("="),
    "ciphertext": base64.urlsafe_b64encode(ciphertext).decode().rstrip("="),
    "tag": base64.urlsafe_b64encode(tag).decode().rstrip("=")
}
jwe_compact = f"{jwe_token['protected']}..{jwe_token['iv']}.{jwe_token['ciphertext']}.{jwe_token['tag']}"

# === Correct EC Key for jwcrypto (Dictator's JWK) ===
sk0_jwk = jwk.JWK.from_json(json.dumps({
    "kty": "EC",
    "crv": "P-256",
    "d": base64.urlsafe_b64encode(sk0_int.to_bytes(32, 'big')).decode().rstrip("="),
    "x": base64.urlsafe_b64encode(pk0.public_numbers().x.to_bytes(32, 'big')).decode().rstrip("="),
    "y": base64.urlsafe_b64encode(pk0.public_numbers().y.to_bytes(32, 'big')).decode().rstrip("=")
}))

# === Dictator Decrypts Token ===
try:
    jwe_obj = jwe.JWE()
    jwe_obj.deserialize(jwe_compact, key=sk0_jwk)
    decrypted_payload = jwe_obj.payload.decode()
except Exception as e:
    decrypted_payload = f"❌ Decryption failed: {e}"

# === Alice Recovers cm ===
found_cm = None
start = time.time()
for guess in range(100):
    r_guess = (t_int + guess) % curve_order
    pub_guess = ec.derive_private_key(r_guess, curve).public_key().public_numbers()
    if (pub_guess.x == rG.public_numbers().x) and (pub_guess.y == rG.public_numbers().y):
        found_cm = guess
        break
elapsed = (time.time() - start) * 1000

# === Output ===
print("\n=== JWE Compact Token ===")
print(jwe_compact)

print("\n=== Recovered Plaintext ===")
print(decrypted_payload)

print("\n=== Anamorphic Debug Info ===")
print(f"Dictator sk0: 0x{sk0_int:064x}")
print(f"Alice t:      0x{t_int:064x}")
print(f"Covert cm:    {cm}")
print(f"Ephemeral r:  0x{r_int:064x}")
print(f"CEK Match:    {'YES' if 'alice' in decrypted_payload else 'NO'}")

if found_cm is not None:
    print(f"\n✅ Recovered cm = {found_cm} in {elapsed:.2f} ms")
else:
    print("\n❌ Failed to recover cm")