//go:build e2e

package tagged

import "testing"

func TestE2E(t *testing.T) {
	if 1 != 1 {
		t.Fatalf("broken")
	}
}
