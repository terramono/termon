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

func TestQuickSettersMissingAndBadTypes(t *testing.T) {
	var s string
	QuickSetStr(&s, map[string]any{}, "missing")
	if s != "" {
		t.Fatalf("QuickSetStr missing = %q", s)
	}
	QuickSetStr(&s, map[string]any{"name": true}, "name")
	if s != "" {
		t.Fatalf("QuickSetStr bad type = %q", s)
	}

	var i int
	QuickSetInt(&i, map[string]any{}, "missing")
	QuickSetInt(&i, map[string]any{"n": "bad"}, "n")

	var i64 int64
	QuickSetInt64(&i64, map[string]any{"n": "bad"}, "n")

	var ni *int64
	QuickSetNullableInt64(&ni, map[string]any{"n": "bad"}, "n")

	var b bool
	QuickSetBool(&b, map[string]any{"n": "bad"}, "n")

	var barr []byte
	QuickSetBytes(&barr, map[string]any{"n": 1}, "n")
}

func TestGetByteArrEmptyUsesDefault(t *testing.T) {
	b, ok := getByteArr(map[string]any{"blob": []byte{}}, "blob", "default")
	if !ok || string(b) != "default" {
		t.Fatalf("getByteArr empty = %q, %v", b, ok)
	}
}

func TestQuickValueJsonMarshalError(t *testing.T) {
	if _, err := QuickValueJson(map[string]any{"bad": make(chan int)}); err == nil {
		t.Fatal("QuickValueJson marshal error expected")
	}
}

func TestParseJsonArrError(t *testing.T) {
	if got := ParseJsonArr[string]("not-json"); got != nil {
		t.Fatalf("ParseJsonArr error = %#v", got)
	}
}

func TestSelectMappableSkipsEmptyRow(t *testing.T) {
	orig := dbSelectMaps
	defer func() { dbSelectMaps = orig }()
	dbSelectMaps = func(tx *txwrap.TxWrap, query string, args ...interface{}) []map[string]interface{} {
		return []map[string]interface{}{{}, {"name": "ok", "id": int64(1)}}
	}
	withTestDB(t, func(db *sqlx.DB) {
		_ = txwrap.WithTx(context.Background(), db, func(tx *txwrap.TxWrap) error {
			rows := SelectMappable[*testDBRow](tx, `SELECT 1`)
			if len(rows) != 1 {
				t.Fatalf("SelectMappable rows = %d", len(rows))
			}
			return nil
		})
	})
}

type stringMapper string

func (stringMapper) UseDBMap() {}

func TestToDBMapNonStructPanic(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("ToDBMap non-struct expected panic")
		}
	}()
	ToDBMap(stringMapper("bad"), false)
}

func TestFromDBMapNilPanic(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("FromDBMap nil expected panic")
		}
	}()
	FromDBMap(nil, map[string]any{})
}

func TestFromDBMapBadFieldPanic(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("FromDBMap bad field expected panic")
		}
	}()
	row := &badFieldRow{}
	FromDBMap(row, map[string]any{"ch": 1})
}

type badFieldRow struct {
	Ch chan int `dbmap:"ch"`
}

func (badFieldRow) UseDBMap() {}
