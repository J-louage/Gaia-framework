//go:build integration

package tagged

import "testing"

func TestIntegration(t *testing.T) {
	if 1 != 1 {
		t.Fatalf("broken")
	}
}
