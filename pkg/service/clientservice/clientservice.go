// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package clientservice

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wavetermdev/waveterm/pkg/remote"
	"github.com/wavetermdev/waveterm/pkg/remote/conncontroller"
	"github.com/wavetermdev/waveterm/pkg/waveobj"
	"github.com/wavetermdev/waveterm/pkg/wconfig"
	"github.com/wavetermdev/waveterm/pkg/wcore"
	"github.com/wavetermdev/waveterm/pkg/wshrpc"
	"github.com/wavetermdev/waveterm/pkg/wslconn"
	"github.com/wavetermdev/waveterm/pkg/wstore"
)

type ClientService struct{}

const DefaultTimeout = 2 * time.Second

func (cs *ClientService) GetClientData() (*waveobj.Client, error) {
	log.Println("GetClientData")
	ctx, cancelFn := context.WithTimeout(context.Background(), DefaultTimeout)
	defer cancelFn()
	return wcore.GetClientData(ctx)
}

func (cs *ClientService) GetTab(tabId string) (*waveobj.Tab, error) {
	ctx, cancelFn := context.WithTimeout(context.Background(), DefaultTimeout)
	defer cancelFn()
	tab, err := wstore.DBGet[*waveobj.Tab](ctx, tabId)
	if err != nil {
		return nil, fmt.Errorf("error getting tab: %w", err)
	}
	return tab, nil
}

func (cs *ClientService) GetAllConnStatus(ctx context.Context) ([]wshrpc.ConnStatus, error) {
	sshStatuses := conncontroller.GetAllConnStatus()
	wslStatuses := wslconn.GetAllConnStatus()
	return append(sshStatuses, wslStatuses...), nil
}

// moves the window to the front of the windowId stack
func (cs *ClientService) FocusWindow(ctx context.Context, windowId string) error {
	return wcore.FocusWindow(ctx, windowId)
}

func (cs *ClientService) AgreeTos(ctx context.Context) (waveobj.UpdatesRtnType, error) {
	ctx = waveobj.ContextWithUpdates(ctx)
	clientData, err := wstore.DBGetSingleton[*waveobj.Client](ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting client data: %w", err)
	}
	timestamp := time.Now().UnixMilli()
	clientData.TosAgreed = timestamp
	err = wstore.DBUpdate(ctx, clientData)
	if err != nil {
		return nil, fmt.Errorf("error updating client data: %w", err)
	}
	wcore.BootstrapStarterLayout(ctx)
	return waveobj.ContextGetUpdatesRtn(ctx), nil
}

func (cs *ClientService) TelemetryUpdate(ctx context.Context, telemetryEnabled bool) error {
	meta := waveobj.MetaMapType{
		wconfig.ConfigKey_TelemetryEnabled: telemetryEnabled,
	}
	err := wconfig.SetBaseConfigValue(meta)
	if err != nil {
		return fmt.Errorf("error setting telemetry value: %w", err)
	}
	return nil
}

// SshConfigHost represents a host entry from ~/.ssh/config
type SshConfigHost struct {
	Pattern  string `json:"pattern"`
	Hostname string `json:"hostname"`
	User     string `json:"user"`
	Port     string `json:"port"`
}

// GetSshHosts reads ~/.ssh/config and returns all non-wildcard host entries
// with their resolved HostName, User, and Port values.
func (cs *ClientService) GetSshHosts(ctx context.Context) ([]SshConfigHost, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("cannot determine home directory: %w", err)
	}
	configPath := filepath.Join(homeDir, ".ssh", "config")
	f, err := os.Open(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []SshConfigHost{}, nil
		}
		return nil, fmt.Errorf("cannot open ssh config: %w", err)
	}
	defer f.Close()

	// Collect all non-wildcard Host patterns in declaration order.
	var patterns []string
	seen := make(map[string]bool)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		if !strings.EqualFold(parts[0], "Host") {
			continue
		}
		// A Host line may list multiple patterns; take all non-wildcard ones.
		for _, p := range parts[1:] {
			if strings.ContainsAny(p, "*?!") {
				continue
			}
			if seen[p] {
				continue
			}
			seen[p] = true
			patterns = append(patterns, p)
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading ssh config: %w", err)
	}

	settings := remote.WaveSshConfigUserSettings()
	hosts := make([]SshConfigHost, 0, len(patterns))
	for _, pattern := range patterns {
		hostname, _ := settings.GetStrict(pattern, "HostName")
		if hostname == "" {
			hostname = pattern
		}
		user, _ := settings.GetStrict(pattern, "User")
		port, _ := settings.GetStrict(pattern, "Port")
		if port == "22" {
			port = ""
		}
		hosts = append(hosts, SshConfigHost{
			Pattern:  pattern,
			Hostname: hostname,
			User:     user,
			Port:     port,
		})
	}
	return hosts, nil
}
