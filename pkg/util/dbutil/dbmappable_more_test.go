// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package dbutil

import (
	"context"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/jmoiron/sqlx"
	"github.com/sawka/txwrap"
)

type ptrNestedRow struct {
	Nested *nestedDBRow
}

func (ptrNestedRow) UseDBMap() {}

func TestToDBMapPointerStruct(t *testing.T) {
	t.Parallel()

	row := ptrNestedRow{Nested: &nestedDBRow{Mode: "on"}}
	m := ToDBMap(&row, false)
	if m["nested"] == nil {
		t.Fatalf("ToDBMap pointer struct = %#v", m)
	}
}

func TestSelectMappableSkipsEmptyMaps(t *testing.T) {
	t.Parallel()

	withTestDB(t, func(db *sqlx.DB) {
		err := txwrap.WithTx(context.Background(), db, func(tx *txwrap.TxWrap) error {
			tx.Exec(`CREATE TABLE rows (name TEXT, count INTEGER, active INTEGER)`)
			tx.Exec(`INSERT INTO rows (name, count, active) VALUES (?, ?, ?)`, "only", 1, 1)
			rows := SelectMappable[*testDBRow](tx, `SELECT name, count, active FROM rows`)
			if len(rows) != 1 {
				t.Fatalf("SelectMappable = %+v", rows)
			}
			return nil
		})
		if err != nil {
			t.Fatalf("WithTx: %v", err)
		}
	})
}

func TestQuickSetJsonMissingKey(t *testing.T) {
	t.Parallel()

	var cfg struct {
		Mode string `json:"mode"`
	}
	QuickSetJson(&cfg, map[string]any{}, "missing")
	QuickSetJsonArr(&[]string{}, map[string]any{}, "missing")
}
