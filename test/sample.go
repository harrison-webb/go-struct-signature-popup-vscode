package main


// Address represents a physical location
type Address struct {
	Street  string // Street name and number
	City    string // City name
	ZipCode string // Postal code
	Country string // Country name
}

// Config holds application configuration
type Config struct {
	DatabaseURL string `json:"database_url"` // Connection string
	Port        int    `json:"port"`         // Server port
	Debug       bool   `json:"debug"`        // Enable debug mode
}

// Person represents a user in the system
type Person struct {
	Name    string  // User's display name
	Age     int     // Age in years
	Email   string  // Contact email address
	Address Address // Home address
}

func main() {

	d := Person{"Billy bob joe", }








	// Test signature help by typing here:
	// Try: Person{
	// Try: Address{
	// Try: Config{

	p := Person{
		Name: "John",
		Age:  30,
	}

	a := Address{
		Street: "123 Main St",
		City:   "Boston",
	}

	c := &Config{
		DatabaseURL: "postgres://localhost",
		Port:        8080,
	}

	_ = p
	_ = a
	_ = c


}
