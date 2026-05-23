// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wshrpc

import (
	"reflect"
	"testing"
)

func TestGenerateWshCommandDecl_NoArgs(t *testing.T) {
	rtype := reflect.TypeOf((*testRpcInterfaceForDecls)(nil)).Elem()
	method, ok := rtype.MethodByName("NoArgCommand")
	if !ok {
		t.Fatalf("NoArgCommand method not found")
	}
	decl := generateWshCommandDecl(method)
	if decl.Command != "noarg" {
		t.Fatalf("expected command noarg, got %q", decl.Command)
	}
	if decl.CommandType != RpcType_Call {
		t.Fatalf("expected call type, got %q", decl.CommandType)
	}
	if len(decl.CommandDataTypes) != 0 {
		t.Fatalf("expected 0 command data types, got %d", len(decl.CommandDataTypes))
	}
	if decl.DefaultResponseDataType != nil {
		t.Fatalf("expected nil response type for error-only return")
	}
}

func TestGenerateWshCommandDecl_OneArg(t *testing.T) {
	rtype := reflect.TypeOf((*testRpcInterfaceForDecls)(nil)).Elem()
	method, ok := rtype.MethodByName("OneArgCommand")
	if !ok {
		t.Fatalf("OneArgCommand method not found")
	}
	decl := generateWshCommandDecl(method)
	if decl.Command != "onearg" {
		t.Fatalf("expected command onearg, got %q", decl.Command)
	}
	if len(decl.CommandDataTypes) != 1 || decl.CommandDataTypes[0].Kind() != reflect.String {
		t.Fatalf("unexpected command data types: %#v", decl.CommandDataTypes)
	}
}

func TestGenerateWshCommandDeclMap_containsKnownCommands(t *testing.T) {
	declMap := GenerateWshCommandDeclMap()
	for _, cmd := range []string{"getmeta", "setmeta", "eventpublish", "testmultiarg"} {
		if declMap[cmd] == nil {
			t.Fatalf("expected %q command declaration", cmd)
		}
	}
}

func TestGenerateWshCommandDeclMap_streamCommandType(t *testing.T) {
	decl := GenerateWshCommandDeclMap()["streamtest"]
	if decl == nil {
		t.Fatalf("expected streamtest command declaration")
	}
	if decl.CommandType != RpcType_ResponseStream {
		t.Fatalf("expected response stream type, got %q", decl.CommandType)
	}
	if decl.DefaultResponseDataType == nil {
		t.Fatalf("expected non-nil stream response type")
	}
}

func TestMakeMethodMapForImpl_matchesDeclMap(t *testing.T) {
	type impl struct{}
	declMap := GenerateWshCommandDeclMap()
	methodMap := MakeMethodMapForImpl(&impl{}, declMap)
	if len(methodMap) != 0 {
		t.Fatalf("empty impl should produce empty method map, got %d entries", len(methodMap))
	}
}
