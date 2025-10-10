package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
)

type Response struct {
	Result interface{} `json:"result"`
	Error  string      `json:"error,omitempty"`
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

func handleOptions(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	w.WriteHeader(http.StatusOK)
}

// GCD using Euclidean algorithm - O(log(min(a,b)))
func gcd(a, b int64) int64 {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

// LCM - O(log(min(a,b)))
func lcm(a, b int64) int64 {
	if a == 0 || b == 0 {
		return 0
	}
	return (a * b) / gcd(a, b)
}

// Prime check - O(sqrt(n))
func isPrime(n int64) bool {
	if n < 2 {
		return false
	}
	if n == 2 {
		return true
	}
	if n%2 == 0 {
		return false
	}
	for i := int64(3); i*i <= n; i += 2 {
		if n%i == 0 {
			return false
		}
	}
	return true
}

// Prime factorization - O(sqrt(n))
func primeFactorization(n int64) map[int64]int {
	factors := make(map[int64]int)
	if n < 2 {
		return factors
	}

	// Handle 2s
	for n%2 == 0 {
		factors[2]++
		n /= 2
	}

	// Handle odd factors
	for i := int64(3); i*i <= n; i += 2 {
		for n%i == 0 {
			factors[i]++
			n /= i
		}
	}

	// If n is still greater than 1, it's a prime factor
	if n > 1 {
		factors[n]++
	}

	return factors
}

// Count divisors - O(sqrt(n))
func countDivisors(n int64) int64 {
	if n <= 0 {
		return 0
	}
	count := int64(0)
	sqrt := int64(math.Sqrt(float64(n)))
	for i := int64(1); i <= sqrt; i++ {
		if n%i == 0 {
			if i*i == n {
				count++ // Perfect square
			} else {
				count += 2 // Count both i and n/i
			}
		}
	}
	return count
}

// Perfect number checker - O(sqrt(n))
func isPerfectNumber(n int64) bool {
	if n <= 1 {
		return false
	}
	sum := int64(1) // 1 is always a divisor
	sqrt := int64(math.Sqrt(float64(n)))
	for i := int64(2); i <= sqrt; i++ {
		if n%i == 0 {
			sum += i
			if i != n/i {
				sum += n / i
			}
		}
	}
	return sum == n
}

// Fibonacci - O(n) time, O(1) space using iteration
func fibonacci(n int) int64 {
	if n < 0 {
		return -1
	}
	if n <= 1 {
		return int64(n)
	}
	a, b := int64(0), int64(1)
	for i := 2; i <= n; i++ {
		a, b = b, a+b
	}
	return b
}

// Factorial - O(n)
func factorial(n int) int64 {
	if n < 0 {
		return -1
	}
	if n == 0 || n == 1 {
		return 1
	}
	result := int64(1)
	for i := 2; i <= n; i++ {
		result *= int64(i)
	}
	return result
}

// Combinations (n choose r) - O(r)
func combinations(n, r int) int64 {
	if r < 0 || n < 0 || r > n {
		return 0
	}
	if r == 0 || r == n {
		return 1
	}
	// Use smaller value for efficiency
	if r > n-r {
		r = n - r
	}
	result := int64(1)
	for i := 0; i < r; i++ {
		result *= int64(n - i)
		result /= int64(i + 1)
	}
	return result
}

// Permutations (n permute r) - O(r)
func permutations(n, r int) int64 {
	if r < 0 || n < 0 || r > n {
		return 0
	}
	result := int64(1)
	for i := 0; i < r; i++ {
		result *= int64(n - i)
	}
	return result
}

// Z-score to percentile using approximation - O(1)
func zScoreToPercentile(z float64) float64 {
	// Using cumulative distribution function approximation
	return 0.5 * (1 + math.Erf(z/math.Sqrt2))
}

// Percentile to z-score using Newton's method - O(1) amortized
func percentileToZScore(p float64) float64 {
	if p <= 0 {
		return math.Inf(-1)
	}
	if p >= 1 {
		return math.Inf(1)
	}
	if p == 0.5 {
		return 0
	}

	// Initial guess
	z := 0.0
	if p < 0.5 {
		z = -5.0
	} else {
		z = 5.0
	}

	// Newton's method
	for i := 0; i < 10; i++ {
		pz := zScoreToPercentile(z)
		if math.Abs(pz-p) < 1e-9 {
			break
		}
		// Derivative of CDF is PDF
		pdf := math.Exp(-z*z/2) / math.Sqrt(2*math.Pi)
		z = z - (pz-p)/pdf
	}

	return z
}

// Convert number from one base to another - O(log n)
func convertBase(value string, fromBase, toBase int) (string, error) {
	if fromBase < 2 || fromBase > 36 || toBase < 2 || toBase > 36 {
		return "", fmt.Errorf("base must be between 2 and 36")
	}

	// Convert from source base to decimal
	decimal := int64(0)
	value = strings.ToUpper(value)
	for _, char := range value {
		var digit int
		if char >= '0' && char <= '9' {
			digit = int(char - '0')
		} else if char >= 'A' && char <= 'Z' {
			digit = int(char-'A') + 10
		} else {
			return "", fmt.Errorf("invalid character in input")
		}
		if digit >= fromBase {
			return "", fmt.Errorf("invalid digit for base %d", fromBase)
		}
		decimal = decimal*int64(fromBase) + int64(digit)
	}

	// Convert from decimal to target base
	if decimal == 0 {
		return "0", nil
	}

	result := ""
	for decimal > 0 {
		remainder := decimal % int64(toBase)
		if remainder < 10 {
			result = string(rune('0'+remainder)) + result
		} else {
			result = string(rune('A'+remainder-10)) + result
		}
		decimal /= int64(toBase)
	}

	return result, nil
}

// Temperature conversions - O(1)
func fahrenheitToCelsius(f float64) float64 {
	return (f - 32) * 5 / 9
}

func celsiusToFahrenheit(c float64) float64 {
	return c*9/5 + 32
}

func celsiusToKelvin(c float64) float64 {
	return c + 273.15
}

func kelvinToCelsius(k float64) float64 {
	return k - 273.15
}

// Quadratic solver - O(1)
type QuadraticResult struct {
	Discriminant float64   `json:"discriminant"`
	RealRoots    []float64 `json:"realRoots,omitempty"`
	ComplexRoots []string  `json:"complexRoots,omitempty"`
}

func solveQuadratic(a, b, c float64) QuadraticResult {
	result := QuadraticResult{}
	
	if a == 0 {
		// Linear equation
		if b != 0 {
			result.RealRoots = []float64{-c / b}
		}
		return result
	}

	discriminant := b*b - 4*a*c
	result.Discriminant = discriminant

	if discriminant > 0 {
		// Two distinct real roots
		sqrtD := math.Sqrt(discriminant)
		x1 := (-b + sqrtD) / (2 * a)
		x2 := (-b - sqrtD) / (2 * a)
		result.RealRoots = []float64{x1, x2}
	} else if discriminant == 0 {
		// One repeated real root
		x := -b / (2 * a)
		result.RealRoots = []float64{x}
	} else {
		// Complex roots
		realPart := -b / (2 * a)
		imagPart := math.Sqrt(-discriminant) / (2 * a)
		result.ComplexRoots = []string{
			fmt.Sprintf("%.6f + %.6fi", realPart, imagPart),
			fmt.Sprintf("%.6f - %.6fi", realPart, imagPart),
		}
	}

	return result
}

// Discriminant - O(1)
func discriminant(a, b, c float64) float64 {
	return b*b - 4*a*c
}

// Collatz sequence length - O(n) where n is sequence length
func collatzLength(n int64) int64 {
	if n <= 0 {
		return 0
	}
	length := int64(0)
	for n != 1 {
		if n%2 == 0 {
			n /= 2
		} else {
			n = 3*n + 1
		}
		length++
	}
	return length
}

// HTTP Handlers

func handleGCD(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var numbers struct {
		A int64 `json:"a"`
		B int64 `json:"b"`
	}
	if err := json.NewDecoder(r.Body).Decode(&numbers); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := gcd(numbers.A, numbers.B)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleLCM(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var numbers struct {
		A int64 `json:"a"`
		B int64 `json:"b"`
	}
	if err := json.NewDecoder(r.Body).Decode(&numbers); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := lcm(numbers.A, numbers.B)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handlePrimalityCheck(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int64 `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := isPrime(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handlePrimeFactorization(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int64 `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := primeFactorization(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleDivisorCount(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int64 `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := countDivisors(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handlePerfectNumber(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int64 `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := isPerfectNumber(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleFibonacci(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := fibonacci(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleFactorial(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := factorial(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleCombinations(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var numbers struct {
		N int `json:"n"`
		R int `json:"r"`
	}
	if err := json.NewDecoder(r.Body).Decode(&numbers); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := combinations(numbers.N, numbers.R)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handlePermutations(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var numbers struct {
		N int `json:"n"`
		R int `json:"r"`
	}
	if err := json.NewDecoder(r.Body).Decode(&numbers); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := permutations(numbers.N, numbers.R)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleZScoreToPercentile(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		Z float64 `json:"z"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := zScoreToPercentile(number.Z) * 100
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handlePercentileToZScore(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		P float64 `json:"p"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := percentileToZScore(number.P / 100)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleBaseConverter(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		Value    string `json:"value"`
		FromBase int    `json:"fromBase"`
		ToBase   int    `json:"toBase"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result, err := convertBase(data.Value, data.FromBase, data.ToBase)
	if err != nil {
		json.NewEncoder(w).Encode(Response{Error: err.Error()})
		return
	}
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleBinHexOct(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		Value string `json:"value"`
		Type  string `json:"type"` // "bin", "hex", "oct"
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	var fromBase int
	switch data.Type {
	case "bin":
		fromBase = 2
	case "oct":
		fromBase = 8
	case "hex":
		fromBase = 16
	default:
		json.NewEncoder(w).Encode(Response{Error: "Invalid type"})
		return
	}

	// Convert to decimal
	decimal, err := strconv.ParseInt(data.Value, fromBase, 64)
	if err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input for type"})
		return
	}

	// Convert to all three formats
	result := map[string]string{
		"binary": fmt.Sprintf("%b", decimal),
		"octal":  fmt.Sprintf("%o", decimal),
		"hex":    fmt.Sprintf("%X", decimal),
		"decimal": fmt.Sprintf("%d", decimal),
	}

	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleFahrenheitToCelsius(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var temp struct {
		F float64 `json:"f"`
	}
	if err := json.NewDecoder(r.Body).Decode(&temp); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := fahrenheitToCelsius(temp.F)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleCelsiusToFahrenheit(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var temp struct {
		C float64 `json:"c"`
	}
	if err := json.NewDecoder(r.Body).Decode(&temp); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := celsiusToFahrenheit(temp.C)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleCelsiusToKelvin(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var temp struct {
		C float64 `json:"c"`
	}
	if err := json.NewDecoder(r.Body).Decode(&temp); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := celsiusToKelvin(temp.C)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleKelvinToCelsius(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var temp struct {
		K float64 `json:"k"`
	}
	if err := json.NewDecoder(r.Body).Decode(&temp); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := kelvinToCelsius(temp.K)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleQuadraticSolver(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var coeffs struct {
		A float64 `json:"a"`
		B float64 `json:"b"`
		C float64 `json:"c"`
	}
	if err := json.NewDecoder(r.Body).Decode(&coeffs); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := solveQuadratic(coeffs.A, coeffs.B, coeffs.C)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleDiscriminant(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var coeffs struct {
		A float64 `json:"a"`
		B float64 `json:"b"`
		C float64 `json:"c"`
	}
	if err := json.NewDecoder(r.Body).Decode(&coeffs); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := discriminant(coeffs.A, coeffs.B, coeffs.C)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func handleCollatz(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var number struct {
		N int64 `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := collatzLength(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func main() {
	// Existing endpoints
	http.HandleFunc("/gcd", handleGCD)
	http.HandleFunc("/lcm", handleLCM)
	http.HandleFunc("/prime", handlePrimalityCheck)

	// New endpoints
	http.HandleFunc("/prime-factorization", handlePrimeFactorization)
	http.HandleFunc("/divisor-count", handleDivisorCount)
	http.HandleFunc("/perfect-number", handlePerfectNumber)
	http.HandleFunc("/fibonacci", handleFibonacci)
	http.HandleFunc("/factorial", handleFactorial)
	http.HandleFunc("/combinations", handleCombinations)
	http.HandleFunc("/permutations", handlePermutations)
	http.HandleFunc("/zscore-to-percentile", handleZScoreToPercentile)
	http.HandleFunc("/percentile-to-zscore", handlePercentileToZScore)
	http.HandleFunc("/base-converter", handleBaseConverter)
	http.HandleFunc("/bin-hex-oct", handleBinHexOct)
	http.HandleFunc("/fahrenheit-to-celsius", handleFahrenheitToCelsius)
	http.HandleFunc("/celsius-to-fahrenheit", handleCelsiusToFahrenheit)
	http.HandleFunc("/celsius-to-kelvin", handleCelsiusToKelvin)
	http.HandleFunc("/kelvin-to-celsius", handleKelvinToCelsius)
	http.HandleFunc("/quadratic-solver", handleQuadraticSolver)
	http.HandleFunc("/discriminant", handleDiscriminant)
	http.HandleFunc("/collatz", handleCollatz)

	// OPTIONS handler for all routes
	http.HandleFunc("/", handleOptions)

	fmt.Println("Server starting on :27439")
	log.Fatal(http.ListenAndServe(":27439", nil))
}
