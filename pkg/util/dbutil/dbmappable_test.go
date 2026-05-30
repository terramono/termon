// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package dbutil

import "testing"

type testDBRow struct {
	Name   string
	Count  int64
	Active bool
	Skip   string `dbmap:"-"`
}

func (testDBRow) UseDBMap() {}

func TestToDBMapAndFromDBMap(t *testing.T) {
	t.Parallel()

	row := testDBRow{Name: "alpha", Count: 9, Active: true, Skip: "hidden"}
	m := ToDBMap(&row, false)
	if m["name"] != "alpha" || m["count"] != int64(9) || m["active"] != true {
		t.Fatalf("ToDBMap = %#v", m)
	}
	if _, ok := m["skip"]; ok {
		t.Fatal("skip field should be omitted")
	}

	var out testDBRow
	FromDBMap(&out, map[string]interface{}{
		"name":   "beta",
		"count":  int64(3),
		"active": true,
	})
	if out.Name != "beta" || out.Count != 3 || !out.Active {
		t.Fatalf("FromDBMap = %+v", out)
	}
}
