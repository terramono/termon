// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package clientservice

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestGetSshHosts_andSSHConnect_liveVM(t *testing.T) {
	if os.Getenv("CI") == "" && os.Getenv("TERMON_SSH_LIVE_TEST") == "" {
		if err := exec.Command("pgrep", "sshd").Run(); err != nil {
			t.Skip("sshd not running; set TERMON_SSH_LIVE_TEST=1 to force")
		}
	}

	home := t.TempDir()
	sshDir := filepath.Join(home, ".ssh")
	if err := os.MkdirAll(sshDir, 0o700); err != nil {
		t.Fatal(err)
	}

	keyPath := filepath.Join(sshDir, "termon_test_key")
	if out, err := exec.Command("ssh-keygen", "-t", "ed25519", "-f", keyPath, "-N", "", "-q").CombinedOutput(); err != nil {
		t.Fatalf("ssh-keygen: %v (%s)", err, out)
	}

	userHome, err := os.UserHomeDir()
	if err != nil {
		t.Fatal(err)
	}
	realAuthKeys := filepath.Join(userHome, ".ssh", "authorized_keys")
	pubKey, err := os.ReadFile(keyPath + ".pub")
	if err != nil {
		t.Fatal(err)
	}
	pubKeyLine := strings.TrimSpace(string(pubKey)) + " termon-test\n"
	if err := os.MkdirAll(filepath.Dir(realAuthKeys), 0o700); err != nil {
		t.Fatal(err)
	}
	existing, _ := os.ReadFile(realAuthKeys)
	if !strings.Contains(string(existing), strings.TrimSpace(string(pubKey))) {
		f, err := os.OpenFile(realAuthKeys, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := f.WriteString(pubKeyLine); err != nil {
			f.Close()
			t.Fatal(err)
		}
		f.Close()
		t.Cleanup(func() {
			content, readErr := os.ReadFile(realAuthKeys)
			if readErr != nil {
				return
			}
			lines := strings.Split(string(content), "\n")
			filtered := make([]string, 0, len(lines))
			for _, line := range lines {
				if strings.Contains(line, "termon-test") {
					continue
				}
				filtered = append(filtered, line)
			}
			_ = os.WriteFile(realAuthKeys, []byte(strings.TrimSpace(strings.Join(filtered, "\n"))+"\n"), 0o600)
		})
	}

	user := os.Getenv("USER")
	if user == "" {
		user = "ubuntu"
	}

	cfg := fmt.Sprintf(`Host termon-test-vm
  HostName 127.0.0.1
  User %s
  Port 22
  IdentityFile %s
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null

Host acme-web
  HostName 127.0.0.1
  User %s
  Port 22
  IdentityFile %s
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
`, user, keyPath, user, keyPath)
	cfgPath := filepath.Join(sshDir, "config")
	if err := os.WriteFile(cfgPath, []byte(cfg), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("HOME", home)

	var cs ClientService
	hosts, err := cs.GetSshHosts(context.Background())
	if err != nil {
		t.Fatalf("GetSshHosts: %v", err)
	}
	if len(hosts) != 2 {
		t.Fatalf("expected 2 hosts, got %d (%+v)", len(hosts), hosts)
	}

	found := false
	for _, h := range hosts {
		if h.Pattern == "termon-test-vm" {
			found = true
			if h.Hostname != "127.0.0.1" {
				t.Fatalf("unexpected hostname: %+v", h)
			}
			if h.User != user {
				t.Fatalf("unexpected user: %+v", h)
			}
		}
	}
	if !found {
		t.Fatalf("termon-test-vm not in hosts: %+v", hosts)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	for _, hostAlias := range []string{"termon-test-vm", "acme-web"} {
		cmd := exec.CommandContext(ctx, "ssh", "-F", cfgPath, hostAlias, "echo", "termon-ok")
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("ssh %s: %v (%s)", hostAlias, err, out)
		}
		lines := strings.Split(strings.TrimSpace(string(out)), "\n")
		lastLine := strings.TrimSpace(lines[len(lines)-1])
		if lastLine != "termon-ok" {
			t.Fatalf("ssh %s unexpected output: %q", hostAlias, out)
		}
	}
}
