package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"math"
	"math/big"
	"time"

	"github.com/btcsuite/btcd/btcec"
	"github.com/coinbase/kryptology/pkg/core/curves"
)

type Cipher struct {
	C0 string `json:"c0"`
	C1 string `json:"c1"`
}

func main() {
	alicePriv := flag.String("alice-priv", "", "Alice private scalar (decimal)")
	file := flag.String("cipher", "cipher.json", "cipher JSON file")
	maxSearch := flag.Int64("max", -1, "upper bound for brute-force")
	flag.Parse()

	data, err := ioutil.ReadFile(*file)
	if err != nil {
		fmt.Printf("Failed to read cipher file: %v\n", err)
		return
	}
	var ct Cipher
	if err := json.Unmarshal(data, &ct); err != nil {
		fmt.Printf("Failed to parse cipher JSON: %v\n", err)
		return
	}

	curve := curves.K256()
	G := curve.Point.Generator()

	tInt, ok := new(big.Int).SetString(*alicePriv, 10)
	if !ok {
		fmt.Println("Invalid Alice private key")
		return
	}
	t, _ := curve.Scalar.Zero().SetBigInt(tInt)

	c1Bytes, err := hex.DecodeString(ct.C1)
	if err != nil {
		fmt.Println("Invalid hex for c1:", err)
		return
	}
	C1, err := curve.Point.FromAffineUncompressed(c1Bytes)
	if err != nil {
		fmt.Println("Invalid EC point for c1:", err)
		return
	}

	tc := G.Mul(t)
	resAlice := C1.Sub(tc)

	N := *maxSearch
	if N < 0 {
		N = 1000
	}
	n := N + 1
	m := int64(math.Ceil(math.Sqrt(float64(n))))

	start := time.Now()

	// Baby steps
	baby := make(map[string]int64, m)
	for j := int64(0); j < m; j++ {
		p := G.Mul(curve.Scalar.New(int(j)))
		baby[string(p.ToAffineUncompressed())] = j
	}

	// Giant steps
	factor := G.Mul(curve.Scalar.New(int(m)))
	var found int64 = -1
	giant := resAlice
	for i := int64(0); i <= m; i++ {
		key := string(giant.ToAffineUncompressed())
		if j, ok := baby[key]; ok && i*m+j < n {
			found = i*m + j
			break
		}
		giant = giant.Sub(factor)
	}
	elapsed := time.Since(start)

	if found < 0 {
		fmt.Printf("Alice index not found in range 0..%d (time: %s)\n", maxSearch, elapsed)
		return
	}
	fmt.Printf("Alice recovered index (cm): %d (in %s)\n", found, elapsed)

	// Derive secp256k1 key from r = cm + t
	rInt := new(big.Int).Add(t.BigInt(), big.NewInt(found))
	rInt.Mod(rInt, btcec.S256().N)

	privBytes := rInt.Bytes()
	if len(privBytes) < 32 {
		pad := make([]byte, 32-len(privBytes))
		privBytes = append(pad, privBytes...)
	}
	privKey, pubKey := btcec.PrivKeyFromBytes(btcec.S256(), privBytes)

	derivedPubComp := pubKey.SerializeCompressed()
	fmt.Printf("Derived secp256k1 private key: %x\n", privKey.Serialize())
	fmt.Printf("Derived secp256k1 public key (comp): %x\n", derivedPubComp)

	hash := sha256.Sum256(derivedPubComp)
	fmt.Printf("SHA256(pub): %x\n", hash)
}
