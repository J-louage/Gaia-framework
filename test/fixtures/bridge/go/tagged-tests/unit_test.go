package tagged

import "testing"

func TestUnit(t *testing.T) {
	if 1 != 1 {
		t.Fatalf("broken")
	}
}
