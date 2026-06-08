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

type mapConvRow struct {
	Name string `json:"name"`
}

func (m *mapConvRow) ToMap() map[string]interface{} {
	return map[string]interface{}{"name": m.Name}
}

func (m *mapConvRow) FromMap(data map[string]interface{}) bool {
	name, ok := data["name"].(string)
	if !ok {
		return false
	}
	m.Name = name
	return true
}

type simpleKeyRow struct {
	ID   string
	Name string
}

func (s simpleKeyRow) GetSimpleKey() string { return s.ID }

type simpleIntKeyRow struct {
	ID   int64
	Name string
}

func (s simpleIntKeyRow) GetSimpleKey() int64 { return s.ID }

type richDBRow struct {
	Name    string
	Tags    []string
	Config  map[string]string
	Payload []byte
	Nested  nestedDBRow
	Skip    string `dbmap:"-"`
}

type nestedDBRow struct {
	Mode string `json:"mode"`
}

func (richDBRow) UseDBMap() {}

func withTestDB(t *testing.T, fn func(db *sqlx.DB)) {
	t.Helper()
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	fn(db)
}

func TestFromMapAndGetMapGen(t *testing.T) {
	t.Parallel()

	if got := FromMap[*mapConvRow](nil); got != nil {
		t.Fatal("FromMap empty expected nil")
	}
	if got := FromMap[*mapConvRow](map[string]any{"name": 123}); got != nil {
		t.Fatal("FromMap bad type expected nil")
	}
	got := FromMap[*mapConvRow](map[string]any{"name": "hello"})
	if got == nil || got.Name != "hello" {
		t.Fatalf("FromMap = %+v", got)
	}

	withTestDB(t, func(db *sqlx.DB) {
		err := txwrap.WithTx(context.Background(), db, func(tx *txwrap.TxWrap) error {
			tx.Exec(`CREATE TABLE mapconv (name TEXT)`)
			tx.Exec(`INSERT INTO mapconv (name) VALUES (?)`, "fromdb")
			row := GetMapGen[*mapConvRow](tx, `SELECT name FROM mapconv`)
			if row == nil || row.Name != "fromdb" {
				t.Fatalf("GetMapGen = %+v", row)
			}
			return nil
		})
		if err != nil {
			t.Fatalf("WithTx: %v", err)
		}
	})
}

func TestGetMappableAndSelectMappable(t *testing.T) {
	t.Parallel()

	withTestDB(t, func(db *sqlx.DB) {
		err := txwrap.WithTx(context.Background(), db, func(tx *txwrap.TxWrap) error {
			tx.Exec(`CREATE TABLE rows (name TEXT, count INTEGER, active INTEGER)`)
			tx.Exec(`INSERT INTO rows (name, count, active) VALUES (?, ?, ?)`, "a", 1, 1)
			tx.Exec(`INSERT INTO rows (name, count, active) VALUES (?, ?, ?)`, "b", 2, 0)

			row := GetMappable[*testDBRow](tx, `SELECT name, count, active FROM rows WHERE name = ?`, "a")
			if row == nil || row.Name != "a" || row.Count != 1 || !row.Active {
				t.Fatalf("GetMappable = %+v", row)
			}
			if got := GetMappable[*testDBRow](tx, `SELECT name, count, active FROM rows WHERE name = ?`, "missing"); got != nil {
				t.Fatalf("GetMappable missing expected nil, got %+v", got)
			}

			rows := SelectMappable[*testDBRow](tx, `SELECT name, count, active FROM rows ORDER BY name`)
			if len(rows) != 2 || rows[0].Name != "a" {
				t.Fatalf("SelectMappable = %+v", rows)
			}
			return nil
		})
		if err != nil {
			t.Fatalf("WithTx: %v", err)
		}
	})
}

func TestSelectMapsGenAndSelectSimpleMap(t *testing.T) {
	t.Parallel()

	withTestDB(t, func(db *sqlx.DB) {
		err := txwrap.WithTx(context.Background(), db, func(tx *txwrap.TxWrap) error {
			tx.Exec(`CREATE TABLE mapconv (name TEXT)`)
			tx.Exec(`INSERT INTO mapconv (name) VALUES (?)`, "one")
			tx.Exec(`INSERT INTO mapconv (name) VALUES (?)`, "two")

			rows := SelectMapsGen[*mapConvRow](tx, `SELECT name FROM mapconv ORDER BY name`)
			if len(rows) != 2 || rows[0].Name != "one" {
				t.Fatalf("SelectMapsGen = %+v", rows)
			}

			tx.Exec(`CREATE TABLE simple (key TEXT, val TEXT)`)
			tx.Exec(`INSERT INTO simple (key, val) VALUES (?, ?)`, "k1", "v1")
			m := SelectSimpleMap[string](tx, `SELECT key, val FROM simple`)
			if m["k1"] != "v1" {
				t.Fatalf("SelectSimpleMap = %#v", m)
			}
			if got := SelectSimpleMap[string](tx, `SELECT key, val FROM simple WHERE key = ?`, "missing"); got != nil {
				t.Fatalf("SelectSimpleMap empty expected nil, got %#v", got)
			}
			return nil
		})
		if err != nil {
			t.Fatalf("WithTx: %v", err)
		}
	})
}

func TestMakeGenMaps(t *testing.T) {
	t.Parallel()

	strMap := MakeGenMap([]simpleKeyRow{{ID: "a", Name: "alpha"}, {ID: "b", Name: "beta"}})
	if strMap["a"].Name != "alpha" {
		t.Fatalf("MakeGenMap = %#v", strMap)
	}
	intMap := MakeGenMapInt64([]simpleIntKeyRow{{ID: 1, Name: "one"}})
	if intMap[1].Name != "one" {
		t.Fatalf("MakeGenMapInt64 = %#v", intMap)
	}
}

func TestToDBMapAndFromDBMapRich(t *testing.T) {
	t.Parallel()

	row := richDBRow{
		Name:    "alpha",
		Tags:    []string{"a", "b"},
		Config:  map[string]string{"mode": "test"},
		Payload: []byte("data"),
		Nested:  nestedDBRow{Mode: "nested"},
		Skip:    "hidden",
	}

	m := ToDBMap(&row, false)
	if _, ok := m["skip"]; ok {
		t.Fatal("skip should be omitted")
	}
	if m["name"] != "alpha" {
		t.Fatalf("name = %#v", m["name"])
	}

	mBytes := ToDBMap(&row, true)
	if mBytes["tags"] == nil || mBytes["config"] == nil {
		t.Fatalf("useBytes map = %#v", mBytes)
	}

	var out richDBRow
	FromDBMap(&out, map[string]interface{}{
		"name":    "beta",
		"count":   int64(3),
		"active":  true,
		"tags":    []byte(`["x"]`),
		"config":  []byte(`{"mode":"on"}`),
		"payload": []byte("blob"),
		"nested":  []byte(`{"mode":"inner"}`),
	})
	if out.Name != "beta" || out.Tags[0] != "x" || out.Config["mode"] != "on" || string(out.Payload) != "blob" {
		t.Fatalf("FromDBMap rich = %+v", out)
	}
}

type badMappable int

func (badMappable) UseDBMap() {}

func TestToDBMapAndFromDBMapPanics(t *testing.T) {
	t.Parallel()

	defer func() {
		if recover() == nil {
			t.Fatal("ToDBMap non-struct expected panic")
		}
	}()
	ToDBMap(badMappable(1), false)
}

func TestFromDBMapPanics(t *testing.T) {
	t.Parallel()

	defer func() {
		if recover() == nil {
			t.Fatal("FromDBMap nil expected panic")
		}
	}()
	FromDBMap(nil, map[string]interface{}{"name": "x"})
}

type badDBRow struct {
	Val float64
}

func (badDBRow) UseDBMap() {}

func TestFromDBMapInvalidFieldPanics(t *testing.T) {
	t.Parallel()

	defer func() {
		if recover() == nil {
			t.Fatal("FromDBMap invalid field expected panic")
		}
	}()
	var row badDBRow
	FromDBMap(&row, map[string]interface{}{"val": 1.5})
}
