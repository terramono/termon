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
