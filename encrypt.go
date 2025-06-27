package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"strconv"

	"github.com/btcsuite/btcd/btcec"
	"github.com/coinbase/kryptology/pkg/core/curves"
)

type CipherText struct {
	C0 string `json:"c0"`
	C1 string `json:"c1"`
}

func main() {
	dictPriv := flag.String("dict-priv", "", "Dictator private scalar (decimal)")
	alicePriv := flag.String("alice-priv", "", "Alice private scalar (decimal)")
	xStr := flag.String("x", "5", "Dictator message integer")
	cmStr := flag.String("cm", "99", "Hidden message for Alice (index)")
	outFile := flag.String("out", "cipher.json", "Output JSON file path")
	flag.Parse()

	if *dictPriv == "" || *alicePriv == "" {
		fmt.Fprintln(os.Stderr, "Both --dict-priv and --alice-priv are required.")
		flag.Usage()
		os.Exit(1)
	}

	skInt, _ := new(big.Int).SetString(*dictPriv, 10)
	tInt, _ := new(big.Int).SetString(*alicePriv, 10)
	xMsg, _ := strconv.ParseInt(*xStr, 10, 64)
	cm, _ := strconv.ParseInt(*cmStr, 10, 64)

	curve := curves.K256()
	G := curve.Point.Generator()

	skDict, _ := curve.Scalar.Zero().SetBigInt(skInt)
	t, _ := curve.Scalar.Zero().SetBigInt(tInt)
	pk := G.Mul(skDict)

	r := curve.Scalar.New(int(cm)).Add(t)
	rY := pk.Mul(r)
	rYval := new(big.Int).SetBytes(rY.ToAffineUncompressed())
	c0 := new(big.Int).Add(rYval, big.NewInt(xMsg))
	c1 := G.Mul(r)

	ct := CipherText{
		C0: c0.String(),
		C1: hex.EncodeToString(c1.ToAffineUncompressed()),
	}
	f, _ := os.Create(*outFile)
	defer f.Close()
	json.NewEncoder(f).Encode(ct)

	indexBytes := c1.ToAffineUncompressed()
	x := new(big.Int).SetBytes(indexBytes[1:33])
	y := new(big.Int).SetBytes(indexBytes[33:65])
	pubKeyIndex := &btcec.PublicKey{Curve: btcec.S256(), X: x, Y: y}
	indexCompressed := pubKeyIndex.SerializeCompressed()

	fmt.Printf("Encrypted (c0): %s\n", c0)
	fmt.Printf("Encrypted (c1): %x\n", indexBytes)
	fmt.Printf("IndexPub (compressed): %x\n", indexCompressed)
	fmt.Printf("SHA256(IndexPub): %x\n", sha256.Sum256(indexCompressed))
}
