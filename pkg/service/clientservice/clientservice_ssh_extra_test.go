// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package clientservice

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestGetSshHosts_resolvesHostnameUserPortFromBlocks(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := `Host shared
  HostName shared.example.com
  User alice

Host shared
  Port 2222
`
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
	if h.Pattern != "shared" || h.Hostname != "shared.example.com" || h.User != "alice" || h.Port != "2222" {
		t.Fatalf("unexpected host: %+v", h)
	}
}

func TestGetSshHosts_defaultsHostnameToPattern(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := `Host alias-only
  User deploy
`
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
	if hosts[0].Pattern != "alias-only" || hosts[0].Hostname != "alias-only" || hosts[0].User != "deploy" {
		t.Fatalf("unexpected host: %+v", hosts[0])
	}
}

func TestGetSshHosts_multiplePatternsOnOneLine(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := `Host one two three
  HostName cluster.internal
  User root
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
	wantPatterns := []string{"one", "two", "three"}
	for i, pattern := range wantPatterns {
		if hosts[i].Pattern != pattern {
			t.Fatalf("host[%d].Pattern = %q, want %q", i, hosts[i].Pattern, pattern)
		}
		if hosts[i].Hostname != "cluster.internal" || hosts[i].User != "root" {
			t.Fatalf("host[%d] not resolved: %+v", i, hosts[i])
		}
	}
}

func TestGetSshHosts_skipsQuestionMarkPatterns(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if err := os.MkdirAll(filepath.Join(home, ".ssh"), 0o700); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(home, ".ssh", "config")
	content := `Host host?.example.com
  User wildcard

Host concrete
`
	if err := os.WriteFile(cfgPath, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	if len(hosts) != 1 || hosts[0].Pattern != "concrete" {
		t.Fatalf("expected only concrete host, got %+v", hosts)
	}
}
