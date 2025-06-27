package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/coinbase/kryptology/pkg/core/curves"
)

// KeyPair holds a scalar and its corresponding public point
type KeyPair struct {
	Priv string `json:"priv"` // decimal scalar
	Pub  string `json:"pub"`  // uncompressed hex (04||X||Y)
}

// Output wraps dictator and alice keypairs
type Output struct {
	Dictator KeyPair `json:"dictator"`
	Alice    KeyPair `json:"alice"`
}

func main() {
	// Command-line flags
	outFile := flag.String("out", "keys.json", "output JSON file")
	flag.Parse()

	// Curve setup
	curve := curves.K256()
	G := curve.Point.Generator()

	// Generate keys
	skDict := curve.Scalar.Random(rand.Reader)
	pk := G.Mul(skDict)
	skAlice := curve.Scalar.Random(rand.Reader)
	alp := G.Mul(skAlice)

	// Serialize scalars and points
	dPriv := skDict.BigInt().String()
	dPub := hex.EncodeToString(pk.ToAffineUncompressed())
	aPriv := skAlice.BigInt().String()
	aPub := hex.EncodeToString(alp.ToAffineUncompressed())

	// Build output
	result := Output{
		Dictator: KeyPair{Priv: dPriv, Pub: dPub},
		Alice:    KeyPair{Priv: aPriv, Pub: aPub},
	}

	// Write to file
	f, err := os.Create(*outFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating output file: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	en := json.NewEncoder(f)
	en.SetIndent("", "  ")
	if err := en.Encode(result); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing JSON: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Keys written to %s\n", *outFile)
}
