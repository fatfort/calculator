package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Response struct {
	Result interface{} `json:"result"`
	Error  string     `json:"error,omitempty"`
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

func gcd(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

func lcm(a, b int) int {
	return (a * b) / gcd(a, b)
}

func isPrime(n int) bool {
	if n < 2 {
		return false
	}
	for i := 2; i*i <= n; i++ {
		if n%i == 0 {
			return false
		}
	}
	return true
}

func handleGCD(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var numbers struct {
		A int `json:"a"`
		B int `json:"b"`
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
		A int `json:"a"`
		B int `json:"b"`
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
		N int `json:"n"`
	}
	if err := json.NewDecoder(r.Body).Decode(&number); err != nil {
		json.NewEncoder(w).Encode(Response{Error: "Invalid input"})
		return
	}

	result := isPrime(number.N)
	json.NewEncoder(w).Encode(Response{Result: result})
}

func main() {
	http.HandleFunc("/gcd", handleGCD)
	http.HandleFunc("/lcm", handleLCM)
	http.HandleFunc("/prime", handlePrimalityCheck)
	http.HandleFunc("/", handleOptions)

	fmt.Println("Server starting on :27439")
	log.Fatal(http.ListenAndServe(":27439", nil))
}