package main

import (
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"math/big"
	"time"

	"github.com/coinbase/kryptology/pkg/core/curves"
)

type Cipher struct {
	C0 string `json:"c0"`
	C1 string `json:"c1"`
}

func main() {
	var (
		dictPriv = flag.String("dict-priv", "", "dictator private scalar (decimal)")
		file     = flag.String("cipher", "cipher.json", "cipher JSON file")
	)
	flag.Parse()

	data, _ := ioutil.ReadFile(*file)
	var ct Cipher
	json.Unmarshal(data, &ct)

	curve := curves.K256()

	skInt, _ := new(big.Int).SetString(*dictPriv, 10)
	sk := curve.Scalar.New(int(skInt.Int64()))

	c1Bytes, _ := hex.DecodeString(ct.C1)
	C1, _ := curve.Point.FromAffineUncompressed(c1Bytes)

	c0, _ := new(big.Int).SetString(ct.C0, 10)

	start := time.Now()
	yC := C1.Mul(sk)
	yCval := new(big.Int).SetBytes(yC.ToAffineUncompressed())
	x := new(big.Int).Sub(c0, yCval)

	fmt.Printf("Dictator recovered: %s (in %s)\n", x.String(), time.Since(start))
}
