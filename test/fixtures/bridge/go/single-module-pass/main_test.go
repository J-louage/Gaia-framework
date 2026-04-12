package main

import "testing"

func TestAdd(t *testing.T) {
	if 1+1 != 2 {
		t.Fatalf("math broken")
	}
}

func TestSub(t *testing.T) {
	if 3-1 != 2 {
		t.Fatalf("math broken")
	}
}
