// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wstore

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	dbfs "github.com/wavetermdev/waveterm/db"
	"github.com/wavetermdev/waveterm/pkg/util/migrateutil"
	"github.com/wavetermdev/waveterm/pkg/waveobj"
)

func setupTestWStoreDB(t *testing.T) {
	t.Helper()
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}
	db.DB.SetMaxOpenConns(1)
	if err := migrateutil.Migrate("wstore", db.DB, dbfs.WStoreMigrationFS, "migrations-wstore"); err != nil {
		t.Fatalf("migrate wstore: %v", err)
	}
	globalDB = db
}

func teardownTestWStoreDB(t *testing.T) {
	t.Helper()
	if globalDB != nil {
		globalDB.Close()
		globalDB = nil
	}
}

func TestWorkspaceMigrationCRUDRoundTrip(t *testing.T) {
	setupTestWStoreDB(t)
	defer teardownTestWStoreDB(t)

	ctx := context.Background()
	wsId := uuid.NewString()
	ws := &waveobj.Workspace{
		OID:    wsId,
		Name:   "integration-test",
		TabIds: []string{},
		Meta:   waveobj.MetaMapType{},
	}

	if err := DBInsert(ctx, ws); err != nil {
		t.Fatalf("DBInsert workspace: %v", err)
	}

	got, err := DBGet[*waveobj.Workspace](ctx, wsId)
	if err != nil {
		t.Fatalf("DBGet workspace: %v", err)
	}
	if got.Name != "integration-test" {
		t.Fatalf("got name %q, want integration-test", got.Name)
	}

	got.Name = "updated-name"
	if err := DBUpdate(ctx, got); err != nil {
		t.Fatalf("DBUpdate workspace: %v", err)
	}

	got, err = DBGet[*waveobj.Workspace](ctx, wsId)
	if err != nil {
		t.Fatalf("DBGet workspace after update: %v", err)
	}
	if got.Name != "updated-name" {
		t.Fatalf("got name %q after update, want updated-name", got.Name)
	}
	if got.Version != 2 {
		t.Fatalf("got version %d after update, want 2", got.Version)
	}

	count, err := DBGetCount[*waveobj.Workspace](ctx)
	if err != nil {
		t.Fatalf("DBGetCount workspace: %v", err)
	}
	if count != 1 {
		t.Fatalf("workspace count %d, want 1", count)
	}

	if err := DBDelete(ctx, waveobj.OType_Workspace, wsId); err != nil {
		t.Fatalf("DBDelete workspace: %v", err)
	}

	count, err = DBGetCount[*waveobj.Workspace](ctx)
	if err != nil {
		t.Fatalf("DBGetCount workspace after delete: %v", err)
	}
	if count != 0 {
		t.Fatalf("workspace count after delete %d, want 0", count)
	}
}
