// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package clientservice

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestGetSshHosts_readsSshConfig(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := "Host mybox\n  HostName 10.0.0.5\n  User deploy\n  Port 2222\n"
	if err := os.WriteFile(cfgPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	if len(hosts) != 1 {
		t.Fatalf("expected 1 host, got %d (%+v)", len(hosts), hosts)
	}
	h := hosts[0]
	if h.Pattern != "mybox" || h.Hostname != "10.0.0.5" || h.User != "deploy" || h.Port != "2222" {
		t.Fatalf("unexpected host: %+v", h)
	}
}

func TestGetSshHosts_missingConfigReturnsEmpty(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	if len(hosts) != 0 {
		t.Fatalf("expected no hosts, got %d", len(hosts))
	}
}

func TestGetSshHosts_blankUserAndNormalizedPort22(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := "Host plain\n  HostName plain.example.com\n  Port 22\n"
	if err := os.WriteFile(cfgPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	if len(hosts) != 1 {
		t.Fatalf("expected 1 host, got %d (%+v)", len(hosts), hosts)
	}
	h := hosts[0]
	if h.Pattern != "plain" || h.Hostname != "plain.example.com" || h.User != "" || h.Port != "" {
		t.Fatalf("unexpected host: %+v", h)
	}
}

func TestGetSshHosts_skipsWildcardsAndDedupesPatterns(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := `# lab hosts
Host *.example.com
  User nobody

Host alpha beta alpha
  HostName alpha.internal
  User ops

Host gamma
`
	if err := os.WriteFile(cfgPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	if len(hosts) != 3 {
		t.Fatalf("expected 3 hosts, got %d (%+v)", len(hosts), hosts)
	}
	want := []SshConfigHost{
		{Pattern: "alpha", Hostname: "alpha.internal", User: "ops", Port: ""},
		{Pattern: "beta", Hostname: "alpha.internal", User: "ops", Port: ""},
		{Pattern: "gamma", Hostname: "gamma", User: "", Port: ""},
	}
	for i, h := range hosts {
		if h != want[i] {
			t.Fatalf("host[%d]: got %+v want %+v", i, h, want[i])
		}
	}
}

func TestGetSshHosts_preservesDeclarationOrder(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := `Host zebra
Host apple
Host mango
`
	if err := os.WriteFile(cfgPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	got := make([]string, len(hosts))
	for i, h := range hosts {
		got[i] = h.Pattern
	}
	want := []string{"zebra", "apple", "mango"}
	if len(got) != len(want) {
		t.Fatalf("expected %d hosts, got %d (%v)", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order[%d]: got %q want %q (full %v)", i, got[i], want[i], got)
		}
	}
}
